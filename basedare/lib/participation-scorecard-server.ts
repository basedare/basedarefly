import "server-only";
import { prisma } from "./prisma";
import {
  participationScorecard,
  participationWindow,
  type ParticipationAction,
} from "./participation-scorecard";
import { publicLocalSignalItems, record, isStory } from "./community-stories";
import { momentInclude, momentPosts } from "./moment-server";

const LIMIT = 5000;
export async function loadParticipationScorecard(now = new Date()) {
  const window = participationWindow(now),
    range = { gte: new Date(window.previousStart), lt: new Date(window.end) };
  try {
    const [stories, moments, visits] = await Promise.all([
      prisma.founderEvent.findMany({
        where: {
          eventType: "LOCAL_SIGNAL",
          subjectType: "community_story",
          status: "APPROVED",
          createdAt: range,
          NOT: { id: { startsWith: "seed-" } },
        },
        take: LIMIT + 1,
      }),
      prisma.adventureSubmission.findMany({
        where: {
          status: "APPROVED",
          createdAt: range,
          NOT: { id: { startsWith: "seed-" } },
        },
        include: momentInclude,
        take: LIMIT + 1,
      }),
      prisma.venueCheckIn.findMany({
        where: {
          scannedAt: range,
          status: "CONFIRMED",
          source: "VENUE_QR",
          proofLevel: "QR_AND_GPS",
          venueSessionId: { not: null },
          qrTokenHash: { not: null },
          geoDistanceMeters: { gte: 0 },
          NOT: { id: { startsWith: "seed-" } },
          venue: { status: "ACTIVE" },
        },
        select: { id: true, walletAddress: true, scannedAt: true },
        take: LIMIT + 1,
      }),
    ]);
    if ([stories, moments, visits].some((rows) => rows.length > LIMIT))
      return participationScorecard(null, now);
    // Reuse the public projections: revoked author, place, display permission and withdrawal
    // cannot leave a contribution counted after it becomes ineligible.
    const [publicStories, publicMoments] = await Promise.all([
      publicLocalSignalItems(stories),
      momentPosts(moments),
    ]);
    const storyIds = new Set(publicStories.map((s) => s.id)),
      momentIds = new Set(publicMoments.map((m) => m.id));
    const actions: ParticipationAction[] = [
      ...stories
        .filter((s) => isStory(s) && storyIds.has(s.id))
        .map((s) => ({
          account: String(record(s.metadataJson).authorWallet),
          sourceId: s.id,
          kind: "reviewed_story" as const,
          occurredAt: s.createdAt.toISOString(),
        })),
      ...moments
        .filter((m) => momentIds.has(m.id))
        .map((m) => ({
          account: m.wallet,
          sourceId: m.id,
          kind: "reviewed_moment" as const,
          occurredAt: m.createdAt.toISOString(),
        })),
      ...visits.map((v) => ({
        account: v.walletAddress,
        sourceId: v.id,
        kind: "confirmed_qr_visit" as const,
        occurredAt: v.scannedAt.toISOString(),
      })),
    ];
    return participationScorecard(actions, now);
  } catch {
    return participationScorecard(null, now);
  }
}
