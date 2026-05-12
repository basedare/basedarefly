import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { writeVenuePerkToMetadata } from '@/lib/venue-perks';

type VenuePerkSession = {
  token?: string;
  walletAddress?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

const VenuePerkSchema = z.object({
  enabled: z.boolean().default(true),
  title: z.string().trim().max(80),
  description: z.string().trim().max(180).optional().nullable(),
  staffInstructions: z.string().trim().max(180).optional().nullable(),
  expiresInHours: z.number().int().min(1).max(24).optional().default(12),
});

function getSessionWallet(session: VenuePerkSession | null) {
  return (session?.walletAddress ?? session?.user?.walletAddress ?? '').trim().toLowerCase();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as VenuePerkSession | null;
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sign in required to edit venue perks' }, { status: 401 });
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
    const parsed = VenuePerkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid venue perk' }, { status: 400 });
    }

    if (parsed.data.enabled && !parsed.data.title.trim()) {
      return NextResponse.json({ success: false, error: 'A live perk needs a title' }, { status: 400 });
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

    if (!venue.claimedBy || venue.claimedBy.toLowerCase() !== walletAddress) {
      return NextResponse.json({ success: false, error: 'Only the claimed venue wallet can edit perks' }, { status: 403 });
    }

    const { metadata, perk } = writeVenuePerkToMetadata(venue.metadataJson, parsed.data);

    await prisma.venue.update({
      where: { id: venue.id },
      data: {
        metadataJson: metadata as Prisma.InputJsonObject,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        perk,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_PERK] Update failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to update venue perk' }, { status: 500 });
  }
}
