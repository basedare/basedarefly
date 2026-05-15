import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getNearbyVenues } from '@/lib/venues';
import { encodeGeohash } from '@/lib/geo';

const NearbyVenueQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(100).max(25000).default(3000),
  limit: z.coerce.number().min(1).max(30).default(12),
});
const NEARBY_VENUES_TIMEOUT_MS = 1200;
const NEARBY_VENUES_CACHE_HEADER = 'public, max-age=15, stale-while-revalidate=60';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function nearbyVenuesFallback(queryGeohash: string | null, message: string) {
  const response = NextResponse.json({
    success: true,
    data: {
      venues: [],
      count: 0,
      queryLocation: {
        geohash: queryGeohash,
      },
    },
    source: 'fallback',
    warning: message,
  });
  response.headers.set('Cache-Control', NEARBY_VENUES_CACHE_HEADER);
  response.headers.set('X-BaseDare-Data-Source', 'fallback');
  return response;
}

export async function GET(request: NextRequest) {
  let fallbackGeohash: string | null = null;

  try {
    const { searchParams } = new URL(request.url);
    const query = NearbyVenueQuerySchema.safeParse({
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      radiusMeters: searchParams.get('radiusMeters'),
      limit: searchParams.get('limit'),
    });

    if (!query.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: query.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    fallbackGeohash = encodeGeohash(
      query.data.lat,
      query.data.lng,
      query.data.radiusMeters > 5000 ? 5 : 6
    );

    const result = await withTimeout(
      getNearbyVenues(query.data),
      NEARBY_VENUES_TIMEOUT_MS,
      'Nearby venues query timed out'
    );

    const response = NextResponse.json({
      success: true,
      data: {
        venues: result.venues,
        count: result.venues.length,
        queryLocation: {
          geohash: result.queryGeohash,
        },
      },
    });
    response.headers.set('Cache-Control', NEARBY_VENUES_CACHE_HEADER);
    response.headers.set('X-BaseDare-Data-Source', 'database');
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUES_NEARBY] Query failed:', message);
    return nearbyVenuesFallback(fallbackGeohash, 'Nearby venues are temporarily warming up.');
  }
}
