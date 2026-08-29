import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';

import { resolveHostBaretag } from '@/lib/meetups-server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import { BOAT_COMMITMENTS, SURF_ABILITY_LANES, getBoatCrewSharePath } from '@/lib/surf-boat-board';
import { createWalletNotification } from '@/lib/notifications';
import { applyJourneyCookie } from '@/lib/creator-attribution-server';
import { LIVE_PLAN_JOINED_EVENT } from '@/lib/live-plan-retention';
import { recordLivePlanJourneyEvent } from '@/lib/live-plan-retention-server';
import { syncLivePlanCrewRoom } from '@/lib/live-plan-room-server';

const MembershipSchema = z.object({
  walletAddress: z.string().refine((value) => isAddress(value), 'Valid wallet required').optional(),
  commitment: z.enum([...BOAT_COMMITMENTS, 'LEAVE']),
  abilityLane: z.enum(SURF_ABILITY_LANES.map((option) => option.value) as [string, ...string[]]),
  needsBoard: z.boolean().default(false),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const rateLimit = checkRateLimit(getClientIp(request), {
    limit: 20,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'boat-crew-membership',
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many crew changes. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) },
    );
  }

  try {
    const parsed = MembershipSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid crew choice.' },
        { status: 400 },
      );
    }
    const input = parsed.data;
    const baretag = await resolveHostBaretag(request, input.walletAddress ?? null, {
      action: 'boat-crew:membership',
      resource: `crew:${id}`,
    });
    if (!baretag) {
      return NextResponse.json({ success: false, error: 'Claim a Baretag to join this crew.' }, { status: 401 });
    }

    const transition = await prisma.$transaction(async (tx) => {
      const crew = await tx.surfBoatCrew.findUnique({
        where: { id },
        include: { members: true },
      });
      if (!crew || crew.status === 'CANCELLED' || crew.expiresAt <= new Date()) throw new Error('CREW_CLOSED');
      if (crew.operatorConfirmedDepartureAt && crew.operatorConfirmedDepartureAt <= new Date()) {
        throw new Error('CREW_DEPARTED');
      }
      if (input.commitment !== 'LEAVE' && input.abilityLane !== crew.abilityLane) {
        throw new Error('ABILITY_MISMATCH');
      }
      const existing = crew.members.find((member) => member.baretagId === baretag.id);
      const wasConfirmed = existing?.commitment === 'CONFIRMED';
      const willBeConfirmed = input.commitment === 'CONFIRMED';
      const otherConfirmed = crew.members.filter(
        (member) => member.baretagId !== baretag.id && member.commitment === 'CONFIRMED',
      ).length;
      if (willBeConfirmed) {
        const otherCrewSeat = await tx.surfBoatCrewMember.findFirst({
          where: {
            baretagId: baretag.id,
            commitment: 'CONFIRMED',
            crewId: { not: id },
            crew: {
              departureDay: crew.departureDay,
              status: { not: 'CANCELLED' },
              expiresAt: { gt: new Date() },
            },
          },
          select: { id: true },
        });
        if (otherCrewSeat) throw new Error('ALREADY_CONFIRMED_TODAY');
      }
      if (
        willBeConfirmed &&
        crew.operatorConfirmedCapacity &&
        otherConfirmed + 1 > crew.operatorConfirmedCapacity
      ) {
        throw new Error('CREW_FULL');
      }

      if (input.commitment === 'LEAVE') {
        await tx.surfBoatCrewMember.deleteMany({ where: { crewId: id, baretagId: baretag.id } });
      } else {
        await tx.surfBoatCrewMember.upsert({
          where: { crewId_baretagId: { crewId: id, baretagId: baretag.id } },
          create: {
            crewId: id,
            baretagId: baretag.id,
            commitment: input.commitment,
            abilityLane: input.abilityLane,
            needsBoard: input.needsBoard,
          },
          update: {
            commitment: input.commitment,
            abilityLane: input.abilityLane,
            needsBoard: input.needsBoard,
            acceptedTermsVersion: null,
          },
        });
      }

      const confirmedCount = otherConfirmed + (willBeConfirmed ? 1 : 0);
      const confirmationChanged = Boolean(crew.operatorConfirmedAt) && wasConfirmed !== willBeConfirmed;
      const nextTermsVersion = confirmationChanged ? crew.termsVersion + 1 : crew.termsVersion;
      if (confirmationChanged) {
        await tx.surfBoatCrewMember.updateMany({
          where: { crewId: id },
          data: { acceptedTermsVersion: null },
        });
      }
      const nextStatus =
        confirmedCount < crew.minimumCrew
          ? 'FORMING'
          : crew.operatorConfirmedAt
            ? !confirmationChanged &&
              crew.members.filter(
                (member) =>
                  member.baretagId !== baretag.id &&
                  member.commitment === 'CONFIRMED' &&
                  member.acceptedTermsVersion === crew.termsVersion,
              ).length === confirmedCount
              ? 'READY'
              : 'OPERATOR_CONFIRMED'
            : 'AWAITING_OPERATOR';
      await tx.surfBoatCrew.update({
        where: { id },
        data: { status: nextStatus, termsVersion: nextTermsVersion },
      });
      return {
        venueId: crew.venueId,
        creatorBaretagId: crew.creatorBaretagId,
        joinedConfirmedNow: !wasConfirmed && willBeConfirmed,
        reachedMinimum:
          crew.members.filter((member) => member.commitment === 'CONFIRMED').length < crew.minimumCrew &&
          confirmedCount >= crew.minimumCrew,
      };
    });

    if (transition.reachedMinimum) {
      const organizer = await prisma.streamerTag.findUnique({
        where: { id: transition.creatorBaretagId },
        select: { walletAddress: true },
      });
      await createWalletNotification({
        wallet: organizer?.walletAddress,
        type: 'BOAT_CREW_READY_FOR_OPERATOR',
        title: 'Your surf crew reached 4/4',
        message: 'Open the crew and send the private confirmation link to the real boat operator.',
        link: getBoatCrewSharePath(id),
      }).catch((error) => console.error('[BOAT_CREW_MEMBERSHIP] threshold notification failed:', error));
    }

    await syncLivePlanCrewRoom('boat', id).catch((error) => {
      console.error('[BOAT_CREW_MEMBERSHIP] Crew Room sync failed:', error);
    });

    let journeyToken: string | null = null;
    if (transition.joinedConfirmedNow) {
      try {
        const attribution = await recordLivePlanJourneyEvent(request, {
          eventType: LIVE_PLAN_JOINED_EVENT,
          planType: 'boat',
          planId: id,
          venueId: transition.venueId,
          baretagId: baretag.id,
          metadata: {
            source: 'boat_crew_membership',
            reachedMinimum: transition.reachedMinimum,
          },
        });
        journeyToken = attribution.journeyToken;
      } catch (error) {
        console.error('[BOAT_CREW_MEMBERSHIP] join attribution failed:', error);
      }
    }

    const response = NextResponse.json({
      success: true,
      data: {
        joinedConfirmedNow: transition.joinedConfirmedNow,
        reachedMinimum: transition.reachedMinimum,
      },
    });
    if (journeyToken) applyJourneyCookie(response, journeyToken);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const known: Record<string, [string, number]> = {
      CREW_CLOSED: ['This boat call is closed.', 410],
      CREW_DEPARTED: ['This boat has already departed.', 410],
      ABILITY_MISMATCH: ['Choose a crew in your ability lane.', 409],
      CREW_FULL: ['The operator has no more confirmed seats.', 409],
      ALREADY_CONFIRMED_TODAY: ['You already confirmed another boat crew for that day.', 409],
    };
    const response = known[message];
    if (response) return NextResponse.json({ success: false, error: response[0] }, { status: response[1] });
    console.error('[BOAT_CREW_MEMBERSHIP] failed:', error);
    return NextResponse.json({ success: false, error: 'Could not update this crew.' }, { status: 500 });
  }
}
