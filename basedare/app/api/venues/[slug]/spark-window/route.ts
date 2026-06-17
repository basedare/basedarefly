import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/lib/auth-options';
import { writeFirstSparkWindowToMetadata } from '@/lib/first-spark-window';
import { prisma } from '@/lib/prisma';
import { resolveVenueRole } from '@/lib/venue-role';

type VenueSparkWindowSession = {
  token?: string;
  walletAddress?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

const OptionalDateTimeSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().datetime().nullable().optional()
);

const VenueSparkWindowSchema = z.object({
  enabled: z.boolean().default(true),
  windowLabel: z.string().trim().min(1).max(80),
  perkLabel: z.string().trim().min(1).max(80),
  targetLabel: z.string().trim().max(72).optional().nullable(),
  targetCheckIns: z.number().int().min(1).max(500).default(20),
  startsAt: OptionalDateTimeSchema,
  endsAt: OptionalDateTimeSchema,
});

function getSessionWallet(session: VenueSparkWindowSession | null) {
  return (session?.walletAddress ?? session?.user?.walletAddress ?? '').trim().toLowerCase();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as VenueSparkWindowSession | null;
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sign in required to edit First Spark Window' }, { status: 401 });
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
    const parsed = VenueSparkWindowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid First Spark Window' }, { status: 400 });
    }

    const startsAt = parsed.data.startsAt ?? null;
    const endsAt = parsed.data.endsAt ?? null;
    if (startsAt && endsAt && new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
      return NextResponse.json({ success: false, error: 'End time must be after start time' }, { status: 400 });
    }

    const { slug } = await params;
    const venue = await prisma.venue.findUnique({
      where: { slug },
      select: {
        id: true,
        claimedBy: true,
        metadataJson: true,
      },
    });

    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    // Claim-by-presence: the verified owner OR a provisional host (on-site
    // QR+GPS check-in + venue reputation, on an unclaimed venue) can run the
    // tonight loop. Running a Spark Window is a lightweight host power — not
    // profile/QR/money, which stay owner-only.
    const venueRole = await resolveVenueRole(walletAddress, venue.id);
    if (venueRole.role !== 'verified_owner' && venueRole.role !== 'provisional_host') {
      return NextResponse.json(
        {
          success: false,
          error:
            'To run a Spark Window here, check in on-site (QR + GPS) and build a little venue reputation — or claim the venue.',
        },
        { status: 403 }
      );
    }

    const { metadata, firstSparkWindow } = writeFirstSparkWindowToMetadata(venue.metadataJson, {
      ...parsed.data,
      startsAt,
      endsAt,
    });

    await prisma.venue.update({
      where: { id: venue.id },
      data: {
        metadataJson: metadata as Prisma.InputJsonObject,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        firstSparkWindow,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_SPARK_WINDOW] Update failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to update First Spark Window' }, { status: 500 });
  }
}
