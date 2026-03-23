import { prisma } from '@/lib/prisma';
import { encodeGeohash, isValidCoordinates } from '@/lib/geo';

export type BountyCreationContext = 'MAP' | 'CREATE';

export type ResolveBountyPlaceInput = {
  venueId?: string | null;
  creationContext?: BountyCreationContext | null;
  isNearbyDare?: boolean;
  latitude?: number;
  longitude?: number;
  locationLabel?: string | null;
  discoveryRadiusKm?: number;
};

export type ResolvedBountyPlaceContext = {
  venueId: string | null;
  isNearbyDare: boolean;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  discoveryRadiusKm: number | null;
  geohash: string | null;
};

export class BountyPlaceResolutionError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'BountyPlaceResolutionError';
    this.code = code;
  }
}

export async function resolveCanonicalBountyPlaceContext(
  input: ResolveBountyPlaceInput
): Promise<ResolvedBountyPlaceContext> {
  const creationContext = input.creationContext ?? 'CREATE';
  const requestedVenueId = input.venueId?.trim() || null;

  if (requestedVenueId) {
    const venue = await prisma.venue.findUnique({
      where: { id: requestedVenueId },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        country: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!venue) {
      throw new BountyPlaceResolutionError(
        'Invalid venueId. This challenge must be attached to a valid place.',
        'INVALID_VENUE'
      );
    }

    const canonicalLabel =
      venue.name ||
      [venue.address, venue.city, venue.country].filter(Boolean).join(', ') ||
      input.locationLabel?.trim() ||
      null;

    return {
      venueId: venue.id,
      isNearbyDare: true,
      latitude: venue.latitude,
      longitude: venue.longitude,
      locationLabel: canonicalLabel,
      discoveryRadiusKm: input.discoveryRadiusKm ?? 0.5,
      geohash: encodeGeohash(venue.latitude, venue.longitude, 6),
    };
  }

  if (creationContext === 'MAP') {
    throw new BountyPlaceResolutionError(
      'This challenge must be attached to a valid place. Retry or reselect the location.',
      'VENUE_REQUIRED'
    );
  }

  const isNearbyDare = Boolean(input.isNearbyDare);
  const latitude = input.latitude ?? null;
  const longitude = input.longitude ?? null;

  if (isNearbyDare && (latitude === null || longitude === null)) {
    throw new BountyPlaceResolutionError(
      'Coordinates are required for nearby dares',
      'MISSING_COORDINATES'
    );
  }

  if (isNearbyDare && latitude !== null && longitude !== null && !isValidCoordinates(latitude, longitude)) {
    throw new BountyPlaceResolutionError(
      'Invalid coordinates provided',
      'INVALID_COORDINATES'
    );
  }

  return {
    venueId: null,
    isNearbyDare,
    latitude,
    longitude,
    locationLabel: isNearbyDare ? input.locationLabel?.trim() || null : null,
    discoveryRadiusKm: isNearbyDare ? input.discoveryRadiusKm ?? 5 : null,
    geohash:
      isNearbyDare && latitude !== null && longitude !== null
        ? encodeGeohash(latitude, longitude, 6)
        : null,
  };
}
