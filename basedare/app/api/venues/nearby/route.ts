import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getNearbyVenues } from '@/lib/venues';

const NearbyVenueQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(100).max(25000).default(3000),
  limit: z.coerce.number().min(1).max(30).default(12),
});

export async function GET(request: NextRequest) {
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

    const result = await getNearbyVenues(query.data);

    return NextResponse.json({
      success: true,
      data: {
        venues: result.venues,
        count: result.venues.length,
        queryLocation: {
          geohash: result.queryGeohash,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUES_NEARBY] Query failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch nearby venues' },
      { status: 500 }
    );
  }
}
