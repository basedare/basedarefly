import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidCoordinates } from '@/lib/geo';

export const runtime = 'nodejs';

const SearchSchema = z.object({
  q: z.string().trim().min(2).max(120),
});

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  county?: string;
  state?: string;
  country?: string;
};

type NominatimResult = {
  place_id: number;
  osm_id?: number;
  osm_type?: string;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: NominatimAddress;
};

function getPlaceName(result: NominatimResult) {
  const firstSegment = result.display_name.split(',')[0]?.trim();
  return result.name?.trim() || firstSegment || 'Unnamed spot';
}

function normalizeResult(result: NominatimResult) {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);

  if (!isValidCoordinates(latitude, longitude)) {
    return null;
  }

  const city =
    result.address?.city ??
    result.address?.town ??
    result.address?.village ??
    result.address?.suburb ??
    result.address?.county ??
    null;

  const externalPlaceId =
    result.osm_id && result.osm_type
      ? `osm:${result.osm_type}:${result.osm_id}`
      : `nominatim:${result.place_id}`;

  return {
    id: externalPlaceId,
    externalPlaceId,
    placeSource: 'OSM_NOMINATIM',
    name: getPlaceName(result),
    displayName: result.display_name,
    address: result.display_name,
    city,
    country: result.address?.country ?? null,
    latitude,
    longitude,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = SearchSchema.safeParse({ q: searchParams.get('q') ?? '' });

    if (!query.success) {
      return NextResponse.json(
        { success: false, error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('format', 'jsonv2');
    nominatimUrl.searchParams.set('addressdetails', '1');
    nominatimUrl.searchParams.set('limit', '6');
    nominatimUrl.searchParams.set('dedupe', '1');
    nominatimUrl.searchParams.set('q', query.data.q);

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'BaseDare/1.0 (https://www.basedare.xyz)',
        'Accept-Language': 'en',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned ${response.status}`);
    }

    const payload = (await response.json()) as NominatimResult[];
    const results = payload
      .map(normalizeResult)
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({
      success: true,
      data: {
        results,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PLACES_SEARCH] Failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to search places' },
      { status: 500 }
    );
  }
}
