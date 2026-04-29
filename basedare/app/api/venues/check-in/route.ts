import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { isAddress } from 'viem';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { isInternalApiAuthorized } from '@/lib/api-auth';
import {
  getVenueById,
  hashHandshakeToken,
  validateVenueHandshakeToken,
} from '@/lib/venues';
import { calculateDistance, isValidCoordinates } from '@/lib/geo';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';

const VenueCheckInSchema = z.object({
  venueId: z.string().min(1),
  sessionId: z.string().min(1),
  token: z.string().min(20),
  tag: z.string().trim().max(40).optional(),
  dareId: z.string().trim().min(1).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  walletAddress: z.string().optional(),
});

type WalletSession = {
  token?: string;
  walletAddress?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

function getUtcDayWindow(now: Date) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function getVenueCheckInAuthResource(venueId: string, sessionId: string) {
  return `venue:${venueId}:session:${sessionId}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = VenueCheckInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? 'Invalid request body',
        },
        { status: 400 }
      );
    }

    const isInternalAuthorized = isInternalApiAuthorized(request);
    const session = (await getServerSession(authOptions)) as WalletSession | null;

    if (!session && !isInternalAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Sign in required to check in' },
        { status: 401 }
      );
    }

    let walletAddress = '';
    if (isInternalAuthorized) {
      walletAddress = (parsed.data.walletAddress ?? '').toLowerCase();
      if (!walletAddress || !isAddress(walletAddress)) {
        return NextResponse.json(
          { success: false, error: 'Valid walletAddress is required for internal check-ins' },
          { status: 400 }
        );
      }
    } else {
      const requestedWallet =
        parsed.data.walletAddress ??
        session?.walletAddress ??
        session?.user?.walletAddress ??
        null;
      const authorizedWallet = await getAuthorizedWalletForRequest(request, {
        walletAddress: requestedWallet,
        action: 'venue-check-in',
        resource: getVenueCheckInAuthResource(parsed.data.venueId, parsed.data.sessionId),
      });

      if (!authorizedWallet) {
        return NextResponse.json(
          { success: false, error: 'Wallet authorization required. Connect and sign the venue check-in request.' },
          { status: 401 }
        );
      }

      walletAddress = authorizedWallet;
    }

    const [venue, handshake] = await Promise.all([
      getVenueById(parsed.data.venueId),
      validateVenueHandshakeToken({
        venueId: parsed.data.venueId,
        sessionId: parsed.data.sessionId,
        token: parsed.data.token,
      }),
    ]);

    if (!venue || venue.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Venue not found or inactive' },
        { status: 404 }
      );
    }

    if (!handshake.ok) {
      return NextResponse.json(
        { success: false, error: 'Handshake token is invalid or expired', reason: handshake.reason },
        { status: 401 }
      );
    }

    const gpsProvided = typeof parsed.data.lat === 'number' && typeof parsed.data.lng === 'number';
    let geoDistanceMeters: number | null = null;
    let proofLevel: 'QR_ONLY' | 'QR_AND_GPS' = 'QR_ONLY';

    if (gpsProvided) {
      if (!isValidCoordinates(parsed.data.lat!, parsed.data.lng!)) {
        return NextResponse.json(
          { success: false, error: 'Invalid coordinates' },
          { status: 400 }
        );
      }

      geoDistanceMeters = Math.round(
        calculateDistance(venue.latitude, venue.longitude, parsed.data.lat!, parsed.data.lng!) * 1000
      );

      if (geoDistanceMeters > venue.checkInRadiusMeters) {
        return NextResponse.json(
          {
            success: false,
            error: 'You are outside the venue check-in radius',
            distanceMeters: geoDistanceMeters,
            allowedRadiusMeters: venue.checkInRadiusMeters,
          },
          { status: 403 }
        );
      }

      proofLevel = 'QR_AND_GPS';
    }

    const existingCheckIn = await prisma.venueCheckIn.findFirst({
      where: {
        venueId: venue.id,
        venueSessionId: handshake.session.id,
        walletAddress,
        status: 'CONFIRMED',
        windowStartAt: handshake.windowStartedAt,
      },
      select: { id: true },
    });

    if (existingCheckIn) {
      return NextResponse.json(
        {
          success: false,
          error: 'This check-in window has already been used',
          code: 'REPLAY_BLOCKED',
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const { start: dayStart, end: dayEnd } = getUtcDayWindow(now);

    const result = await prisma.$transaction(async (tx) => {
      const checkIn = await tx.venueCheckIn.create({
        data: {
          venueId: venue.id,
          venueSessionId: handshake.session.id,
          walletAddress,
          tag: parsed.data.tag?.trim() || null,
          dareId: parsed.data.dareId || null,
          status: 'CONFIRMED',
          proofLevel,
          source: 'VENUE_QR',
          qrTokenHash: hashHandshakeToken(parsed.data.token),
          geoDistanceMeters,
          scannedAt: now,
          windowStartAt: handshake.windowStartedAt,
          windowEndAt: handshake.expiresAt,
          metadataJson: {
            internalAuthorized: isInternalAuthorized,
            gpsProvided,
          },
        },
      });

      await tx.venueQrSession.update({
        where: { id: handshake.session.id },
        data: {
          lastCheckInAt: now,
        },
      });

      const [checkInCount, distinctVisitors, venueDareCount, existingMemory] = await Promise.all([
        tx.venueCheckIn.count({
          where: {
            venueId: venue.id,
            status: 'CONFIRMED',
            scannedAt: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        }),
        tx.venueCheckIn.findMany({
          where: {
            venueId: venue.id,
            status: 'CONFIRMED',
            scannedAt: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
          distinct: ['walletAddress'],
          select: { walletAddress: true },
        }),
        tx.dare.count({
          where: { venueId: venue.id },
        }),
        tx.venueMemory.findUnique({
          where: {
            venueId_bucketType_bucketStartAt: {
              venueId: venue.id,
              bucketType: 'DAY',
              bucketStartAt: dayStart,
            },
          },
        }),
      ]);

      const memory = await tx.venueMemory.upsert({
        where: {
          venueId_bucketType_bucketStartAt: {
            venueId: venue.id,
            bucketType: 'DAY',
            bucketStartAt: dayStart,
          },
        },
        update: {
          bucketEndAt: dayEnd,
          checkInCount,
          uniqueVisitorCount: distinctVisitors.length,
          dareCount: venueDareCount,
          topCreatorTag:
            parsed.data.tag?.trim() || existingMemory?.topCreatorTag || null,
          metadataJson: existingMemory?.metadataJson ?? undefined,
        },
        create: {
          venueId: venue.id,
          bucketType: 'DAY',
          bucketStartAt: dayStart,
          bucketEndAt: dayEnd,
          checkInCount,
          uniqueVisitorCount: distinctVisitors.length,
          dareCount: venueDareCount,
          completedDareCount: 0,
          proofCount: 0,
          perkRedemptionCount: 0,
          topCreatorTag: parsed.data.tag?.trim() || null,
          metadataJson: {
            createdBy: 'venue-check-in',
          },
        },
      });

      return { checkIn, memory };
    });

    return NextResponse.json({
      success: true,
      data: {
        checkInId: result.checkIn.id,
        venueId: venue.id,
        venueSlug: venue.slug,
        proofLevel,
        geoDistanceMeters,
        scannedAt: result.checkIn.scannedAt.toISOString(),
        windowEndAt: handshake.expiresAt.toISOString(),
        memory: {
          bucketType: result.memory.bucketType,
          bucketStartAt: result.memory.bucketStartAt.toISOString(),
          bucketEndAt: result.memory.bucketEndAt.toISOString(),
          checkInCount: result.memory.checkInCount,
          uniqueVisitorCount: result.memory.uniqueVisitorCount,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_CHECK_IN] Failed:', message);
    return NextResponse.json(
      { success: false, error: 'Unable to complete venue check-in right now' },
      { status: 500 }
    );
  }
}
