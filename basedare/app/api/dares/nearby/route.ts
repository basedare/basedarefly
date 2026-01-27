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

/**
 * GET /api/dares/nearby?lat=14.5995&lng=120.9842&radius=10
 *
 * Returns nearby dares within the specified radius.
 * Privacy-first: Never returns raw lat/lng, only distance.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

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

    console.log(
      `[NEARBY] Query: lat=${lat}, lng=${lng}, radius=${radius}km, geohash=${queryGeohash}`
    );

    // Query dares with matching geohashes that are nearby dares
    const dares = await prisma.dare.findMany({
      where: {
        isNearbyDare: true,
        status: { in: ['PENDING', 'AWAITING_CLAIM'] },
        geohash: { in: neighborHashes },
        latitude: { not: null },
        longitude: { not: null },
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
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2, // Fetch more to filter by actual distance
    });

    // Filter by actual distance and calculate display values
    const nearbyDares = dares
      .map((dare) => {
        if (dare.latitude === null || dare.longitude === null) return null;

        const distanceKm = calculateDistance(lat, lng, dare.latitude, dare.longitude);

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
          locationLabel: dare.locationLabel,
          distanceKm: Math.round(distanceKm * 100) / 100,
          distanceDisplay: formatDistance(distanceKm),
          expiresAt: dare.expiresAt?.toISOString() || null,
          createdAt: dare.createdAt.toISOString(),
          streamerHandle: dare.streamerHandle,
          isOpenBounty: !dare.streamerHandle,
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
