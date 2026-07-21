import { prisma } from '@/lib/prisma';

/**
 * Historical scout ↔ venue attribution (parked scout-engine slice 3).
 *
 * Discovery is PERMANENT and set-once (credit for sourcing the venue). Active
 * starts as the same scout. Public binding is disabled and this record does not
 * create an automatic payment entitlement under docs/FINANCIAL_CANON.md.
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
    reason: 'Historical venue source recorded. This does not create automatic commission.',
  };
}

export type ScoutVenueSummary = {
  venueId: string;
  slug: string;
  name: string;
  city: string | null;
  isDiscovery: boolean;
  isActive: boolean;
};

/** Historical venues attributed to a scout. This is not a payment entitlement. */
export async function getScoutVenues(scoutId: string): Promise<ScoutVenueSummary[]> {
  const venues = await prisma.venue.findMany({
    where: { OR: [{ discoveryScoutId: scoutId }, { activeScoutId: scoutId }] },
    select: { id: true, slug: true, name: true, city: true, discoveryScoutId: true, activeScoutId: true },
  });
  return venues.map((venue) => {
    return {
      venueId: venue.id,
      slug: venue.slug,
      name: venue.name,
      city: venue.city,
      isDiscovery: venue.discoveryScoutId === scoutId,
      isActive: venue.activeScoutId === scoutId,
    };
  });
}
