import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { deriveVenueHandle, formatVenueHandle } from '@/lib/venue-handles';

function normalizeWallet(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = normalizeWallet(searchParams.get('wallet'));

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ success: false, error: 'Valid wallet address required' }, { status: 400 });
    }

    const venues = await prisma.venue.findMany({
      where: {
        OR: [
          { claimedBy: wallet },
          {
            claimRequestWallet: wallet,
            claimRequestStatus: 'PENDING',
          },
        ],
      },
      orderBy: [
        { claimedAt: 'desc' },
        { claimRequestedAt: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: 8,
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        country: true,
        categories: true,
        metadataJson: true,
        isPartner: true,
        claimedBy: true,
        claimedAt: true,
        claimRequestWallet: true,
        claimRequestTag: true,
        claimRequestedAt: true,
        claimRequestStatus: true,
        _count: {
          select: {
            campaigns: true,
            checkIns: true,
          },
        },
      },
    });

    const venueIds = venues.map((venue) => venue.id);
    const approvedTagCounts =
      venueIds.length === 0
        ? []
        : await prisma.placeTag.groupBy({
            by: ['venueId'],
            where: {
              venueId: { in: venueIds },
              status: 'APPROVED',
            },
            _count: {
              _all: true,
            },
          });
    const approvedTagCountByVenue = new Map(
      approvedTagCounts.map((entry) => [entry.venueId, entry._count._all])
    );

    return NextResponse.json({
      success: true,
      data: {
        venues: venues.map((venue) => {
          const handle = deriveVenueHandle({
            slug: venue.slug,
            city: venue.city,
            country: venue.country,
            metadataJson: venue.metadataJson,
          });
          const claimState =
            normalizeWallet(venue.claimedBy) === wallet
              ? 'claimed'
              : normalizeWallet(venue.claimRequestWallet) === wallet && venue.claimRequestStatus === 'PENDING'
                ? 'pending'
                : 'unclaimed';

          return {
            id: venue.id,
            slug: venue.slug,
            handle,
            displayHandle: formatVenueHandle(handle),
            name: venue.name,
            city: venue.city,
            country: venue.country,
            categories: venue.categories,
            claimState,
            claimRequestStatus: venue.claimRequestStatus,
            claimRequestTag: venue.claimRequestTag,
            claimedAt: venue.claimedAt?.toISOString() ?? null,
            claimRequestedAt: venue.claimRequestedAt?.toISOString() ?? null,
            consoleUrl: claimState === 'claimed' ? `/venues/${venue.slug}/console` : null,
            venueUrl: `/venues/${venue.slug}`,
            mapUrl: `/map?place=${encodeURIComponent(venue.slug)}&mode=venue`,
            metrics: {
              approvedMarks: approvedTagCountByVenue.get(venue.id) ?? 0,
              checkIns: venue._count.checkIns,
              campaigns: venue._count.campaigns,
              partner: venue.isPartner,
            },
          };
        }),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUES_MINE_GET] Failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load venue dashboard' }, { status: 500 });
  }
}
