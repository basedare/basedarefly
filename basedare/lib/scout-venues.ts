import { prisma } from '@/lib/prisma';

/**
 * Scout ↔ venue attribution (scout-engine slice 3).
 *
 * Discovery is PERMANENT and set-once (credit for sourcing the venue). Active
 * starts as the same scout and is the only role reassigned later (monthly, by
 * performance). A different scout can never steal a venue that's already
 * discovered. The set-once claim is atomic (updateMany guarded on null).
 */

export type BindScoutResult = {
  bound: boolean;
  alreadyDiscovered: boolean;
  isYours: boolean;
  venueId: string;
  discoveryScoutId: string | null;
  activeScoutId: string | null;
  reason: string;
};

export async function bindScoutToVenue(input: {
  scoutWalletAddress: string;
  venueId: string;
}): Promise<BindScoutResult> {
  const wallet = input.scoutWalletAddress.trim().toLowerCase();

  const scout = await prisma.scout.findUnique({
    where: { walletAddress: wallet },
    select: { id: true },
  });
  if (!scout) {
    return {
      bound: false, alreadyDiscovered: false, isYours: false, venueId: input.venueId,
      discoveryScoutId: null, activeScoutId: null,
      reason: 'No scout profile for this wallet — register as a scout first.',
    };
  }

  const venue = await prisma.venue.findUnique({
    where: { id: input.venueId },
    select: { id: true, discoveryScoutId: true, activeScoutId: true },
  });
  if (!venue) {
    return {
      bound: false, alreadyDiscovered: false, isYours: false, venueId: input.venueId,
      discoveryScoutId: null, activeScoutId: null, reason: 'Venue not found.',
    };
  }

  // Atomic set-once: only claim if no one has discovered it yet.
  const claim = await prisma.venue.updateMany({
    where: { id: venue.id, discoveryScoutId: null },
    data: { discoveryScoutId: scout.id, activeScoutId: scout.id },
  });

  if (claim.count === 0) {
    // Already discovered (by someone, possibly this scout) — re-read the truth.
    const fresh = await prisma.venue.findUnique({
      where: { id: venue.id },
      select: { discoveryScoutId: true, activeScoutId: true },
    });
    const isYours = fresh?.discoveryScoutId === scout.id;
    return {
      bound: isYours,
      alreadyDiscovered: true,
      isYours,
      venueId: venue.id,
      discoveryScoutId: fresh?.discoveryScoutId ?? null,
      activeScoutId: fresh?.activeScoutId ?? null,
      reason: isYours ? 'You already discovered this venue.' : 'Another scout already discovered this venue.',
    };
  }

  return {
    bound: true,
    alreadyDiscovered: false,
    isYours: true,
    venueId: venue.id,
    discoveryScoutId: scout.id,
    activeScoutId: scout.id,
    reason: 'Venue signed up — discovery + active rake bound to you.',
  };
}

export type ScoutVenueSummary = {
  venueId: string;
  slug: string;
  name: string;
  city: string | null;
  isDiscovery: boolean;
  isActive: boolean;
  totalRake: number;
  vestedRake: number;
  pendingRake: number;
};

/** Venues a scout discovered and/or actively holds, with rake rolled up from the ledger. */
export async function getScoutVenues(scoutId: string): Promise<ScoutVenueSummary[]> {
  const venues = await prisma.venue.findMany({
    where: { OR: [{ discoveryScoutId: scoutId }, { activeScoutId: scoutId }] },
    select: { id: true, slug: true, name: true, city: true, discoveryScoutId: true, activeScoutId: true },
  });
  if (venues.length === 0) return [];

  const events = await prisma.scoutRakeEvent.findMany({
    where: { scoutId, venueId: { in: venues.map((v) => v.id) }, status: { not: 'CLAWED_BACK' } },
    select: { venueId: true, amount: true, status: true },
  });

  const byVenue = new Map<string, { total: number; vested: number; pending: number }>();
  for (const event of events) {
    if (!event.venueId) continue;
    const acc = byVenue.get(event.venueId) ?? { total: 0, vested: 0, pending: 0 };
    acc.total += event.amount;
    if (event.status === 'VESTED') acc.vested += event.amount;
    else acc.pending += event.amount;
    byVenue.set(event.venueId, acc);
  }

  return venues.map((venue) => {
    const rake = byVenue.get(venue.id) ?? { total: 0, vested: 0, pending: 0 };
    return {
      venueId: venue.id,
      slug: venue.slug,
      name: venue.name,
      city: venue.city,
      isDiscovery: venue.discoveryScoutId === scoutId,
      isActive: venue.activeScoutId === scoutId,
      totalRake: Math.round(rake.total * 100) / 100,
      vestedRake: Math.round(rake.vested * 100) / 100,
      pendingRake: Math.round(rake.pending * 100) / 100,
    };
  });
}
