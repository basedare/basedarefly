import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import {
  notifyVenueClaimApproved,
  notifyVenueClaimRejected,
} from '@/lib/venue-notifications';

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';

    const claims = await prisma.venue.findMany({
      where: status === 'ALL'
        ? { claimRequestStatus: { not: null } }
        : { claimRequestStatus: status },
      orderBy: { claimRequestedAt: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        country: true,
        isPartner: true,
        claimRequestWallet: true,
        claimRequestTag: true,
        claimRequestedAt: true,
        claimRequestStatus: true,
        claimedBy: true,
        claimedAt: true,
        _count: {
          select: {
            placeTags: true,
            dares: true,
            campaigns: true,
          },
        },
      },
    });

    const counts = await prisma.venue.groupBy({
      by: ['claimRequestStatus'],
      where: { claimRequestStatus: { not: null } },
      _count: true,
    });

    const countMap = counts.reduce(
      (acc, item) => {
        if (item.claimRequestStatus) {
          acc[item.claimRequestStatus] = item._count;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      data: {
        claims,
        counts: {
          pending: countMap.PENDING || 0,
          approved: countMap.APPROVED || 0,
          rejected: countMap.REJECTED || 0,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN VENUE CLAIMS] Fetch failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load venue claims' }, { status: 500 });
  }
}

const VenueClaimDecisionSchema = z.object({
  venueId: z.string(),
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().max(500).optional(),
});

export async function PUT(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const body = await request.json();
    const validation = VenueClaimDecisionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { venueId, decision, reason } = validation.data;

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        slug: true,
        name: true,
        claimRequestWallet: true,
        claimRequestTag: true,
        claimRequestStatus: true,
      },
    });

    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    if (venue.claimRequestStatus !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'No pending venue claim for this venue' },
        { status: 400 }
      );
    }

    if (!venue.claimRequestWallet || !venue.claimRequestTag) {
      return NextResponse.json(
        { success: false, error: 'Invalid venue claim data' },
        { status: 400 }
      );
    }

    if (decision === 'APPROVE') {
      const updatedVenue = await prisma.venue.update({
        where: { id: venueId },
        data: {
          claimedBy: venue.claimRequestWallet,
          claimedAt: new Date(),
          claimRequestStatus: 'APPROVED',
          moderatorAddress: auth.walletAddress,
          moderatedAt: new Date(),
          moderatorNote: reason || 'Venue claim approved',
        },
        select: {
          id: true,
          slug: true,
          name: true,
          claimedBy: true,
          claimedAt: true,
          claimRequestTag: true,
          claimRequestStatus: true,
        },
      });

      void notifyVenueClaimApproved({
        wallet: venue.claimRequestWallet,
        venueSlug: updatedVenue.slug,
        venueName: updatedVenue.name,
      });

      return NextResponse.json({
        success: true,
        message: `Venue claim approved for ${venue.claimRequestTag}`,
        data: updatedVenue,
      });
    }

    await prisma.venue.update({
      where: { id: venueId },
      data: {
        claimRequestStatus: 'REJECTED',
        moderatorAddress: auth.walletAddress,
        moderatedAt: new Date(),
        moderatorNote: reason || 'Venue claim rejected',
      },
    });

    void notifyVenueClaimRejected({
      wallet: venue.claimRequestWallet,
      venueSlug: venue.slug,
      venueName: venue.name,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: 'Venue claim rejected',
      data: { venueId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN VENUE CLAIMS] Decision failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to process venue claim' }, { status: 500 });
  }
}
