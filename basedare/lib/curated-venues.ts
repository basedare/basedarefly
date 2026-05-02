import 'server-only';

import { prisma } from '@/lib/prisma';
import { calculateDistance, encodeGeohash } from '@/lib/geo';

type CuratedVenue = {
  slug: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  categories: string[];
};

export const CURATED_SIARGAO_VENUES: CuratedVenue[] = [
  {
    slug: 'the-cat-and-gun',
    name: 'The Cat & Gun',
    description:
      'Catangnan coffee and sports-bar stop with a clean creator rail for food, match-night, and island hangout dares.',
    address: 'Catangnan, General Luna, Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.8093625,
    longitude: 126.1598594,
    timezone: 'Asia/Manila',
    categories: ['cafe', 'coffee', 'sports-bar', 'food', 'siargao', 'catangnan'],
  },
];

const SIARGAO_QUERY_TOKENS = [
  'cat',
  'gun',
  'catangnan',
  'siargao',
  'general luna',
  'surigao',
];

export function getCuratedVenueSlugsForQuery(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const shouldLoadSiargao = SIARGAO_QUERY_TOKENS.some((token) => normalized.includes(token));
  return shouldLoadSiargao ? CURATED_SIARGAO_VENUES.map((venue) => venue.slug) : [];
}

export function getCuratedVenueSlugsNear(input: {
  lat: number;
  lng: number;
  radiusMeters: number;
}) {
  const radiusKm = input.radiusMeters / 1000;

  return CURATED_SIARGAO_VENUES
    .filter((venue) => calculateDistance(input.lat, input.lng, venue.latitude, venue.longitude) <= radiusKm)
    .map((venue) => venue.slug);
}

export async function ensureCuratedVenueRecords(slugs: string[]) {
  const uniqueSlugs = Array.from(new Set(slugs)).filter(Boolean);
  if (uniqueSlugs.length === 0) return;

  const selectedVenues = CURATED_SIARGAO_VENUES.filter((venue) => uniqueSlugs.includes(venue.slug));
  if (selectedVenues.length === 0) return;

  const existing = await prisma.venue.findMany({
    where: { slug: { in: selectedVenues.map((venue) => venue.slug) } },
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((venue) => venue.slug));
  const missing = selectedVenues.filter((venue) => !existingSlugs.has(venue.slug));

  if (missing.length === 0) return;

  await Promise.all(
    missing.map((venue) =>
      prisma.venue.upsert({
        where: { slug: venue.slug },
        update: {
          name: venue.name,
        },
        create: {
          slug: venue.slug,
          name: venue.name,
          description: venue.description,
          address: venue.address,
          city: venue.city,
          country: venue.country,
          latitude: venue.latitude,
          longitude: venue.longitude,
          geohash: encodeGeohash(venue.latitude, venue.longitude, 6),
          timezone: venue.timezone,
          categories: venue.categories,
          placeSource: 'BASEDARE_CURATED',
          externalPlaceId: `curated:${venue.slug}`,
          checkInRadiusMeters: 120,
          metadataJson: {
            curated: true,
            curatedSet: 'siargao-v1',
            activationAngle: 'Food, coffee, sports-bar, and island hangout missions.',
          },
        },
      })
    )
  );
}
