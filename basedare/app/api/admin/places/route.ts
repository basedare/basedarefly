import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { encodeGeohash, isValidCoordinates } from '@/lib/geo';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAdmin(request: NextRequest): boolean {
  if (!ADMIN_SECRET || ADMIN_SECRET.length < 32) {
    console.error('[SECURITY] Admin place access denied - ADMIN_SECRET not properly configured');
    return false;
  }

  const authHeader = request.headers.get('x-admin-secret');
  if (!authHeader || authHeader.length !== ADMIN_SECRET.length) return false;

  let result = 0;
  for (let i = 0; i < authHeader.length; i += 1) {
    result |= authHeader.charCodeAt(i) ^ ADMIN_SECRET.charCodeAt(i);
  }

  return result === 0;
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

async function ensureUniqueVenueSlug(baseSlug: string, excludeId?: string) {
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await prisma.venue.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === excludeId) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

const SavePlaceSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().max(120).optional(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).nullable().optional(),
  address: z.string().trim().max(280).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  country: z.string().trim().max(120).nullable().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  status: z.string().trim().min(1).max(32).default('ACTIVE'),
  placeSource: z.string().trim().max(64).nullable().optional(),
  externalPlaceId: z.string().trim().max(160).nullable().optional(),
  isPartner: z.boolean().optional().default(false),
  partnerTier: z.string().trim().max(64).nullable().optional(),
  categories: z.array(z.string().trim().min(1).max(64)).max(12).optional().default([]),
});

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() ?? '';
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '24'), 1), 50);

    const where = query
      ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' as const } },
            { slug: { contains: query, mode: 'insensitive' as const } },
            { city: { contains: query, mode: 'insensitive' as const } },
            { country: { contains: query, mode: 'insensitive' as const } },
            { address: { contains: query, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const places = await prisma.venue.findMany({
      where,
      orderBy: [{ isPartner: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        address: true,
        city: true,
        country: true,
        latitude: true,
        longitude: true,
        status: true,
        isPartner: true,
        partnerTier: true,
        placeSource: true,
        externalPlaceId: true,
        categories: true,
        checkInRadiusMeters: true,
        qrRotationSeconds: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            placeTags: true,
            dares: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        places,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_PLACES] GET failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = SavePlaceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }

    const {
      id,
      slug,
      name,
      description,
      address,
      city,
      country,
      latitude,
      longitude,
      status,
      placeSource,
      externalPlaceId,
      isPartner,
      partnerTier,
      categories,
    } = validation.data;

    if (!isValidCoordinates(latitude, longitude)) {
      return NextResponse.json({ success: false, error: 'Invalid coordinates' }, { status: 400 });
    }

    const normalizedSlug = slug?.trim()
      ? slugifyPlaceName(slug)
      : await ensureUniqueVenueSlug(slugifyPlaceName(name), id);

    if (slug?.trim()) {
      const uniqueSlug = await ensureUniqueVenueSlug(normalizedSlug, id);
      if (uniqueSlug !== normalizedSlug) {
        return NextResponse.json(
          { success: false, error: `Slug "${normalizedSlug}" is already in use` },
          { status: 409 }
        );
      }
    }

    const geohash = encodeGeohash(latitude, longitude, 7);
    const metadataJson = {
      updatedBy: 'admin/places',
      manualEditAt: new Date().toISOString(),
    };

    const savedPlace = id
      ? await prisma.venue.update({
          where: { id },
          data: {
            slug: normalizedSlug,
            name,
            description: description ?? null,
            address: address ?? null,
            city: city ?? null,
            country: country ?? null,
            latitude,
            longitude,
            geohash,
            status,
            isPartner,
            partnerTier: partnerTier ?? null,
            placeSource: placeSource ?? null,
            externalPlaceId: externalPlaceId ?? null,
            categories,
            metadataJson,
          },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            address: true,
            city: true,
            country: true,
            latitude: true,
            longitude: true,
            status: true,
            isPartner: true,
            partnerTier: true,
            placeSource: true,
            externalPlaceId: true,
            categories: true,
            checkInRadiusMeters: true,
            qrRotationSeconds: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                placeTags: true,
                dares: true,
              },
            },
          },
        })
      : await prisma.venue.create({
          data: {
            slug: normalizedSlug,
            name,
            description: description ?? null,
            address: address ?? null,
            city: city ?? null,
            country: country ?? null,
            latitude,
            longitude,
            geohash,
            status,
            isPartner,
            partnerTier: partnerTier ?? null,
            placeSource: placeSource ?? 'ADMIN_MANUAL',
            externalPlaceId: externalPlaceId ?? null,
            categories,
            checkInRadiusMeters: 150,
            metadataJson,
          },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            address: true,
            city: true,
            country: true,
            latitude: true,
            longitude: true,
            status: true,
            isPartner: true,
            partnerTier: true,
            placeSource: true,
            externalPlaceId: true,
            categories: true,
            checkInRadiusMeters: true,
            qrRotationSeconds: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                placeTags: true,
                dares: true,
              },
            },
          },
        });

    return NextResponse.json({
      success: true,
      data: {
        place: savedPlace,
        created: !id,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_PLACES] PUT failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
