import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  authorizeAdminRequest,
  unauthorizedAdminResponse,
} from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { encryptVenueEventFeedToken } from "@/lib/venue-event-feed-crypto";
import { syncVenueEventFeeds } from "@/lib/venue-event-feeds";

const ConnectFeedSchema = z.object({
  venueSlug: z.string().trim().min(1).max(120),
  externalAccountId: z.string().trim().min(2).max(120),
  accountHandle: z.string().trim().max(80).optional().nullable(),
  accessToken: z.string().trim().min(20).max(4096),
  tokenExpiresAt: z.string().datetime().optional().nullable(),
});

const FeedActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sync"), feedId: z.string().min(1) }),
  z.object({ action: z.literal("pause"), feedId: z.string().min(1) }),
  z.object({ action: z.literal("resume"), feedId: z.string().min(1) }),
  z.object({ action: z.literal("disconnect"), feedId: z.string().min(1) }),
]);

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  const feeds = await prisma.venueEventFeed.findMany({
    select: {
      id: true,
      platform: true,
      externalAccountId: true,
      accountHandle: true,
      status: true,
      tokenExpiresAt: true,
      lastCheckedAt: true,
      lastSuccessfulAt: true,
      lastError: true,
      consecutiveFailures: true,
      createdAt: true,
      venue: { select: { slug: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ success: true, data: { feeds } });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  const parsed = ConnectFeedSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid feed." },
      { status: 400 }
    );
  }
  try {
    const venue = await prisma.venue.findUnique({
      where: { slug: parsed.data.venueSlug },
      select: { id: true },
    });
    if (!venue) {
      return NextResponse.json(
        { success: false, error: "Venue not found." },
        { status: 404 }
      );
    }
    const feed = await prisma.venueEventFeed.upsert({
      where: {
        platform_externalAccountId: {
          platform: "INSTAGRAM",
          externalAccountId: parsed.data.externalAccountId,
        },
      },
      create: {
        venueId: venue.id,
        platform: "INSTAGRAM",
        externalAccountId: parsed.data.externalAccountId,
        accountHandle: parsed.data.accountHandle || null,
        accessTokenCiphertext: encryptVenueEventFeedToken(parsed.data.accessToken),
        tokenExpiresAt: parsed.data.tokenExpiresAt
          ? new Date(parsed.data.tokenExpiresAt)
          : null,
        connectedBy: auth.walletAddress,
      },
      update: {
        venueId: venue.id,
        accountHandle: parsed.data.accountHandle || null,
        accessTokenCiphertext: encryptVenueEventFeedToken(parsed.data.accessToken),
        tokenExpiresAt: parsed.data.tokenExpiresAt
          ? new Date(parsed.data.tokenExpiresAt)
          : null,
        status: "ACTIVE",
        lastError: null,
        consecutiveFailures: 0,
        connectedBy: auth.walletAddress,
      },
      select: { id: true, status: true },
    });
    return NextResponse.json({ success: true, data: { feed } }, { status: 201 });
  } catch (error) {
    console.error("[ISLAND_PULSE_FEED] connect failed", error);
    return NextResponse.json(
      { success: false, error: "Could not connect this Instagram account." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  const parsed = FeedActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid action." },
      { status: 400 }
    );
  }
  if (parsed.data.action === "sync") {
    const result = await syncVenueEventFeeds({ feedId: parsed.data.feedId });
    if (!result.feeds) {
      return NextResponse.json(
        { success: false, error: "Active feed not found." },
        { status: 404 }
      );
    }
    if (result.failed > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Instagram sync failed. Check the feed status and authorization.",
          data: result,
        },
        { status: 502 }
      );
    }
    return NextResponse.json({ success: true, data: result });
  }
  if (parsed.data.action === "disconnect") {
    const result = await prisma.venueEventFeed.deleteMany({
      where: { id: parsed.data.feedId },
    });
    if (!result.count) {
      return NextResponse.json(
        { success: false, error: "Feed not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  }
  const nextStatus =
    parsed.data.action === "resume"
      ? "ACTIVE"
      : "PAUSED";
  const result = await prisma.venueEventFeed.updateMany({
    where: { id: parsed.data.feedId },
    data: {
      status: nextStatus,
      ...(nextStatus === "ACTIVE"
        ? { lastError: null, consecutiveFailures: 0 }
        : {}),
    },
  });
  if (!result.count) {
    return NextResponse.json(
      { success: false, error: "Feed not found." },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
