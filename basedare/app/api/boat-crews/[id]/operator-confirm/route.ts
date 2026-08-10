import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import { OPERATOR_DESTINATIONS, getManilaDay } from '@/lib/surf-boat-board';
import { hashOperatorToken, operatorTokenMatches } from '@/lib/surf-boat-board-server';
import { createWalletNotification } from '@/lib/notifications';

const OperatorConfirmationSchema = z.object({
  token: z.string().min(20).max(200),
  operatorName: z.string().trim().min(2).max(80),
  destination: z.enum(OPERATOR_DESTINATIONS.map((option) => option.value) as [string, ...string[]]),
  totalPhp: z.number().int().min(1).max(50_000),
  capacity: z.number().int().min(4).max(12),
  departureAt: z.string().datetime(),
  note: z.string().trim().max(240).optional(),
  acknowledgment: z.literal(true),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const rateLimit = checkRateLimit(getClientIp(request), {
    limit: 12,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'boat-operator-confirm',
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many confirmation attempts.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) },
    );
  }

  try {
    const parsed = OperatorConfirmationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid confirmation.' },
        { status: 400 },
      );
    }
    const input = parsed.data;
    const now = new Date();
    const departureAt = new Date(input.departureAt);
    const crew = await prisma.surfBoatCrew.findUnique({
      where: { id },
      include: { members: { where: { commitment: 'CONFIRMED' }, select: { id: true } } },
    });
    if (
      !crew ||
      !operatorTokenMatches(input.token, crew.operatorTokenHash) ||
      !crew.operatorTokenExpiresAt ||
      crew.operatorTokenExpiresAt <= now
    ) {
      return NextResponse.json({ success: false, error: 'This operator link is invalid or expired.' }, { status: 410 });
    }
    if (crew.members.length < crew.minimumCrew) {
      return NextResponse.json({ success: false, error: 'The crew is no longer large enough.' }, { status: 409 });
    }
    if (
      departureAt <= now ||
      departureAt >= crew.expiresAt ||
      getManilaDay(departureAt) !== crew.departureDay
    ) {
      return NextResponse.json({ success: false, error: 'Departure must be a future time on the selected day.' }, { status: 400 });
    }
    if (input.capacity < crew.members.length) {
      return NextResponse.json({ success: false, error: 'Capacity cannot be smaller than the confirmed crew.' }, { status: 409 });
    }

    const tokenHash = hashOperatorToken(input.token);
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.surfBoatCrew.updateMany({
        where: {
          id,
          operatorTokenHash: tokenHash,
          operatorTokenExpiresAt: { gt: now },
          operatorConfirmedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          status: 'OPERATOR_CONFIRMED',
          operatorName: input.operatorName,
          operatorConfirmedDestination: input.destination,
          operatorConfirmedTotalPhp: input.totalPhp,
          operatorConfirmedCapacity: input.capacity,
          operatorConfirmedDepartureAt: departureAt,
          operatorNote: input.note || null,
          operatorConfirmedAt: now,
          operatorTokenHash: null,
          operatorTokenExpiresAt: null,
          termsVersion: { increment: 1 },
        },
      });
      if (result.count !== 1) return false;
      await tx.surfBoatCrewMember.updateMany({
        where: { crewId: id },
        data: { acceptedTermsVersion: null },
      });
      return true;
    });
    if (!updated) {
      return NextResponse.json({ success: false, error: 'This link was already used or the crew changed.' }, { status: 409 });
    }

    const memberTags = await prisma.surfBoatCrewMember.findMany({
      where: { crewId: id, commitment: 'CONFIRMED' },
      select: { baretagId: true },
    });
    const wallets = await prisma.streamerTag.findMany({
      where: { id: { in: memberTags.map((member) => member.baretagId) } },
      select: { walletAddress: true },
    });
    await Promise.allSettled(
      [...new Set(wallets.map((entry) => entry.walletAddress.toLowerCase()))].map((wallet) =>
        createWalletNotification({
          wallet,
          type: 'BOAT_DETAILS_CONFIRMED',
          title: 'Your surf boat is confirmed',
          message: `${input.operatorName} confirmed ${input.destination}, ₱${input.totalPhp} total. Accept the final details before departure.`,
          link: '/community/boat/kanaway',
        }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[BOAT_OPERATOR_CONFIRM] failed:', error);
    return NextResponse.json({ success: false, error: 'Could not confirm these boat details.' }, { status: 500 });
  }
}
