import { prisma } from '@/lib/prisma';

/**
 * The Board — flyer projection (scout/IRL operating layer).
 *
 * A "flyer" is NOT a stored/authored object — it's existing real activity
 * (open missions + venues with recent verified presence) PROJECTED into a board
 * card. "Generated, not authored." A completed one renders as a receipt.
 *
 * Board rule (founder): something belongs only if BaseDare can drive attendance,
 * verify presence, or produce a receipt. So we project from paid missions and
 * venues with confirmed check-ins — never arbitrary events.
 */

export type FlyerKind = 'MISSION' | 'VENUE';
export type FlyerStamp = 'LIVE_TONIGHT' | 'CHECK_IN_OPEN' | 'VERIFIED' | 'REWARD' | 'HOSTED';
export type FlyerTone = 'gold' | 'cyan' | 'emerald' | 'violet';

export type Flyer = {
  id: string;
  kind: FlyerKind;
  title: string;
  venueName: string | null;
  venueSlug: string | null;
  city: string | null;
  detail: string;
  stamps: FlyerStamp[];
  metricValue: string | null;
  metricLabel: string | null;
  href: string;
  tone: FlyerTone;
  sortWeight: number;
};

const TERMINAL_DARE_STATUSES = ['EXPIRED', 'FAILED', 'VERIFIED', 'PAID', 'COMPLETED', 'REFUNDED', 'DECLINED'];
const TONES: FlyerTone[] = ['gold', 'cyan', 'emerald', 'violet'];

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function formatAmount(value: number | null | undefined): string {
  if (!value || !Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString('en-US');
}

export async function getBoardFlyers(opts: { city?: string; limit?: number } = {}): Promise<Flyer[]> {
  const limit = opts.limit ?? 36;
  const cityFilter = opts.city?.trim()
    ? { city: { equals: opts.city.trim(), mode: 'insensitive' as const } }
    : {};
  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const startToday = startOfTodayUtc();

  try {
    // Venues with recent confirmed presence (the "active" set).
    const recent = await prisma.venueCheckIn.groupBy({
      by: ['venueId'],
      where: { status: 'CONFIRMED', scannedAt: { gte: since14d } },
      _count: { _all: true },
      orderBy: { _count: { venueId: 'desc' } },
      take: 40,
    });
    const venueIds = recent.map((row) => row.venueId);
    const recent14 = new Map(venueIds.map((id, i) => [id, recent[i]._count._all]));

    const [todayGroups, proofGroups, venues, dares] = await Promise.all([
      venueIds.length
        ? prisma.venueCheckIn.groupBy({ by: ['venueId'], where: { venueId: { in: venueIds }, status: 'CONFIRMED', scannedAt: { gte: startToday } }, _count: { _all: true } })
        : Promise.resolve([] as Array<{ venueId: string; _count: { _all: number } }>),
      venueIds.length
        ? prisma.placeTag.groupBy({ by: ['venueId'], where: { venueId: { in: venueIds }, status: 'APPROVED' }, _count: { _all: true } })
        : Promise.resolve([] as Array<{ venueId: string; _count: { _all: number } }>),
      venueIds.length
        ? prisma.venue.findMany({ where: { id: { in: venueIds }, ...cityFilter }, select: { id: true, slug: true, name: true, city: true } })
        : Promise.resolve([] as Array<{ id: string; slug: string; name: string; city: string | null }>),
      prisma.dare.findMany({
        where: { venueId: { not: null }, status: { notIn: TERMINAL_DARE_STATUSES }, bounty: { gt: 0 }, ...(opts.city?.trim() ? { venue: { is: cityFilter } } : {}) },
        select: { id: true, shortId: true, title: true, bounty: true, streamerHandle: true, venue: { select: { slug: true, name: true, city: true } } },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
    ]);

    const todayMap = new Map(todayGroups.map((g) => [g.venueId, g._count._all]));
    const proofMap = new Map(proofGroups.map((g) => [g.venueId, g._count._all]));

    const venueFlyers: Flyer[] = venues.map((venue, index) => {
      const today = todayMap.get(venue.id) ?? 0;
      const proofs = proofMap.get(venue.id) ?? 0;
      const recentCount = recent14.get(venue.id) ?? 0;
      const stamps: FlyerStamp[] = ['CHECK_IN_OPEN'];
      if (today > 0) stamps.unshift('LIVE_TONIGHT');
      if (proofs > 0) stamps.push('VERIFIED');
      return {
        id: `venue:${venue.id}`,
        kind: 'VENUE',
        title: venue.name,
        venueName: venue.name,
        venueSlug: venue.slug,
        city: venue.city,
        detail: today > 0 ? 'Check in now to count tonight.' : 'Presence rail live — check in to prove you were here.',
        stamps,
        metricValue: today > 0 ? String(today) : proofs > 0 ? String(proofs) : String(recentCount),
        metricLabel: today > 0 ? 'here today' : proofs > 0 ? 'verified proofs' : 'recent check-ins',
        href: `/venues/${encodeURIComponent(venue.slug)}`,
        tone: TONES[index % TONES.length],
        sortWeight: today * 1000 + proofs * 50 + recentCount,
      };
    });

    const missionFlyers: Flyer[] = dares
      .filter((dare) => dare.venue)
      .map((dare) => {
        const targeted = Boolean(dare.streamerHandle && dare.streamerHandle.trim());
        const stamps: FlyerStamp[] = ['REWARD', 'CHECK_IN_OPEN'];
        if (targeted) stamps.push('HOSTED');
        return {
          id: `dare:${dare.id}`,
          kind: 'MISSION',
          title: dare.title,
          venueName: dare.venue?.name ?? null,
          venueSlug: dare.venue?.slug ?? null,
          city: dare.venue?.city ?? null,
          detail: targeted ? `Targeted mission · @${dare.streamerHandle?.replace(/^@/, '')}` : 'Open mission — claim it, prove it, get paid.',
          stamps,
          metricValue: formatAmount(dare.bounty),
          metricLabel: 'USDC bounty',
          href: dare.shortId ? `/dare/${encodeURIComponent(dare.shortId)}` : '/dares',
          tone: 'gold',
          sortWeight: 500 + Math.min(dare.bounty, 5000),
        };
      });

    return [...missionFlyers, ...venueFlyers]
      .sort((a, b) => b.sortWeight - a.sortWeight)
      .slice(0, limit);
  } catch (error) {
    console.error('[BOARD] getBoardFlyers failed:', error);
    return [];
  }
}
