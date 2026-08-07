import 'server-only';

import {
  ACTION_SPORTS_COMMUNITY_SPARKS,
  COMMUNITY_SPARK_DISCLAIMER,
  getActionSportsCommunitySpark,
  getActionSportsCommunitySparkStreamId,
  type ActionSportsCommunitySparkKey,
} from '@/lib/action-sports-community-sparks';
import { createDatabaseBackedBounty } from '@/lib/bounty-db-create';
import { ensureCuratedVenueRecords } from '@/lib/curated-venues';
import { prisma } from '@/lib/prisma';

const COMMUNITY_SPARK_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

async function expireUntouchedLegacyVersions(
  key: ActionSportsCommunitySparkKey,
  currentStreamId: string,
) {
  const streamPrefix = `community-spark:${key.toLowerCase()}:`;
  const now = new Date();
  const result = await prisma.dare.updateMany({
    where: {
      streamId: { startsWith: streamPrefix, not: currentStreamId },
      status: 'PENDING',
      bounty: 0,
      claimedBy: null,
      claimRequestWallet: null,
      targetWalletAddress: null,
      videoUrl: null,
      expiresAt: { gt: now },
    },
    data: {
      status: 'EXPIRED',
      expiresAt: now,
    },
  });
  return result.count;
}

export async function seedActionSportsCommunitySpark(
  key: ActionSportsCommunitySparkKey,
  actor: string
) {
  const preset = getActionSportsCommunitySpark(key);
  await ensureCuratedVenueRecords([preset.venueSlug]);
  const venue = await prisma.venue.findUnique({
    where: { slug: preset.venueSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      latitude: true,
      longitude: true,
      geohash: true,
      address: true,
    },
  });
  if (!venue) throw new Error(`Venue ${preset.venueSlug} is unavailable.`);

  const streamId = getActionSportsCommunitySparkStreamId(preset.key);
  const existing = await prisma.dare.findFirst({
    where: {
      streamId,
      status: 'PENDING',
      bounty: 0,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, shortId: true, title: true, expiresAt: true, venueId: true },
  });
  if (existing) {
    const supersededCount = await expireUntouchedLegacyVersions(preset.key, streamId);
    return { created: false as const, dare: existing, preset, supersededCount };
  }

  const title = preset.title;
  const result = await createDatabaseBackedBounty({
    title,
    missionMode: 'IRL',
    missionTag: 'community',
    amount: 0,
    streamerTag: null,
    streamId,
    tagVerified: true,
    stakerAddress: actor,
    venueId: venue.id,
    isNearbyDare: true,
    latitude: venue.latitude,
    longitude: venue.longitude,
    geohash: venue.geohash,
    locationLabel: venue.address || venue.name,
    discoveryRadiusKm: preset.discoveryRadiusKm,
    isSimulated: true,
    expiresAt: new Date(Date.now() + COMMUNITY_SPARK_LIFETIME_MS),
    outcomeContract: {
      family: 'EXPERIENCE_EXECUTION',
      buyerQuestion: `${preset.instructions} ${COMMUNITY_SPARK_DISCLAIMER}`,
      maximumObservationAgeHours: 24,
    },
  });
  const supersededCount = await expireUntouchedLegacyVersions(preset.key, streamId);
  return { created: true as const, dare: result.dare, preset, supersededCount };
}

export async function listActionSportsCommunitySparks() {
  const rows = await prisma.dare.findMany({
    where: {
      streamId: { startsWith: 'community-spark:' },
      status: 'PENDING',
      bounty: 0,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      shortId: true,
      title: true,
      streamId: true,
      expiresAt: true,
      venue: { select: { slug: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return {
    presets: ACTION_SPORTS_COMMUNITY_SPARKS,
    active: rows,
    disclaimer: COMMUNITY_SPARK_DISCLAIMER,
  };
}
