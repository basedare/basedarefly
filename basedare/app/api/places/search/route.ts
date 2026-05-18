import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateDistance, isValidCoordinates } from '@/lib/geo';
import { prisma } from '@/lib/prisma';
import { ensureCuratedVenueRecords, getCuratedVenueSlugsForQuery } from '@/lib/curated-venues';
import { getActiveVenuePerk } from '@/lib/venue-perks';

export const runtime = 'nodejs';

const SearchSchema = z.object({
  q: z.string().trim().min(2).max(120),
  lat: z.coerce.number().optional(),
  lon: z.coerce.number().optional(),
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

type SearchIntent = {
  key: string;
  label: string;
  aliases: string[];
  categories: string[];
};

type SearchOrigin = {
  latitude: number;
  longitude: number;
};

const RECENT_PLACE_ACTIVITY_HOURS = 24;
const NOMINATIM_TIMEOUT_MS = 900;

const SEARCH_INTENTS: SearchIntent[] = [
  {
    key: 'breakfast',
    label: 'Breakfast',
    aliases: [
      'breakfast',
      'breakfast spot',
      'brunch',
      'brunch spot',
      'morning',
      'smoothie bowl',
      'smoothie',
      'acai',
      'pancake',
      'bakery',
      'healthy',
      'vegan',
    ],
    categories: [
      'breakfast',
      'brunch',
      'morning',
      'smoothie-bowl',
      'smoothie',
      'cafe',
      'coffee',
      'healthy',
      'organic',
      'bakery',
    ],
  },
  {
    key: 'coffee',
    label: 'Coffee',
    aliases: ['coffee', 'cafe', 'work', 'laptop', 'wifi', 'wi-fi', 'coworking', 'remote work'],
    categories: ['coffee', 'cafe', 'work-friendly', 'coworking', 'breakfast', 'brunch'],
  },
  {
    key: 'food',
    label: 'Food',
    aliases: ['food', 'eat', 'restaurant', 'lunch', 'dinner', 'late food', 'late night'],
    categories: ['food', 'restaurant', 'lunch', 'dinner', 'late-night', 'pizza', 'tacos', 'tapas'],
  },
  {
    key: 'beach',
    label: 'Beach',
    aliases: ['beach', 'sunset', 'sunrise', 'surf', 'swim'],
    categories: ['beach', 'surf', 'sunset', 'sunrise', 'surf-view', 'boardwalk'],
  },
  {
    key: 'nightlife',
    label: 'Night',
    aliases: ['bar', 'bars', 'drink', 'drinks', 'night', 'nightlife', 'party', 'late'],
    categories: ['bar', 'nightlife', 'late-night', 'music', 'beach-club', 'sports-bar'],
  },
  {
    key: 'trendy',
    label: 'Trendy',
    aliases: ['trendy', 'cool spots', 'rooftop', 'sunset spot', 'date spot', 'events'],
    categories: ['trendy', 'rooftop', 'sunset', 'events', 'coworking', 'social', 'beachfront'],
  },
  {
    key: 'perk',
    label: 'Perk',
    aliases: ['perk', 'perks', 'mission', 'reward', 'deal', 'unlock'],
    categories: ['perks', 'mission', 'reward'],
  },
];

function normalizeIntentToken(input: string) {
  return input.trim().toLowerCase().replace(/[\s_]+/g, '-');
}

function getSearchIntents(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return SEARCH_INTENTS.filter((intent) =>
    intent.aliases.some((alias) => normalized.includes(alias))
  );
}

function getCategorySearchTokens(query: string) {
  const queryTokens = query
    .split(/\s+/)
    .map(normalizeIntentToken)
    .filter((token) => token.length >= 2);
  const intentTokens = getSearchIntents(query).flatMap((intent) => intent.categories);

  return Array.from(new Set([...queryTokens, ...intentTokens]));
}

function getIntentLabelsForCategories(categories: string[] = []) {
  const categorySet = new Set(categories.map(normalizeIntentToken));
  return SEARCH_INTENTS
    .filter((intent) => intent.categories.some((category) => categorySet.has(normalizeIntentToken(category))))
    .map((intent) => intent.label)
    .slice(0, 3);
}

function getMatchReason(input: {
  intentLabels: string[];
  recentCheckInCount: number;
  activeDareCount: number;
  approvedCount: number;
  hasActivePerk: boolean;
}) {
  const signals = [
    ...input.intentLabels.slice(0, 2),
    input.recentCheckInCount > 0 ? `${input.recentCheckInCount} recent check-in${input.recentCheckInCount === 1 ? '' : 's'}` : null,
    input.approvedCount > 0 ? `${input.approvedCount} proof${input.approvedCount === 1 ? '' : 's'}` : null,
    input.activeDareCount > 0 ? 'Take proof here' : null,
    input.hasActivePerk ? 'Perk live' : null,
  ].filter(Boolean);

  return signals.slice(0, 3).join(' · ') || null;
}

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

async function searchKnownPlaces(query: string, origin: SearchOrigin | null) {
  await ensureCuratedVenueRecords(getCuratedVenueSlugsForQuery(query));

  const normalizedSlugQuery = query.toLowerCase().replace(/\s+/g, '-');
  const categoryTokens = getCategorySearchTokens(query);
  const intentKeys = getSearchIntents(query).map((intent) => intent.key);
  const recentSince = new Date(Date.now() - RECENT_PLACE_ACTIVITY_HOURS * 60 * 60 * 1000);
  const tokens = query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  const tokenClauses = tokens.flatMap((token) => [
    { name: { contains: token, mode: 'insensitive' as const } },
    { slug: { contains: token.toLowerCase(), mode: 'insensitive' as const } },
    { city: { contains: token, mode: 'insensitive' as const } },
    { country: { contains: token, mode: 'insensitive' as const } },
    { address: { contains: token, mode: 'insensitive' as const } },
  ]);

  const categoryClauses =
    categoryTokens.length > 0
      ? [
          { categories: { hasSome: categoryTokens } },
          {
            placeTags: {
              some: {
                status: 'APPROVED',
                vibeTags: { hasSome: categoryTokens },
              },
            },
          },
        ]
      : [];

  const liveIntentClauses = intentKeys.includes('perk')
    ? [
        {
          dares: {
            some: {
              NOT: {
                OR: [
                  { status: { in: ['EXPIRED', 'FAILED', 'VERIFIED'] } },
                  { expiresAt: { lt: new Date() } },
                ],
              },
            },
          },
        },
      ]
    : [];

  const venues = await prisma.venue.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { slug: { contains: normalizedSlugQuery, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
        { country: { contains: query, mode: 'insensitive' } },
        { address: { contains: query, mode: 'insensitive' } },
        ...categoryClauses,
        ...liveIntentClauses,
        ...tokenClauses,
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      categories: true,
      metadataJson: true,
      checkIns: {
        where: {
          status: 'CONFIRMED',
          scannedAt: { gte: recentSince },
        },
        select: { id: true },
      },
      dares: {
        where: {
          NOT: {
            OR: [
              { status: { in: ['EXPIRED', 'FAILED', 'VERIFIED'] } },
              { expiresAt: { lt: new Date() } },
            ],
          },
        },
        select: { id: true },
      },
    },
    orderBy: [
      { isPartner: 'desc' },
      { updatedAt: 'desc' },
    ],
    take: 12,
  });

  const tagSummaryMap = await prisma.placeTag.groupBy({
    by: ['venueId'],
    where: {
      status: 'APPROVED',
      venueId: { in: venues.map((venue) => venue.id) },
    },
    _count: {
      _all: true,
    },
    _max: {
      submittedAt: true,
    },
  });

  const tagSummaryByVenueId = new Map(
    tagSummaryMap.map((summary) => [
      summary.venueId,
      {
        approvedCount: summary._count._all,
        lastTaggedAt: summary._max.submittedAt?.toISOString() ?? null,
      },
    ])
  );

  return venues
    .map((venue) => {
      const approvedCount = tagSummaryByVenueId.get(venue.id)?.approvedCount ?? 0;
      const activeDareCount = venue.dares.length;
      const recentCheckInCount = venue.checkIns.length;
      const intentLabels = getIntentLabelsForCategories(venue.categories);
      const hasActivePerk = getActiveVenuePerk(venue.metadataJson) !== null;
      const exactNameMatch = venue.name.toLowerCase().includes(query.toLowerCase());
      const categoryMatchCount = categoryTokens.filter((token) =>
        venue.categories.map(normalizeIntentToken).includes(token)
      ).length;
      const distanceKm = origin
        ? calculateDistance(origin.latitude, origin.longitude, venue.latitude, venue.longitude)
        : null;
      const distanceScore = distanceKm === null ? 0 : Math.max(0, 90 - distanceKm * 9);
      const score =
        (exactNameMatch ? 120 : 0) +
        categoryMatchCount * 30 +
        distanceScore +
        activeDareCount * 22 +
        recentCheckInCount * 14 +
        approvedCount * 8 +
        (hasActivePerk ? 18 : 0);

      return {
        id: venue.id,
        externalPlaceId: `venue:${venue.slug}`,
        placeSource: 'BASEDARE_VENUE',
        name: venue.name,
        displayName: [venue.name, venue.address, venue.city, venue.country].filter(Boolean).join(', '),
        address: venue.address,
        city: venue.city,
        country: venue.country,
        latitude: venue.latitude,
        longitude: venue.longitude,
        slug: venue.slug,
        placeId: venue.id,
        categories: venue.categories,
        activeDareCount,
        approvedCount,
        recentCheckInCount,
        hasActivePerk,
        intentLabels,
        matchReason: getMatchReason({
          intentLabels,
          recentCheckInCount,
          activeDareCount,
          approvedCount,
          hasActivePerk,
        }),
        lastTaggedAt: tagSummaryByVenueId.get(venue.id)?.lastTaggedAt ?? null,
        score,
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 8)
    .map((venue) => {
      const { score, ...result } = venue;
      void score;
      return result;
    });
}

async function searchNominatim(query: string, origin: SearchOrigin | null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    const intentSearch = getSearchIntents(query).length > 0;
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('format', 'jsonv2');
    nominatimUrl.searchParams.set('addressdetails', '1');
    nominatimUrl.searchParams.set('limit', '6');
    nominatimUrl.searchParams.set('dedupe', '1');
    nominatimUrl.searchParams.set('q', query);
    if (origin) {
      const delta = intentSearch ? 0.18 : 0.08;
      nominatimUrl.searchParams.set(
        'viewbox',
        [
          (origin.longitude - delta).toFixed(5),
          (origin.latitude + delta).toFixed(5),
          (origin.longitude + delta).toFixed(5),
          (origin.latitude - delta).toFixed(5),
        ].join(',')
      );
      if (intentSearch) {
        nominatimUrl.searchParams.set('bounded', '1');
      }
    }

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'BaseDare/1.0 (https://www.basedare.xyz)',
        'Accept-Language': 'en',
      },
      signal: controller.signal,
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned ${response.status}`);
    }

    const payload = (await response.json()) as NominatimResult[];
    return payload
      .map(normalizeResult)
      .filter((item): item is NonNullable<typeof item> => item !== null);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn('[PLACES_SEARCH] Nominatim fallback skipped:', message);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = SearchSchema.safeParse({
      q: searchParams.get('q') ?? '',
      lat: searchParams.get('lat') ?? undefined,
      lon: searchParams.get('lon') ?? undefined,
    });

    if (!query.success) {
      return NextResponse.json(
        { success: false, error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const origin =
      query.data.lat !== undefined &&
      query.data.lon !== undefined &&
      isValidCoordinates(query.data.lat, query.data.lon)
        ? { latitude: query.data.lat, longitude: query.data.lon }
        : null;

    const [knownPlaces, nominatimResults] = await Promise.all([
      searchKnownPlaces(query.data.q, origin),
      searchNominatim(query.data.q, origin),
    ]);

    const seen = new Set<string>();
    const results = [...knownPlaces, ...nominatimResults].filter((result) => {
      const key = result.externalPlaceId;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

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
