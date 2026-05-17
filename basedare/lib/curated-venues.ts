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
    slug: 'hideaway',
    name: 'Hideaway',
    description:
      'Boardwalk bar energy right by the island hopping dock in General Luna.',
    address: 'Boardwalk, General Luna, 8419 Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.78134,
    longitude: 126.15625,
    timezone: 'Asia/Manila',
    categories: ['nightlife', 'boardwalk', 'dock', 'bar', 'dinner', 'late-night', 'siargao', 'general-luna'],
  },
  {
    slug: 'siargao-beach-club',
    name: 'Siargao Beach Club',
    description:
      'Nightlife and beach-club pilot venue for BaseDare venue-memory and QR-console testing in General Luna.',
    address: 'Tourism Road, Purok 3, General Luna, Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.78578,
    longitude: 126.16048,
    timezone: 'Asia/Manila',
    categories: ['nightlife', 'music', 'beach-club', 'bar', 'dinner', 'late-night', 'siargao', 'general-luna'],
  },
  {
    slug: 'cloud-9-boardwalk',
    name: 'Cloud 9 Boardwalk',
    description:
      'Iconic surf-side walkway and a clean first-mark target for Siargao.',
    address: 'Cloud 9, Catangnan, General Luna, Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.81276,
    longitude: 126.16408,
    timezone: 'Asia/Manila',
    categories: ['surf', 'boardwalk', 'iconic', 'beach', 'sunrise', 'morning', 'siargao', 'catangnan'],
  },
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
    categories: [
      'cafe',
      'coffee',
      'breakfast',
      'brunch',
      'lunch',
      'sports-bar',
      'food',
      'work-friendly',
      'siargao',
      'catangnan',
    ],
  },
  {
    slug: 'shaka-siargao',
    name: 'Shaka Siargao',
    description:
      'Cloud 9 smoothie-bowl and surf-view stop that gives the Catangnan side a daytime proof anchor.',
    address: 'Tourism Road, Cloud 9, General Luna, Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.81255,
    longitude: 126.15965,
    timezone: 'Asia/Manila',
    categories: [
      'cafe',
      'coffee',
      'breakfast',
      'brunch',
      'smoothie-bowl',
      'healthy',
      'surf-view',
      'morning',
      'cloud-9',
      'siargao',
      'catangnan',
    ],
  },
  {
    slug: 'kermit-siargao',
    name: 'Kermit Siargao',
    description:
      'Surf-camp restaurant node between town and Cloud 9 for dinner marks, surf plans, and creator meetups.',
    address: 'Purok 5, General Luna, Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.79895,
    longitude: 126.1582,
    timezone: 'Asia/Manila',
    categories: ['restaurant', 'surf-camp', 'pizza', 'lunch', 'dinner', 'social', 'siargao', 'general-luna'],
  },
  {
    slug: 'bravo-restaurant-siargao',
    name: 'Bravo Restaurant Siargao',
    description:
      'Beachfront General Luna dinner and drinks anchor with lagoon-facing social energy.',
    address: 'Tourism Road, Barangay 5, General Luna, Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.79315,
    longitude: 126.1609,
    timezone: 'Asia/Manila',
    categories: ['restaurant', 'beachfront', 'bar', 'breakfast', 'brunch', 'dinner', 'siargao', 'general-luna'],
  },
  {
    slug: 'harana-surf-resort',
    name: 'Harana Surf Resort',
    description:
      'Tuason/Catangnan surf-resort stop for surf lessons, food, and after-session place memory.',
    address: 'Tuason Point, Barangay Catangnan, General Luna, Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.80795,
    longitude: 126.16125,
    timezone: 'Asia/Manila',
    categories: ['surf', 'resort', 'restaurant', 'breakfast', 'lunch', 'catangnan', 'siargao', 'tuason'],
  },
  {
    slug: 'white-beard-coffee-siargao',
    name: 'White Beard Coffee Siargao',
    description:
      'Poblacion coffee and breakfast stop that fills the town-side morning route.',
    address: 'Poblacion 1, General Luna, Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.7909,
    longitude: 126.15855,
    timezone: 'Asia/Manila',
    categories: [
      'coffee',
      'breakfast',
      'brunch',
      'cafe',
      'morning',
      'work-friendly',
      'poblacion',
      'siargao',
      'general-luna',
    ],
  },
  {
    slug: 'las-barricas-siargao',
    name: 'Las Barricas Siargao',
    description:
      'Spanish and taco dinner spot in General Luna that adds a compact food-nightlife pin.',
    address: 'Poblacion V, General Luna, Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.7897,
    longitude: 126.16055,
    timezone: 'Asia/Manila',
    categories: ['restaurant', 'tapas', 'tacos', 'dinner', 'late-night', 'siargao', 'general-luna'],
  },
  {
    slug: 'barrel-siargao',
    name: 'BARREL Siargao',
    description:
      'Beachfront sports-bar anchor for late food, games, and nightlife marks near the main General Luna strip.',
    address: 'Route to Romantic, General Luna, Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.7898,
    longitude: 126.1621,
    timezone: 'Asia/Manila',
    categories: ['sports-bar', 'beachfront', 'nightlife', 'food', 'dinner', 'late-night', 'siargao', 'general-luna'],
  },
  {
    slug: 'general-luna-island-hopping-dock',
    name: 'General Luna Island Hopping Dock',
    description:
      'Public launch point for tri-island tours, boat meetups, and high-intent tourist movement.',
    address: 'General Luna Local Market, Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.78115,
    longitude: 126.15645,
    timezone: 'Asia/Manila',
    categories: ['dock', 'island-hopping', 'tourism', 'boats', 'morning', 'siargao', 'general-luna'],
  },
  {
    slug: 'tuason-point',
    name: 'Tuason Point',
    description:
      'Advanced surf-break pin north of General Luna that stretches the map past Cloud 9.',
    address: 'Tuason Point, Catangnan, General Luna, Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.8094,
    longitude: 126.1683,
    timezone: 'Asia/Manila',
    categories: ['surf', 'reef-break', 'sunrise', 'morning', 'catangnan', 'advanced', 'siargao', 'tuason'],
  },
  {
    slug: 'malinao-beach',
    name: 'Malinao Beach',
    description:
      'Quieter beach-side General Luna anchor so the map has a calmer south-side route too.',
    address: 'Malinao Road, General Luna, Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.7684925,
    longitude: 126.1289878,
    timezone: 'Asia/Manila',
    categories: ['beach', 'quiet', 'sunset', 'malinao', 'tourism', 'siargao', 'general-luna'],
  },
];

const SIARGAO_QUERY_TOKENS = [
  'cat',
  'gun',
  'catangnan',
  'siargao',
  'general luna',
  'surigao',
  'hideaway',
  'cloud 9',
  'beach club',
  'shaka',
  'kermit',
  'bravo',
  'harana',
  'white beard',
  'las barricas',
  'barrel',
  'island hopping',
  'tuason',
  'malinao',
  'breakfast',
  'brunch',
  'coffee',
  'cafe',
  'morning',
  'lunch',
  'dinner',
  'late night',
  'late-night',
  'food',
  'restaurant',
  'beach',
  'surf',
  'work friendly',
  'work-friendly',
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

  await Promise.all(
    selectedVenues.map((venue) =>
      prisma.venue.upsert({
        where: { slug: venue.slug },
        update: {
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
            curatedSet: 'siargao-v3',
            coordinatePolicy: 'Pinned to venue or street-side land anchor for clearer map routing.',
            activationAngle: 'Food, surf, nightlife, and island-hangout missions.',
          },
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
            curatedSet: 'siargao-v3',
            coordinatePolicy: 'Pinned to venue or street-side land anchor for clearer map routing.',
            activationAngle: 'Food, surf, nightlife, and island-hangout missions.',
          },
        },
      })
    )
  );
}
