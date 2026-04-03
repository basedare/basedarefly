import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { isPlaceTagTableMissingError } from '@/lib/place-tags';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = (searchParams.get('wallet') || '').trim().toLowerCase();

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Valid wallet is required' },
        { status: 400 }
      );
    }

    const allTags = await prisma.placeTag.findMany({
      where: {
        walletAddress: wallet,
        status: 'APPROVED',
      },
      orderBy: { submittedAt: 'asc' },
      select: {
        id: true,
        creatorTag: true,
        firstMark: true,
        submittedAt: true,
        venueId: true,
        venue: {
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
          },
        },
      },
    });

    const tags = allTags.slice(-24);
    const firstMarks = allTags.filter((tag) => tag.firstMark).length;
    const uniqueVenueIds = new Set(allTags.map((tag) => tag.venueId));
    const topVenueEntry = Array.from(
      allTags.reduce((accumulator, tag) => {
        const current = accumulator.get(tag.venueId);
        if (current) {
          current.count += 1;
        } else {
          accumulator.set(tag.venueId, {
            id: tag.venue.id,
            slug: tag.venue.slug,
            name: tag.venue.name,
            city: tag.venue.city,
            country: tag.venue.country,
            count: 1,
          });
        }
        return accumulator;
      }, new Map<string, { id: string; slug: string; name: string; city: string | null; country: string | null; count: number }>())
    )
      .map(([, value]) => value)
      .sort((left, right) => right.count - left.count)[0] ?? null;

    return NextResponse.json({
      success: true,
      data: {
        marks: tags.map((tag) => ({
          id: tag.id,
          creatorTag: tag.creatorTag,
          firstMark: tag.firstMark,
          submittedAt: tag.submittedAt.toISOString(),
          venue: {
            id: tag.venue.id,
            slug: tag.venue.slug,
            name: tag.venue.name,
            address: tag.venue.address,
            city: tag.venue.city,
            country: tag.venue.country,
            latitude: tag.venue.latitude,
            longitude: tag.venue.longitude,
            categories: tag.venue.categories,
          },
        })),
        stats: {
          totalMarks: allTags.length,
          firstMarks,
          uniqueVenues: uniqueVenueIds.size,
          lastMarkedAt: allTags.at(-1)?.submittedAt.toISOString() ?? null,
          topVenue: topVenueEntry,
        },
      },
    });
  } catch (error) {
    if (isPlaceTagTableMissingError(error)) {
      return NextResponse.json(
        { success: false, error: 'Place tags are not available yet.' },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PLACE_FOOTPRINT_GET] Failed:', message);

    return NextResponse.json(
      { success: false, error: 'Failed to fetch creator footprint' },
      { status: 500 }
    );
  }
}
