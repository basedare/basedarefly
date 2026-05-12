import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth-options';
import { isInternalApiAuthorized } from '@/lib/api-auth';
import { recordFounderEventSafe } from '@/lib/founder-events';
import { prisma } from '@/lib/prisma';
import {
  getVenuePerkSnapshot,
  markVenuePerkRedeemedInMetadata,
} from '@/lib/venue-perks';

type VenuePerkRedeemSession = {
  token?: string;
  walletAddress?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

function getSessionWallet(session: VenuePerkRedeemSession | null) {
  return (session?.walletAddress ?? session?.user?.walletAddress ?? '').trim().toLowerCase();
}

function getUtcDayWindow(now: Date) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isInternalAuthorized = isInternalApiAuthorized(request);
    const session = (await getServerSession(authOptions)) as VenuePerkRedeemSession | null;

    if (!session && !isInternalAuthorized) {
      return NextResponse.json({ success: false, error: 'Sign in required to redeem venue perks' }, { status: 401 });
    }

    const sessionToken = session?.token?.trim();
    const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (!isInternalAuthorized && sessionToken && (!bearerToken || bearerToken !== sessionToken)) {
      return NextResponse.json({ success: false, error: 'Invalid session token' }, { status: 401 });
    }

    const walletAddress = getSessionWallet(session);
    const { id } = await params;
    const checkIn = await prisma.venueCheckIn.findUnique({
      where: { id },
      select: {
        id: true,
        scannedAt: true,
        metadataJson: true,
        venue: {
          select: {
            id: true,
            slug: true,
            name: true,
            claimedBy: true,
          },
        },
      },
    });

    if (!checkIn) {
      return NextResponse.json({ success: false, error: 'Check-in not found' }, { status: 404 });
    }

    if (!isInternalAuthorized && (!walletAddress || checkIn.venue.claimedBy?.toLowerCase() !== walletAddress)) {
      return NextResponse.json({ success: false, error: 'Only the claimed venue wallet can redeem this perk' }, { status: 403 });
    }

    const existingPerk = getVenuePerkSnapshot(checkIn.metadataJson);
    if (!existingPerk) {
      return NextResponse.json({ success: false, error: 'This check-in did not unlock a venue perk' }, { status: 404 });
    }

    if (!existingPerk.redeemedAt && new Date(existingPerk.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ success: false, error: 'This venue perk has expired' }, { status: 409 });
    }

    if (existingPerk.redeemedAt) {
      return NextResponse.json({
        success: true,
        data: {
          perk: existingPerk,
        },
      });
    }

    const redeemedAt = new Date();
    const { metadata, perk } = markVenuePerkRedeemedInMetadata(checkIn.metadataJson, {
      redeemedAt,
      redeemedBy: isInternalAuthorized ? 'internal' : walletAddress,
    });

    if (!perk) {
      return NextResponse.json({ success: false, error: 'This check-in did not unlock a venue perk' }, { status: 404 });
    }

    const { start: dayStart, end: dayEnd } = getUtcDayWindow(checkIn.scannedAt);

    await prisma.$transaction(async (tx) => {
      await tx.venueCheckIn.update({
        where: { id: checkIn.id },
        data: {
          metadataJson: metadata as Prisma.InputJsonObject,
        },
      });

      await tx.venueMemory.upsert({
        where: {
          venueId_bucketType_bucketStartAt: {
            venueId: checkIn.venue.id,
            bucketType: 'DAY',
            bucketStartAt: dayStart,
          },
        },
        update: {
          bucketEndAt: dayEnd,
          perkRedemptionCount: { increment: 1 },
        },
        create: {
          venueId: checkIn.venue.id,
          bucketType: 'DAY',
          bucketStartAt: dayStart,
          bucketEndAt: dayEnd,
          checkInCount: 0,
          uniqueVisitorCount: 0,
          dareCount: 0,
          completedDareCount: 0,
          proofCount: 0,
          perkRedemptionCount: 1,
          metadataJson: {
            createdBy: 'venue-perk-redemption',
          },
        },
      });
    });

    await recordFounderEventSafe({
      eventType: 'venue_check_in',
      source: 'venue-perk-redeem',
      subjectType: 'VenueCheckIn',
      subjectId: checkIn.id,
      dedupeKey: `venue-perk-redeemed-${checkIn.id}`,
      title: checkIn.venue.name,
      status: 'REDEEMED',
      actor: isInternalAuthorized ? 'internal' : walletAddress,
      href: `/venues/${checkIn.venue.slug}/console`,
      venueId: checkIn.venue.id,
      venueSlug: checkIn.venue.slug,
      metadata: {
        perkTitle: perk.title,
        redemptionCode: perk.redemptionCode,
      },
      occurredAt: redeemedAt,
    });

    return NextResponse.json({
      success: true,
      data: {
        perk,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_PERK_REDEEM] Failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to redeem venue perk' }, { status: 500 });
  }
}
