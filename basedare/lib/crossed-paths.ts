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
