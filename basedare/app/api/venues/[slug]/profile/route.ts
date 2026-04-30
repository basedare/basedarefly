import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/lib/auth-options';
import { buildVenueProfile } from '@/lib/venue-profile';
import { prisma } from '@/lib/prisma';

type VenueProfileSession = {
  token?: string;
  walletAddress?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

const VenueProfileSchema = z.object({
  bio: z.string().trim().max(220).optional().nullable(),
  tagline: z.string().trim().max(96).optional().nullable(),
  profileImageUrl: z.string().trim().url().max(600).optional().nullable().or(z.literal('')),
  coverImageUrl: z.string().trim().url().max(600).optional().nullable().or(z.literal('')),
  legendKeys: z.array(z.string().trim().min(1).max(32)).max(4).optional(),
});

function getSessionWallet(session: VenueProfileSession | null) {
  return (session?.walletAddress ?? session?.user?.walletAddress ?? '').trim().toLowerCase();
}

function asMetadataRecord(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  return metadata as Record<string, unknown>;
}

function normalizeUrl(value: string | null | undefined) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function writeOptionalString(metadata: Record<string, unknown>, key: string, value: string | null | undefined) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed) {
    metadata[key] = trimmed;
    return;
  }

  delete metadata[key];
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as VenueProfileSession | null;
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sign in required to edit venue identity' }, { status: 401 });
    }

    const sessionToken = session.token?.trim();
    const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (sessionToken && (!bearerToken || bearerToken !== sessionToken)) {
      return NextResponse.json({ success: false, error: 'Invalid session token' }, { status: 401 });
    }

    const walletAddress = getSessionWallet(session);
    if (!walletAddress) {
      return NextResponse.json({ success: false, error: 'Wallet session is missing' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = VenueProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid venue profile' }, { status: 400 });
    }

    const { slug } = await params;
    const venue = await prisma.venue.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        city: true,
        country: true,
        categories: true,
        claimedBy: true,
        metadataJson: true,
      },
    });

    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    if (!venue.claimedBy || venue.claimedBy.toLowerCase() !== walletAddress) {
      return NextResponse.json({ success: false, error: 'Only the claimed venue wallet can edit this identity' }, { status: 403 });
    }

    const nextMetadata = { ...asMetadataRecord(venue.metadataJson) };
    writeOptionalString(nextMetadata, 'bio', parsed.data.bio);
    writeOptionalString(nextMetadata, 'tagline', parsed.data.tagline);

    const profileImageUrl = normalizeUrl(parsed.data.profileImageUrl);
    const coverImageUrl = normalizeUrl(parsed.data.coverImageUrl);
    if (profileImageUrl) nextMetadata.profileImageUrl = profileImageUrl;
    else delete nextMetadata.profileImageUrl;
    if (coverImageUrl) nextMetadata.coverImageUrl = coverImageUrl;
    else delete nextMetadata.coverImageUrl;

    const legendKeys = Array.from(new Set(parsed.data.legendKeys ?? [])).slice(0, 4);
    if (legendKeys.length > 0) nextMetadata.legendKeys = legendKeys;
    else delete nextMetadata.legendKeys;

    const updatedVenue = await prisma.venue.update({
      where: { id: venue.id },
      data: {
        metadataJson: nextMetadata as Prisma.InputJsonObject,
      },
      select: {
        name: true,
        description: true,
        city: true,
        country: true,
        categories: true,
        metadataJson: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        profile: buildVenueProfile({
          name: updatedVenue.name,
          description: updatedVenue.description,
          categories: updatedVenue.categories,
          city: updatedVenue.city,
          country: updatedVenue.country,
          metadataJson: updatedVenue.metadataJson,
        }),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_PROFILE] Update failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to update venue identity' }, { status: 500 });
  }
}
