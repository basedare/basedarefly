import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getNearbyVenues } from '@/lib/venues';
import { calculateDistance, encodeGeohash, formatDistance } from '@/lib/geo';
import { CURATED_SIARGAO_VENUES } from '@/lib/curated-venues';
import { buildVenueProfile } from '@/lib/venue-profile';
import type { NearbyVenueItem, VenueCommandCenterSummary, VenueExperienceMode } from '@/lib/venue-types';

const NearbyVenueQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(100).max(25000).default(3000),
  limit: z.coerce.number().min(1).max(30).default(12),
});
const NEARBY_VENUES_TIMEOUT_MS = 3000;
const NEARBY_VENUES_CACHE_HEADER = 'public, max-age=15, stale-while-revalidate=60';
const NEARBY_VENUES_FALLBACK_CACHE_HEADER = 'no-store, max-age=0';
const BASECASH_PILOT_VENUE_SLUGS = new Set(['hideaway', 'the-cat-and-gun']);

type NearbyVenueQuery = z.infer<typeof NearbyVenueQuerySchema>;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function buildFallbackCommandCenter(slug: string): VenueCommandCenterSummary {
  return {
    status: 'claimable',
    claimState: 'unclaimed',
    label: 'Claimable venue',
    summary: 'This pin can graduate into a managed venue with sponsored dares, venue budgets, and command-center analytics.',
    sponsorReady: false,
    activeCampaignCount: 0,
    consoleUrl: null,
    contactUrl: `/contact?topic=venue-claim&venue=${encodeURIComponent(slug)}`,
    contactLabel: 'Claim venue',
    operatorTag: null,
    metrics: {
      approvedMarks: 0,
      activeChallenges: 0,
      paidActivations: 0,
      totalLiveFundingUsd: 0,
      uniqueVisitorsToday: null,
      scansLastHour: null,
    },
  };
}

function buildFallbackMapModes(): VenueExperienceMode[] {
  return [
    {
      id: 'classic',
      status: 'live',
      label: 'Classic',
      description: 'Primary tactical venue map mode.',
    },
    {
      id: 'noir',
      status: 'live',
      label: 'Noir',
      description: 'Lower-noise venue reconnaissance mode.',
    },
    {
      id: 'ar',
      status: 'planned',
      label: 'AR',
      description: 'LocAR venue overlays are planned for this map layer.',
    },
  ];
}

function getCuratedFallbackVenues(query: NearbyVenueQuery | null): NearbyVenueItem[] {
  if (!query) return [];

  const radiusKm = query.radiusMeters / 1000;
  const fallbackVenues: NearbyVenueItem[] = [];

  CURATED_SIARGAO_VENUES.forEach((venue) => {
    const distanceKm = calculateDistance(query.lat, query.lng, venue.latitude, venue.longitude);
    if (distanceKm > radiusKm) return;

    fallbackVenues.push({
      id: `curated:${venue.slug}`,
      slug: venue.slug,
      handle: `${venue.slug}.siargao`,
      baseCashEnabled: BASECASH_PILOT_VENUE_SLUGS.has(venue.slug),
      name: venue.name,
      description: venue.description,
      profile: buildVenueProfile({
        name: venue.name,
        description: venue.description,
        categories: venue.categories,
        city: venue.city,
        country: venue.country,
      }),
      city: venue.city,
      country: venue.country,
      latitude: venue.latitude,
      longitude: venue.longitude,
      categories: venue.categories,
      status: 'ACTIVE',
      isPartner: false,
      partnerTier: null,
      checkInRadiusMeters: 120,
      qrRotationSeconds: 45,
      distanceKm: Math.round(distanceKm * 100) / 100,
      distanceDisplay: formatDistance(distanceKm),
      memorySummary: null,
      tagSummary: {
        approvedCount: 0,
        heatScore: 0,
        lastTaggedAt: null,
      },
      mayor: null,
      reviewSignal: {
        count: 0,
        worthItCount: 0,
        skipCount: 0,
        worthItRatio: 0,
        lastReviewedAt: null,
        fresh: false,
        state: 'none',
      },
      activePerk: null,
      firstSparkWindow: null,
      liveSession: null,
      commandCenter: buildFallbackCommandCenter(venue.slug),
      mapModes: buildFallbackMapModes(),
      activeDareCount: 0,
      checkInCount: 0,
    });
  });

  return fallbackVenues.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, query.limit);
}

function nearbyVenuesFallback(query: NearbyVenueQuery | null, queryGeohash: string | null, message: string) {
  const fallbackVenues = getCuratedFallbackVenues(query);
  const source = fallbackVenues.length > 0 ? 'curated-fallback' : 'fallback';
  const response = NextResponse.json({
    success: true,
    data: {
      venues: fallbackVenues,
      count: fallbackVenues.length,
      queryLocation: {
        geohash: queryGeohash,
      },
    },
    source,
    warning: message,
  });
  response.headers.set('Cache-Control', NEARBY_VENUES_FALLBACK_CACHE_HEADER);
  response.headers.set('X-BaseDare-Data-Source', source);
  return response;
}

export async function GET(request: NextRequest) {
  let fallbackGeohash: string | null = null;
  let fallbackQuery: NearbyVenueQuery | null = null;

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

    fallbackQuery = query.data;
    fallbackGeohash = encodeGeohash(query.data.lat, query.data.lng, query.data.radiusMeters > 5000 ? 5 : 6);

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
    return nearbyVenuesFallback(fallbackQuery, fallbackGeohash, 'Nearby venues are temporarily warming up.');
  }
}
