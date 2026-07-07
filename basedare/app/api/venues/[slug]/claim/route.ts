import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { findPrimaryCreatorTagForWallet } from '@/lib/creator-tag-resolver';
import { recordVenueReportEvent } from '@/lib/venue-report-pipeline';
import { notifyVenueClaimSubmitted } from '@/lib/venue-notifications';
import { alertVenueClaimSubmission } from '@/lib/telegram';

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

// Defense-in-depth: bound the (untrusted) query params + slug. No JSON body on this route.
const VenueClaimQuerySchema = z.object({
  reportSource: z.string().max(64).nullish(),
  reportAudience: z.string().max(32).nullish(),
  reportSessionKey: z.string().max(200).nullish(),
});
const SlugSchema = z.string().min(1).max(160);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const queryResult = VenueClaimQuerySchema.safeParse({
      reportSource: request.nextUrl.searchParams.get('reportSource'),
      reportAudience: request.nextUrl.searchParams.get('reportAudience'),
      reportSessionKey: request.nextUrl.searchParams.get('reportSessionKey'),
    });
    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid claim parameters' },
        { status: 400 }
      );
    }
    const reportSource = queryResult.data.reportSource ?? null;
    const reportAudience = queryResult.data.reportAudience === 'sponsor' ? 'sponsor' : 'venue';
    const reportSessionKey = queryResult.data.reportSessionKey ?? null;
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
    if (!SlugSchema.safeParse(slug).success) {
      return NextResponse.json({ success: false, error: 'Invalid venue slug' }, { status: 400 });
    }
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
        if (reportSource === 'venue-report') {
          void recordVenueReportEvent({
            venueId: venue.id,
            audience: reportAudience,
            eventType: 'CLAIM_STARTED',
            sessionKey: reportSessionKey,
            channel: 'venue-claim',
          });
        }
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

    void notifyVenueClaimSubmitted({
      wallet: walletAddress,
      venueSlug: updatedVenue.slug,
      venueName: updatedVenue.name,
    });

    // Admin ping so a moderator can approve/reject straight from Telegram.
    void alertVenueClaimSubmission({
      venueId: updatedVenue.id,
      venueName: updatedVenue.name,
      venueSlug: updatedVenue.slug,
      claimantTag: primaryTag.tag,
      walletAddress,
    }).catch((error) => {
      console.error('[VENUE_CLAIM] Telegram admin alert failed:', error);
    });

    if (reportSource === 'venue-report') {
      void recordVenueReportEvent({
        venueId: venue.id,
        audience: reportAudience,
        eventType: 'CLAIM_STARTED',
        sessionKey: reportSessionKey,
        channel: 'venue-claim',
      });
    }

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
