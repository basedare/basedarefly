import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  encodeGeohash,
  getNeighborGeohashes,
  calculateDistance,
  formatDistance,
  isValidCoordinates,
} from '@/lib/geo';

// Query schema
const NearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.5).max(50).default(10),
  limit: z.coerce.number().min(1).max(50).default(20),
});

function getBoundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / Math.max(0.1, 111 * Math.cos((lat * Math.PI) / 180));

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

/**
 * GET /api/dares/nearby?lat=14.5995&lng=120.9842&radius=10
 *
 * Returns nearby dares within the specified radius.
 * Privacy-first: Never returns raw lat/lng, only distance.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();

    // Parse and validate query params
    const queryResult = NearbyQuerySchema.safeParse({
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      radius: searchParams.get('radius'),
      limit: searchParams.get('limit'),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: queryResult.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { lat, lng, radius, limit } = queryResult.data;

    // Validate coordinates
    if (!isValidCoordinates(lat, lng)) {
      return NextResponse.json(
        { success: false, error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Get geohash for the query location
    const queryGeohash = encodeGeohash(lat, lng, 6);
    const neighborHashes = getNeighborGeohashes(queryGeohash);
    const bounds = getBoundingBox(lat, lng, radius);

    console.log(
      `[NEARBY] Query: lat=${lat}, lng=${lng}, radius=${radius}km, geohash=${queryGeohash}`
    );

    // Query both explicit nearby dares and venue-anchored active dares so
    // the discovery layer doesn't miss missions that are attached to a place.
    const dares = await prisma.dare.findMany({
      where: {
        NOT: {
          OR: [
            { status: 'EXPIRED' },
            { expiresAt: { lt: now } },
          ],
        },
        OR: [
          {
            isNearbyDare: true,
            geohash: { in: neighborHashes },
            latitude: { not: null },
            longitude: { not: null },
          },
          {
            venueId: { not: null },
            venue: {
              status: 'ACTIVE',
              latitude: {
                gte: bounds.minLat,
                lte: bounds.maxLat,
              },
              longitude: {
                gte: bounds.minLng,
                lte: bounds.maxLng,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        shortId: true,
        title: true,
        bounty: true,
        status: true,
        locationLabel: true,
        latitude: true,
        longitude: true,
        discoveryRadiusKm: true,
        expiresAt: true,
        createdAt: true,
        streamerHandle: true,
        venue: {
          select: {
            slug: true,
            name: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 4, // Fetch more to filter by actual distance
    });

    // Filter by actual distance and calculate display values
    const nearbyDares = dares
      .map((dare) => {
        const sourceLatitude = dare.latitude ?? dare.venue?.latitude ?? null;
        const sourceLongitude = dare.longitude ?? dare.venue?.longitude ?? null;
        if (sourceLatitude === null || sourceLongitude === null) return null;

        const distanceKm = calculateDistance(lat, lng, sourceLatitude, sourceLongitude);

        // Check if within query radius AND within the dare's discovery radius
        const dareRadius = dare.discoveryRadiusKm ?? 5;
        if (distanceKm > radius || distanceKm > dareRadius) {
          return null;
        }

        return {
          id: dare.id,
          shortId: dare.shortId,
          title: dare.title,
          bounty: dare.bounty,
          status: dare.status,
          locationLabel: dare.locationLabel ?? dare.venue?.name ?? null,
          distanceKm: Math.round(distanceKm * 100) / 100,
          distanceDisplay: formatDistance(distanceKm),
          expiresAt: dare.expiresAt?.toISOString() || null,
          createdAt: dare.createdAt.toISOString(),
          streamerHandle: dare.streamerHandle,
          isOpenBounty: !dare.streamerHandle,
          venueSlug: dare.venue?.slug ?? null,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    console.log(
      `[NEARBY] Found ${nearbyDares.length} dares within ${radius}km of (${lat}, ${lng})`
    );

    return NextResponse.json({
      success: true,
      data: {
        dares: nearbyDares,
        count: nearbyDares.length,
        queryLocation: {
          // Only return approximate location (geohash precision)
          geohash: queryGeohash,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[NEARBY] Query failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch nearby dares' },
      { status: 500 }
    );
  }
}
