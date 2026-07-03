import { prisma } from '@/lib/prisma';

/**
 * Crossed paths — the unfakeable social predicate.
 *
 * Two wallets have "crossed paths" when both hold CONFIRMED venue check-ins at
 * the SAME venue within the same window. Built on VenueCheckIn (QR + GPS), so
 * the relationship graph can't be botted from a couch: you met where you
 * verifiably were. Used to gate stranger DMs; later reused for crew
 * suggestions (docs/crew-presence-design.md) and crossed-paths discovery.
 */

/** Two check-ins at the same venue within this window count as one night. */
export const CROSSED_PATH_WINDOW_MS = 6 * 60 * 60 * 1000;

/** How far back a crossing still counts as a live social connection. */
export const CROSSED_PATH_LOOKBACK_DAYS = 90;

export type CrossedPath = {
  venueId: string;
  /** Most recent moment the two overlapped (the later of the two check-ins). */
  at: Date;
};

type CheckInRow = { venueId: string; scannedAt: Date };

function findOverlap(a: CheckInRow[], b: CheckInRow[]): CrossedPath | null {
  const byVenue = new Map<string, Date[]>();
  for (const row of a) {
    const list = byVenue.get(row.venueId) ?? [];
    list.push(row.scannedAt);
    byVenue.set(row.venueId, list);
  }

  let latest: CrossedPath | null = null;
  for (const row of b) {
    const times = byVenue.get(row.venueId);
    if (!times) continue;
    for (const time of times) {
      if (Math.abs(time.getTime() - row.scannedAt.getTime()) > CROSSED_PATH_WINDOW_MS) continue;
      const at = new Date(Math.max(time.getTime(), row.scannedAt.getTime()));
      if (!latest || at > latest.at) latest = { venueId: row.venueId, at };
    }
  }
  return latest;
}

/**
 * Returns the most recent verified crossing between two wallets within the
 * lookback window, or null when they have never verifiably shared a venue.
 */
export async function haveCrossedPaths(walletA: string, walletB: string): Promise<CrossedPath | null> {
  const since = new Date(Date.now() - CROSSED_PATH_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const select = { venueId: true, scannedAt: true } as const;
  const baseWhere = { status: 'CONFIRMED', scannedAt: { gte: since } } as const;

  const [checkInsA, checkInsB] = await Promise.all([
    prisma.venueCheckIn.findMany({
      where: { ...baseWhere, walletAddress: { equals: walletA, mode: 'insensitive' } },
      select,
      orderBy: { scannedAt: 'desc' },
      take: 400,
    }),
    prisma.venueCheckIn.findMany({
      where: { ...baseWhere, walletAddress: { equals: walletB, mode: 'insensitive' } },
      select,
      orderBy: { scannedAt: 'desc' },
      take: 400,
    }),
  ]);

  if (checkInsA.length === 0 || checkInsB.length === 0) return null;
  return findOverlap(checkInsA, checkInsB);
}

export type CrossedPathPerson = {
  tag: string;
  pfpUrl: string | null;
  lastCrossedAt: string;
};

/**
 * People the viewer verifiably crossed paths with at one venue: overlapping
 * CONFIRMED check-ins within the window, surfaced ONLY when they hold a
 * claimed (non-revoked) Baretag — public handles, never bare wallets.
 */
export async function listCrossedPathsAtVenue(
  viewerWallet: string,
  venueId: string,
  limit = 12
): Promise<CrossedPathPerson[]> {
  const since = new Date(Date.now() - CROSSED_PATH_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const viewerCheckIns = await prisma.venueCheckIn.findMany({
    where: {
      venueId,
      status: 'CONFIRMED',
      scannedAt: { gte: since },
      walletAddress: { equals: viewerWallet, mode: 'insensitive' },
    },
    select: { scannedAt: true },
    orderBy: { scannedAt: 'desc' },
    take: 200,
  });
  if (viewerCheckIns.length === 0) return [];

  const others = await prisma.venueCheckIn.findMany({
    where: {
      venueId,
      status: 'CONFIRMED',
      scannedAt: { gte: since },
      NOT: { walletAddress: { equals: viewerWallet, mode: 'insensitive' } },
    },
    select: { walletAddress: true, scannedAt: true },
    orderBy: { scannedAt: 'desc' },
    take: 800,
  });
  if (others.length === 0) return [];

  const viewerTimes = viewerCheckIns.map((row) => row.scannedAt.getTime());
  const lastCrossedByWallet = new Map<string, number>();
  const storedCasingByWallet = new Map<string, string>();
  for (const row of others) {
    const timeMs = row.scannedAt.getTime();
    const overlaps = viewerTimes.some((viewerMs) => Math.abs(viewerMs - timeMs) <= CROSSED_PATH_WINDOW_MS);
    if (!overlaps) continue;
    const key = row.walletAddress.toLowerCase();
    storedCasingByWallet.set(key, row.walletAddress);
    const existing = lastCrossedByWallet.get(key);
    if (!existing || timeMs > existing) lastCrossedByWallet.set(key, timeMs);
  }
  if (lastCrossedByWallet.size === 0) return [];

  // Check-in and tag tables may disagree on wallet casing — query both forms.
  const walletVariants = [...lastCrossedByWallet.keys()].flatMap((lower) => {
    const stored = storedCasingByWallet.get(lower);
    return stored && stored !== lower ? [lower, stored] : [lower];
  });

  const tags = await prisma.streamerTag.findMany({
    where: { walletAddress: { in: walletVariants }, NOT: { status: 'REVOKED' } },
    select: { tag: true, pfpUrl: true, walletAddress: true },
  });

  const seenWallets = new Set<string>();
  const people: CrossedPathPerson[] = [];
  for (const tagRow of tags) {
    const key = tagRow.walletAddress.toLowerCase();
    if (seenWallets.has(key)) continue;
    const crossedMs = lastCrossedByWallet.get(key);
    if (!crossedMs) continue;
    seenWallets.add(key);
    people.push({ tag: tagRow.tag, pfpUrl: tagRow.pfpUrl, lastCrossedAt: new Date(crossedMs).toISOString() });
  }

  return people.sort((a, b) => (a.lastCrossedAt < b.lastCrossedAt ? 1 : -1)).slice(0, limit);
}
