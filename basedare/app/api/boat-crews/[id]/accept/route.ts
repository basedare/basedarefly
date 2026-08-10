import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';

import { resolveHostBaretag } from '@/lib/meetups-server';
import { prisma } from '@/lib/prisma';
import { createWalletNotification } from '@/lib/notifications';

const AcceptSchema = z.object({
  walletAddress: z.string().refine((value) => isAddress(value), 'Valid wallet required').optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const parsed = AcceptSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Valid wallet required.' }, { status: 400 });
    const baretag = await resolveHostBaretag(request, parsed.data.walletAddress ?? null, {
      action: 'boat-crew:accept',
      resource: `crew:${id}`,
    });
    if (!baretag) return NextResponse.json({ success: false, error: 'Crew authorization required.' }, { status: 401 });

    const acceptance = await prisma.$transaction(async (tx) => {
      const crew = await tx.surfBoatCrew.findUnique({
        where: { id },
        include: { members: true },
      });
      if (!crew?.operatorConfirmedAt || !crew.termsVersion || crew.expiresAt <= new Date()) {
        throw new Error('DETAILS_UNAVAILABLE');
      }
      const member = crew.members.find(
        (candidate) => candidate.baretagId === baretag.id && candidate.commitment === 'CONFIRMED',
      );
      if (!member) throw new Error('NOT_CONFIRMED');
      await tx.surfBoatCrewMember.update({
        where: { id: member.id },
        data: { acceptedTermsVersion: crew.termsVersion },
      });
      const confirmedCount = crew.members.filter((candidate) => candidate.commitment === 'CONFIRMED').length;
      const acceptedCount =
        crew.members.filter(
          (candidate) =>
            candidate.commitment === 'CONFIRMED' &&
            (candidate.id === member.id || candidate.acceptedTermsVersion === crew.termsVersion),
        ).length;
      const isReady = confirmedCount >= crew.minimumCrew && acceptedCount === confirmedCount;
      if (isReady) await tx.surfBoatCrew.update({ where: { id }, data: { status: 'READY' } });
      return {
        ready: isReady,
        memberBaretagIds: isReady
          ? crew.members
              .filter((candidate) => candidate.commitment === 'CONFIRMED')
              .map((candidate) => candidate.baretagId)
          : [],
      };
    });

    if (acceptance.ready) {
      const wallets = await prisma.streamerTag.findMany({
        where: { id: { in: acceptance.memberBaretagIds } },
        select: { walletAddress: true },
      });
      await Promise.allSettled(
        [...new Set(wallets.map((entry) => entry.walletAddress.toLowerCase()))].map((wallet) =>
          createWalletNotification({
            wallet,
            type: 'BOAT_CREW_READY',
            title: 'Boat crew ready',
            message: 'Everyone accepted the final boat details. See you at Kanaway.',
            link: '/community/boat/kanaway',
          }),
        ),
      );
    }

    return NextResponse.json({ success: true, data: { ready: acceptance.ready } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'DETAILS_UNAVAILABLE') {
      return NextResponse.json({ success: false, error: 'Final boat details are not open for acceptance.' }, { status: 409 });
    }
    if (message === 'NOT_CONFIRMED') {
      return NextResponse.json({ success: false, error: 'Confirm your seat before accepting boat details.' }, { status: 403 });
    }
    console.error('[BOAT_CREW_ACCEPT] failed:', error);
    return NextResponse.json({ success: false, error: 'Could not accept the boat details.' }, { status: 500 });
  }
}
