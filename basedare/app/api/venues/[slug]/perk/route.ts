import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { writeVenuePerkToMetadata } from '@/lib/venue-perks';
import { normalizeVenuePerk } from '@/lib/venue-perks';

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
  quantityLimit: z.number().int().min(1).max(1000).optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  conditions: z.string().trim().max(300).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.enabled && (!data.quantityLimit || !data.startsAt || !data.endsAt || !data.conditions?.trim())) ctx.addIssue({ code: 'custom', message: 'A live offer needs a quantity, start/end time and clear activity or purchase requirements.' });
  if (data.startsAt && data.endsAt && Date.parse(data.endsAt) <= Date.parse(data.startsAt)) ctx.addIssue({ code: 'custom', message: 'Offer end must be after its start.' });
  if (data.enabled && data.endsAt && Date.parse(data.endsAt) <= Date.now()) ctx.addIssue({ code: 'custom', message: 'The offer has already ended.' });
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

    const perk = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Venue" WHERE id = ${venue.id} FOR UPDATE`;
      const latest = await tx.venue.findUniqueOrThrow({ where: { id: venue.id }, select: { metadataJson: true, claimedBy: true } });
      if (latest.claimedBy?.toLowerCase() !== walletAddress) throw new Error('Venue ownership changed. Refresh and try again.');
      const root = (latest.metadataJson && typeof latest.metadataJson === 'object' && !Array.isArray(latest.metadataJson) ? latest.metadataJson : {}) as Record<string, unknown>;
      const previous = normalizeVenuePerk(root.venuePerk);
      const newWindow = previous?.endsAt && Date.parse(previous.endsAt) <= Date.now() && parsed.data.startsAt && Date.parse(parsed.data.startsAt) >= Date.parse(previous.endsAt);
      const { metadata, perk } = writeVenuePerkToMetadata(latest.metadataJson, { ...parsed.data, offerId: newWindow ? randomUUID() : previous?.offerId || randomUUID() });
      await tx.venue.update({ where: { id: venue.id }, data: { metadataJson: metadata as Prisma.InputJsonObject } });
      return perk;
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
