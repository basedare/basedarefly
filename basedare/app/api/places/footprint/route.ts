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

    const tags = await prisma.placeTag.findMany({
      where: {
        walletAddress: wallet,
        status: 'APPROVED',
      },
      orderBy: { submittedAt: 'asc' },
      take: 24,
      select: {
        id: true,
        creatorTag: true,
        firstMark: true,
        submittedAt: true,
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
