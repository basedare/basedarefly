import { prisma } from '@/lib/prisma';

/**
 * The Board — flyer projection (scout/IRL operating layer).
 *
 * A "flyer" is NOT a stored/authored object — it's existing real activity
 * PROJECTED into a board card. "Generated, not authored." Flyer before proof,
 * receipt after proof.
 *
 * Board rule (founder/Codex): something belongs ONLY if BaseDare can drive
 * attendance, verify presence, or produce a receipt. No arbitrary events, no
 * "submit your event" — that's how it stays proof-backed and not Facebook Events.
 *
 * Honest sections (Codex): Tonight = live today · Rewards = open paid missions ·
 * Receipts = completed proof · Places lit up = recent verified venue activity.
 */

export type FlyerKind = 'MISSION' | 'VENUE' | 'RECEIPT';
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

export type BoardSections = {
  tonight: Flyer[];
  rewards: Flyer[];
  receipts: Flyer[];
  placesLitUp: Flyer[];
};

const OPEN_DARE_EXCLUDE = ['EXPIRED', 'FAILED', 'VERIFIED', 'PAID', 'COMPLETED', 'REFUNDED', 'DECLINED'];
const COMPLETED_DARE_STATUSES = ['VERIFIED', 'PAID', 'COMPLETED'];
const TONES: FlyerTone[] = ['gold', 'cyan', 'emerald', 'violet'];

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function formatAmount(value: number | null | undefined): string {
  if (!value || !Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString('en-US');
}

const EMPTY: BoardSections = { tonight: [], rewards: [], receipts: [], placesLitUp: [] };

export async function getBoardSections(opts: { city?: string } = {}): Promise<BoardSections> {
  const cityFilter = opts.city?.trim()
    ? { city: { equals: opts.city.trim(), mode: 'insensitive' as const } }
    : {};
  const relCityFilter = opts.city?.trim() ? { venue: { is: cityFilter } } : {};
  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const startToday = startOfTodayUtc();

  try {
    const recent = await prisma.venueCheckIn.groupBy({
      by: ['venueId'],
      where: { status: 'CONFIRMED', scannedAt: { gte: since14d } },
      _count: { _all: true },
      orderBy: { _count: { venueId: 'desc' } },
      take: 40,
    });
    const venueIds = recent.map((row) => row.venueId);
    const recent14 = new Map(venueIds.map((id, i) => [id, recent[i]._count._all]));

    const [todayGroups, proofGroups, venues, openDares, completedDares] = await Promise.all([
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
        where: { venueId: { not: null }, status: { notIn: OPEN_DARE_EXCLUDE }, bounty: { gt: 0 }, ...relCityFilter },
        select: { id: true, shortId: true, title: true, bounty: true, streamerHandle: true, venue: { select: { slug: true, name: true, city: true } } },
        orderBy: { createdAt: 'desc' },
        take: 24,
      }),
      prisma.dare.findMany({
        where: { venueId: { not: null }, status: { in: COMPLETED_DARE_STATUSES }, ...relCityFilter },
        select: { id: true, shortId: true, title: true, bounty: true, venue: { select: { slug: true, name: true, city: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 12,
      }),
    ]);

    const todayMap = new Map(todayGroups.map((g) => [g.venueId, g._count._all]));
    const proofMap = new Map(proofGroups.map((g) => [g.venueId, g._count._all]));

    const tonight: Flyer[] = [];
    const placesLitUp: Flyer[] = [];
    venues.forEach((venue, index) => {
      const today = todayMap.get(venue.id) ?? 0;
      const proofs = proofMap.get(venue.id) ?? 0;
      const recentCount = recent14.get(venue.id) ?? 0;
      const live = today > 0;
      const stamps: FlyerStamp[] = live ? ['LIVE_TONIGHT', 'CHECK_IN_OPEN'] : ['CHECK_IN_OPEN'];
      if (proofs > 0) stamps.push('VERIFIED');
      const flyer: Flyer = {
        id: `venue:${venue.id}`,
        kind: 'VENUE',
        title: venue.name,
        venueName: venue.name,
        venueSlug: venue.slug,
        city: venue.city,
        detail: live ? 'Live now — check in to count tonight.' : 'Recently lit up — presence rail is live here.',
        stamps,
        metricValue: live ? String(today) : proofs > 0 ? String(proofs) : String(recentCount),
        metricLabel: live ? 'here today' : proofs > 0 ? 'verified proofs' : 'recent check-ins',
        href: `/venues/${encodeURIComponent(venue.slug)}`,
        tone: TONES[index % TONES.length],
        sortWeight: today * 1000 + proofs * 50 + recentCount,
      };
      (live ? tonight : placesLitUp).push(flyer);
    });

    const rewards: Flyer[] = openDares
      .filter((dare) => dare.venue)
      .map((dare) => ({
        id: `dare:${dare.id}`,
        kind: 'MISSION' as const,
        title: dare.title,
        venueName: dare.venue?.name ?? null,
        venueSlug: dare.venue?.slug ?? null,
        city: dare.venue?.city ?? null,
        detail: dare.streamerHandle?.trim()
          ? `Targeted · @${dare.streamerHandle.replace(/^@/, '')}`
          : 'Open mission — claim it, prove it, get paid.',
        stamps: ['REWARD', 'CHECK_IN_OPEN'],
        metricValue: formatAmount(dare.bounty),
        metricLabel: 'USDC bounty',
        href: dare.shortId ? `/dare/${encodeURIComponent(dare.shortId)}` : '/dares',
        tone: 'gold',
        sortWeight: 500 + Math.min(dare.bounty, 5000),
      }));

    const receipts: Flyer[] = completedDares
      .filter((dare) => dare.venue)
      .map((dare, index) => ({
        id: `receipt:${dare.id}`,
        kind: 'RECEIPT' as const,
        title: dare.title,
        venueName: dare.venue?.name ?? null,
        venueSlug: dare.venue?.slug ?? null,
        city: dare.venue?.city ?? null,
        detail: 'Proof verified — receipt is live.',
        stamps: ['VERIFIED'],
        metricValue: formatAmount(dare.bounty),
        metricLabel: 'USDC paid out',
        href: dare.shortId ? `/dare/${encodeURIComponent(dare.shortId)}` : '/dares',
        tone: 'emerald',
        sortWeight: completedDares.length - index,
      }));

    return {
      tonight: tonight.sort((a, b) => b.sortWeight - a.sortWeight).slice(0, 12),
      rewards: rewards.sort((a, b) => b.sortWeight - a.sortWeight).slice(0, 12),
      receipts: receipts.slice(0, 8),
      placesLitUp: placesLitUp.sort((a, b) => b.sortWeight - a.sortWeight).slice(0, 12),
    };
  } catch (error) {
    console.error('[BOARD] getBoardSections failed:', error);
    return EMPTY;
  }
}
