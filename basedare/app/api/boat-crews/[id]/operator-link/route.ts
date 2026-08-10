import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';

import { resolveHostBaretag } from '@/lib/meetups-server';
import { prisma } from '@/lib/prisma';
import { createOperatorToken } from '@/lib/surf-boat-board-server';

const OperatorLinkSchema = z.object({
  walletAddress: z.string().refine((value) => isAddress(value), 'Valid wallet required').optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const parsed = OperatorLinkSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Valid wallet required.' }, { status: 400 });
    }
    const baretag = await resolveHostBaretag(request, parsed.data.walletAddress ?? null, {
      action: 'boat-crew:operator-link',
      resource: `crew:${id}`,
    });
    if (!baretag) return NextResponse.json({ success: false, error: 'Organizer authorization required.' }, { status: 401 });
    const crew = await prisma.surfBoatCrew.findUnique({
      where: { id },
      include: { members: { where: { commitment: 'CONFIRMED' }, select: { id: true } } },
    });
    if (!crew || crew.creatorBaretagId !== baretag.id) {
      return NextResponse.json({ success: false, error: 'Only the organizer can contact the operator.' }, { status: 403 });
    }
    if (crew.members.length < crew.minimumCrew) {
      return NextResponse.json({ success: false, error: `Confirm ${crew.minimumCrew} surfers first.` }, { status: 409 });
    }
    if (crew.operatorConfirmedAt || crew.expiresAt <= new Date()) {
      return NextResponse.json({ success: false, error: 'Operator confirmation is closed.' }, { status: 409 });
    }
    const { token, hash } = createOperatorToken();
    const expiresAt = new Date(Math.min(Date.now() + 2 * 60 * 60 * 1000, crew.expiresAt.getTime()));
    await prisma.surfBoatCrew.update({
      where: { id },
      data: {
        status: 'AWAITING_OPERATOR',
        operatorTokenHash: hash,
        operatorTokenExpiresAt: expiresAt,
      },
    });
    return NextResponse.json({
      success: true,
      data: {
        operatorUrl: `${request.nextUrl.origin}/community/boat/${encodeURIComponent(id)}/operator?token=${encodeURIComponent(token)}`,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[BOAT_OPERATOR_LINK] failed:', error);
    return NextResponse.json({ success: false, error: 'Could not create the operator link.' }, { status: 500 });
  }
}
