import "server-only";

import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  assertVenueEventFeedCryptoConfigured,
  decryptVenueEventFeedToken,
} from "@/lib/venue-event-feed-crypto";
import {
  fingerprintVenueEventSignal,
  inferVenueEventDraft,
  isLikelyVenueEventPost,
  normalizeVenueEventSourceUrl,
  type VenueEventSocialPost,
} from "@/lib/venue-events";

const INSTAGRAM_GRAPH_ORIGIN = "https://graph.instagram.com";
const INSTAGRAM_GRAPH_VERSION = "v26.0";
const INSTAGRAM_MEDIA_FIELDS = "id,caption,permalink,timestamp,media_type";
const MAX_POSTS_PER_FEED = 25;
const MAX_FEEDS_PER_RUN = 20;
const FEED_SYNC_CONCURRENCY = 5;
const MAX_SOCIAL_POST_AGE_MS = 21 * 24 * 60 * 60 * 1000;

type InstagramMediaResponse = {
  data?: Array<{
    id?: unknown;
    caption?: unknown;
    permalink?: unknown;
    timestamp?: unknown;
    media_type?: unknown;
  }>;
  paging?: { cursors?: { after?: unknown } };
  error?: { message?: unknown; code?: unknown };
};

class InstagramFeedError extends Error {
  reauthRequired: boolean;

  constructor(message: string, reauthRequired: boolean) {
    super(message);
    this.name = "InstagramFeedError";
    this.reauthRequired = reauthRequired;
  }
}

function cleanInstagramPosts(body: InstagramMediaResponse) {
  return (body.data ?? []).flatMap<VenueEventSocialPost>((item) => {
    const externalId = typeof item.id === "string" ? item.id.trim() : "";
    const caption = typeof item.caption === "string" ? item.caption.trim() : "";
    const permalink =
      typeof item.permalink === "string"
        ? normalizeVenueEventSourceUrl(item.permalink)
        : null;
    const publishedAt =
      typeof item.timestamp === "string" ? item.timestamp.trim() : "";
    const publishedDate = new Date(publishedAt);
    if (
      !externalId ||
      !caption ||
      !permalink ||
      !Number.isFinite(publishedDate.getTime())
    ) {
      return [];
    }
    return [{ externalId, caption, permalink, publishedAt: publishedDate.toISOString() }];
  });
}

export async function fetchInstagramVenuePosts(
  externalAccountId: string,
  accessToken: string,
  fetcher: typeof fetch = fetch
) {
  const url = new URL(
    `/${INSTAGRAM_GRAPH_VERSION}/${encodeURIComponent(externalAccountId)}/media`,
    INSTAGRAM_GRAPH_ORIGIN
  );
  url.searchParams.set("fields", INSTAGRAM_MEDIA_FIELDS);
  url.searchParams.set("limit", String(MAX_POSTS_PER_FEED));
  const response = await fetcher(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const body = (await response.json().catch(() => null)) as InstagramMediaResponse | null;
  if (!response.ok || !body) {
    const detail =
      typeof body?.error?.message === "string"
        ? body.error.message.slice(0, 180)
        : `Instagram returned ${response.status}.`;
    throw new InstagramFeedError(detail, body?.error?.code === 190);
  }
  return {
    posts: cleanInstagramPosts(body),
    cursor:
      typeof body.paging?.cursors?.after === "string"
        ? body.paging.cursors.after.slice(0, 500)
        : null,
  };
}

export async function syncVenueEventFeed(feedId: string, now = new Date()) {
  const feed = await prisma.venueEventFeed.findUnique({
    where: { id: feedId },
    include: { venue: { select: { id: true, slug: true } } },
  });
  if (!feed || feed.status !== "ACTIVE") {
    return { checked: false, scanned: 0, queued: 0, duplicates: 0 };
  }
  if (feed.tokenExpiresAt && feed.tokenExpiresAt <= now) {
    await prisma.venueEventFeed.update({
      where: { id: feed.id },
      data: {
        status: "NEEDS_REAUTH",
        lastCheckedAt: now,
        lastError: "Instagram authorization expired. Reconnect this account.",
      },
    });
    return { checked: false, scanned: 0, queued: 0, duplicates: 0 };
  }

  try {
    const accessToken = decryptVenueEventFeedToken(feed.accessTokenCiphertext);
    const result = await fetchInstagramVenuePosts(feed.externalAccountId, accessToken);
    let queued = 0;
    let duplicates = 0;
    for (const post of result.posts) {
      if (new Date(post.publishedAt).getTime() < now.getTime() - MAX_SOCIAL_POST_AGE_MS) {
        continue;
      }
      if (!isLikelyVenueEventPost(post)) continue;
      const fingerprint = createHash("sha256")
        .update(
          fingerprintVenueEventSignal({
            sourceKind: "SOCIAL_POST",
            sourceUrl: post.permalink,
            venueSlug: feed.venue.slug,
            rawText: post.caption,
            externalId: `instagram:${post.externalId}`,
          })
        )
        .digest("hex");
      const draft = inferVenueEventDraft(post.caption);
      const created = await prisma.venueEventSignal.createMany({
        data: [
          {
            venueId: feed.venueId,
            sourceKind: "SOCIAL_POST",
            sourceUrl: post.permalink,
            sourceAccount: feed.accountHandle,
            sourcePublishedAt: new Date(post.publishedAt),
            rawText: post.caption,
            fingerprint,
            extractionJson: {
              ...draft,
              platform: "INSTAGRAM",
              externalId: post.externalId,
              feedId: feed.id,
              suggestedTrustLevel: "VENUE_POSTED",
            } satisfies Prisma.InputJsonValue,
            confidence: draft.confidence,
            submittedBy: "venue-feed:instagram",
          },
        ],
        skipDuplicates: true,
      });
      if (created.count) queued += 1;
      else duplicates += 1;
    }
    await prisma.venueEventFeed.update({
      where: { id: feed.id },
      data: {
        lastCursor: result.cursor,
        lastCheckedAt: now,
        lastSuccessfulAt: now,
        lastError: null,
        consecutiveFailures: 0,
      },
    });
    return { checked: true, scanned: result.posts.length, queued, duplicates };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "Feed sync failed.";
    const failures = feed.consecutiveFailures + 1;
    const reauthRequired =
      error instanceof InstagramFeedError && error.reauthRequired;
    await prisma.venueEventFeed.update({
      where: { id: feed.id },
      data: {
        lastCheckedAt: now,
        lastError: message,
        consecutiveFailures: failures,
        ...(reauthRequired ? { status: "NEEDS_REAUTH" } : {}),
      },
    });
    throw error;
  }
}

export async function syncVenueEventFeeds(options: { feedId?: string | null } = {}) {
  assertVenueEventFeedCryptoConfigured();
  const feeds = await prisma.venueEventFeed.findMany({
    where: {
      status: "ACTIVE",
      ...(options.feedId ? { id: options.feedId } : {}),
    },
    select: { id: true },
    orderBy: [
      { lastCheckedAt: { sort: "asc", nulls: "first" } },
      { createdAt: "asc" },
    ],
    take: options.feedId ? 1 : MAX_FEEDS_PER_RUN,
  });
  const summary = { feeds: feeds.length, checked: 0, scanned: 0, queued: 0, duplicates: 0, failed: 0 };
  for (let index = 0; index < feeds.length; index += FEED_SYNC_CONCURRENCY) {
    const batch = feeds.slice(index, index + FEED_SYNC_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (feed) => {
        try {
          return { feed, result: await syncVenueEventFeed(feed.id), error: null };
        } catch (error) {
          return { feed, result: null, error };
        }
      })
    );
    for (const { feed, result, error } of results) {
      if (error || !result) {
        summary.failed += 1;
        console.error("[ISLAND_PULSE_FEED] sync failed", {
          feedId: feed.id,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      if (result.checked) summary.checked += 1;
      summary.scanned += result.scanned;
      summary.queued += result.queued;
      summary.duplicates += result.duplicates;
    }
  }
  return summary;
}
