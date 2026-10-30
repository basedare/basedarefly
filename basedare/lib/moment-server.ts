import "server-only";
import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { momentCreditAllowed, publicMomentAllowed } from "./adventure-evidence";
import { publicSocialPost } from "./social-post-url";
import { adventureTemplate, type AdventurePost } from "./adventure-sharing";

export const momentInclude = {
  venue: {
    select: {
      slug: true,
      name: true,
      latitude: true,
      longitude: true,
      status: true,
    },
  },
} satisfies Prisma.AdventureSubmissionInclude;
export type MomentRow = Prisma.AdventureSubmissionGetPayload<{
  include: typeof momentInclude;
}>;
export async function momentPosts(
  rows: MomentRow[],
  mine = false,
): Promise<AdventurePost[]> {
  const wallets = [
    ...new Set(rows.filter(momentCreditAllowed).map((row) => row.wallet)),
  ];
  const tags = wallets.length
    ? await prisma.streamerTag.findMany({
        where: {
          OR: wallets.map((wallet) => ({
            walletAddress: { equals: wallet, mode: "insensitive" as const },
          })),
          status: { in: ["ACTIVE", "VERIFIED"] },
          revokedAt: null,
        },
        select: { walletAddress: true, tag: true },
      })
    : [];
  return rows.flatMap((row) => {
    if (
      !adventureTemplate(row.activityId) ||
      (!mine && !publicMomentAllowed(row))
    )
      return [];
    const social = publicSocialPost(row.socialUrl);
    const privateMedia = Boolean(row.privateMediaCid);
    let legacyUrl: string | null = null;
    try {
      const parsed = new URL(row.mediaUrl ?? "");
      if (parsed.protocol === "https:" && !parsed.username && !parsed.password)
        legacyUrl = parsed.href;
    } catch {
      /* No invented placeholder URL. */
    }
    if (!privateMedia && !social && !legacyUrl) return [];
    const creatorTag = momentCreditAllowed(row)
      ? (tags.find(
          (tag) => tag.walletAddress.toLowerCase() === row.wallet.toLowerCase(),
        )?.tag ?? null)
      : null;
    return [
      {
        id: row.id,
        activityId: row.activityId,
        caption: row.caption,
        hashtag: row.hashtag,
        mediaUrl: privateMedia
          ? `/api/adventure-submissions/${encodeURIComponent(row.id)}/media`
          : legacyUrl,
        mediaType: row.mediaType,
        socialUrl: social?.url ?? null,
        socialPlatform: social?.platform ?? null,
        status: row.status,
        reviewReason: mine ? row.reviewReason : undefined,
        createdAt: row.createdAt.toISOString(),
        creatorTag,
        venue:
          row.venue?.status === "ACTIVE"
            ? {
                slug: row.venue.slug,
                name: row.venue.name,
                latitude: row.venue.latitude,
                longitude: row.venue.longitude,
              }
            : null,
        momentHref: "/moments/" + encodeURIComponent(row.id),
        featured: Boolean(row.featuredAt && row.spotlightConsent && creatorTag),
        parentMomentId: row.parentMomentId,
      },
    ];
  });
}
export async function getPublicMoment(id: string) {
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(id)) return null;
  const row = await prisma.adventureSubmission.findUnique({
    where: { id },
    include: momentInclude,
  });
  if (!row || !publicMomentAllowed(row)) return null;
  return (await momentPosts([row]))[0] ?? null;
}
