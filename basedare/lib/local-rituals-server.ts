import 'server-only';

import type { Prisma } from '@prisma/client';

import {
  formatLocalRitualTime,
  localRitualFreshness,
  nextLocalRitualOccurrence,
} from '@/lib/local-rituals';
import { prisma } from '@/lib/prisma';

function fundedRewardWhere(now: Date): Prisma.DareWhereInput {
  return {
    status: 'PENDING',
    bounty: { gt: 0 },
    isSimulated: false,
    onChainDareId: { not: null },
    claimedBy: null,
    targetWalletAddress: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

export async function getVenueRitualsBySlug(slug: string, now = new Date()) {
  const rows = await prisma.venueRitual.findMany({
    where: { venue: { slug }, status: { in: ['ACTIVE', 'PAUSED'] } },
    include: {
      venue: { select: { id: true, slug: true, name: true, latitude: true, longitude: true } },
    },
    orderBy: [{ weekday: 'asc' }, { startLocalMinutes: 'asc' }],
    take: 12,
  });
  const rewardIds = rows.flatMap((row) => (row.rewardDareId ? [row.rewardDareId] : []));
  const rewards = rewardIds.length
    ? await prisma.dare.findMany({
        where: { ...fundedRewardWhere(now), id: { in: rewardIds } },
        select: { id: true, shortId: true, bounty: true, title: true, expiresAt: true },
      })
    : [];
  const rewardMap = new Map(rewards.map((reward) => [reward.id, reward]));

  return rows.map((row) => {
    const freshness = localRitualFreshness(row);
    const occurrence = nextLocalRitualOccurrence({
      weekday: row.weekday,
      startLocalMinutes: row.startLocalMinutes,
      endLocalMinutes: row.endLocalMinutes,
      timeZone: row.timezone,
      now,
    });
    const reward = row.rewardDareId ? rewardMap.get(row.rewardDareId) ?? null : null;
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      venue: row.venue,
      scheduleLabel: formatLocalRitualTime(row),
      weekday: row.weekday,
      startLocalMinutes: row.startLocalMinutes,
      endLocalMinutes: row.endLocalMinutes,
      timezone: row.timezone,
      nextStartsAt: occurrence.startsAt.toISOString(),
      nextEndsAt: occurrence.endsAt?.toISOString() ?? null,
      freshness,
      source: {
        kind: row.sourceKind,
        label: row.sourceLabel,
        url: row.sourceUrl,
        lastConfirmedAt: row.sourceLastConfirmedAt.toISOString(),
        expiresAt: row.freshnessExpiresAt.toISOString(),
      },
      permissionStatus: row.permissionStatus,
      offerLabel: row.offerLabel,
      reward: reward
        ? {
            dareId: reward.id,
            shortId: reward.shortId,
            title: reward.title,
            grossRewardUsd: reward.bounty,
            expiresAt: reward.expiresAt?.toISOString() ?? null,
          }
        : null,
      disclaimer:
        freshness === 'NEEDS_CONFIRMATION'
          ? 'This recurring schedule is stale and needs confirmation before you travel.'
          : row.permissionStatus === 'PUBLICLY_REPORTED'
            ? 'Publicly reported ritual. Conditions can change; confirm with the venue.'
            : null,
    };
  });
}
