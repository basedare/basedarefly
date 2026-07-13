import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  encodeGeohash,
  getNeighborGeohashes,
  isValidCoordinates,
} from '@/lib/geo';
import { deriveVenueHandle, isBaseCashPilotVenue } from '@/lib/venue-handles';
import { selectNearbyPlaceMatch } from '@/lib/place-resolution-policy';

const ResolvePlaceSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().trim().max(280).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  country: z.string().trim().max(120).nullable().optional(),
  placeSource: z.string().trim().max(64).nullable().optional(),
  externalPlaceId: z.string().trim().max(160).nullable().optional(),
});

const NEARBY_MATCH_RADIUS_METERS = 30;

function withVenueIdentity<T extends { slug: string; city: string | null; country: string | null }>(place: T) {
  return {
    ...place,
    handle: deriveVenueHandle({
      slug: place.slug,
      city: place.city,
      country: place.country,
    }),
    baseCashEnabled: isBaseCashPilotVenue(place.slug),
  };
}

function slugifyPlaceName(value: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'tagged-spot';
}

async function ensureUniqueVenueSlug(baseSlug: string) {
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await prisma.venue.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function findNearbyVenueMatch(
  latitude: number,
  longitude: number,
  requestedName?: string | null
) {
  const queryGeohash = encodeGeohash(latitude, longitude, 7);
  const legacyQueryGeohash = encodeGeohash(latitude, longitude, 6);
  const latitudeDelta = NEARBY_MATCH_RADIUS_METERS / 111_320;
  const longitudeDelta = latitudeDelta / Math.max(Math.cos((latitude * Math.PI) / 180), 0.2);
  const nearby = await prisma.venue.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { geohash: { in: getNeighborGeohashes(queryGeohash) } },
        { geohash: { in: getNeighborGeohashes(legacyQueryGeohash) } },
        {
          latitude: { gte: latitude - latitudeDelta, lte: latitude + latitudeDelta },
          longitude: { gte: longitude - longitudeDelta, lte: longitude + longitudeDelta },
        },
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
    },
    take: 32,
  });

  return selectNearbyPlaceMatch({
    latitude,
    longitude,
    requestedName,
    candidates: nearby,
    radiusMeters: NEARBY_MATCH_RADIUS_METERS,
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = ResolvePlaceSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid place candidate',
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const {
      name,
      latitude,
      longitude,
      address,
      city,
      country,
      placeSource,
      externalPlaceId,
    } = parsed.data;

    if (!isValidCoordinates(latitude, longitude)) {
      return NextResponse.json(
        { success: false, error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    const normalizedPlaceSource =
      placeSource?.trim() || (externalPlaceId ? 'OSM_NOMINATIM' : 'MAP_DROP');

    if (externalPlaceId && normalizedPlaceSource) {
      const existingByExternal = await prisma.venue.findUnique({
        where: {
          placeSource_externalPlaceId: {
            placeSource: normalizedPlaceSource,
            externalPlaceId,
          },
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
        },
      });

      if (existingByExternal) {
        return NextResponse.json({
          success: true,
          data: {
            created: false,
            place: withVenueIdentity(existingByExternal),
          },
        });
      }
    }

    const nearbyMatch = await findNearbyVenueMatch(latitude, longitude, name);
    if (nearbyMatch) {
      return NextResponse.json({
        success: true,
        data: {
          created: false,
          place: withVenueIdentity(nearbyMatch),
        },
      });
    }

    const resolvedName = name?.trim() || `Tagged spot ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    const baseSlug = slugifyPlaceName(resolvedName);
    const slug = await ensureUniqueVenueSlug(baseSlug);
    const geohash = encodeGeohash(latitude, longitude, 7);

    const created = externalPlaceId
      ? await prisma.venue.upsert({
          where: {
            placeSource_externalPlaceId: {
              placeSource: normalizedPlaceSource,
              externalPlaceId,
            },
          },
          update: {
            name: resolvedName,
            address: address ?? undefined,
            city: city ?? undefined,
            country: country ?? undefined,
            latitude,
            longitude,
            geohash,
            metadataJson: {
              searchAddress: address ?? null,
              resolvedBy: 'api/places/resolve-or-create',
            },
          },
          create: {
            slug,
            name: resolvedName,
            address: address ?? null,
            city: city ?? null,
            country: country ?? null,
            latitude,
            longitude,
            geohash,
            placeSource: normalizedPlaceSource,
            externalPlaceId,
            checkInRadiusMeters: 150,
            metadataJson: {
              searchAddress: address ?? null,
              resolvedBy: 'api/places/resolve-or-create',
            },
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
          },
        })
      : await prisma.venue.create({
          data: {
            slug,
            name: resolvedName,
            address: address ?? null,
            city: city ?? null,
            country: country ?? null,
            latitude,
            longitude,
            geohash,
            placeSource: normalizedPlaceSource,
            checkInRadiusMeters: 150,
            metadataJson: {
              searchAddress: address ?? null,
              resolvedBy: 'api/places/resolve-or-create',
            },
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
          },
        });

    return NextResponse.json({
      success: true,
      data: {
        created: true,
        place: withVenueIdentity(created),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PLACES_RESOLVE_OR_CREATE] Failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve place' },
      { status: 500 }
    );
  }
}
