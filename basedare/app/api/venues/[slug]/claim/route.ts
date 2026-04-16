import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { findPrimaryCreatorTagForWallet } from '@/lib/creator-tag-resolver';

type ClaimSession = {
  token?: string;
  walletAddress?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

function getSessionWallet(session: ClaimSession | null) {
  return (session?.walletAddress ?? session?.user?.walletAddress ?? '').trim().toLowerCase();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as ClaimSession | null;
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sign in required to claim a venue' }, { status: 401 });
    }

    const sessionToken = session?.token?.trim();
    const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (sessionToken && (!bearerToken || bearerToken !== sessionToken)) {
      return NextResponse.json({ success: false, error: 'Invalid session token' }, { status: 401 });
    }

    const walletAddress = getSessionWallet(session);
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet session is missing. Reconnect and try again.' },
        { status: 401 }
      );
    }

    const primaryTag = await findPrimaryCreatorTagForWallet(walletAddress);
    if (!primaryTag?.tag) {
      return NextResponse.json(
        { success: false, error: 'Claim and verify your creator tag before claiming a venue.' },
        { status: 400 }
      );
    }

    const { slug } = await params;
    const venue = await prisma.venue.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        claimedBy: true,
        claimRequestWallet: true,
        claimRequestTag: true,
        claimRequestStatus: true,
      },
    });

    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    if (venue.claimedBy) {
      return NextResponse.json(
        { success: false, error: 'This venue is already managed.' },
        { status: 409 }
      );
    }

    if (venue.claimRequestStatus === 'PENDING') {
      if (venue.claimRequestWallet === walletAddress) {
        return NextResponse.json({
          success: true,
          message: 'Your venue claim is already pending moderator review.',
          data: {
            venueId: venue.id,
            slug: venue.slug,
            name: venue.name,
            claimRequestTag: venue.claimRequestTag,
            claimRequestStatus: venue.claimRequestStatus,
          },
        });
      }

      return NextResponse.json(
        { success: false, error: 'This venue already has a pending claim request.' },
        { status: 409 }
      );
    }

    const updatedVenue = await prisma.venue.update({
      where: { id: venue.id },
      data: {
        claimRequestWallet: walletAddress,
        claimRequestTag: primaryTag.tag,
        claimRequestedAt: new Date(),
        claimRequestStatus: 'PENDING',
      },
      select: {
        id: true,
        slug: true,
        name: true,
        claimRequestTag: true,
        claimRequestStatus: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Venue claim submitted. A moderator will review it shortly.',
      data: updatedVenue,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_CLAIM] Submission failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to submit venue claim' }, { status: 500 });
  }
}
