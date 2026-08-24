import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { isMeetupExpired } from '@/lib/meetups';
import { resolveHostBaretag } from '@/lib/meetups-server';
import { createWalletNotification } from '@/lib/notifications';
import { didMeetupJustUnlock, getMeetupSharePath } from '@/lib/meetup-plan';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const RsvpSchema = z.object({
  walletAddress: z.string().refine((value) => isAddress(value), 'Valid wallet required').optional(),
});

async function withSerializableRetry<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new Error('MEETUP_RSVP_RETRY_EXHAUSTED');
}

// POST /api/meetups/[id]/rsvp — Baretag-gated, idempotent RSVP. No value released.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rateLimit = checkRateLimit(getClientIp(request), {
    limit: 30,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'meetup-rsvp',
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many RSVP attempts. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  const parsed = RsvpSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Valid wallet required.' }, { status: 400 });
  }
  const baretag = await resolveHostBaretag(request, parsed.data.walletAddress ?? null, {
    action: 'meetup:rsvp',
    resource: `meetup:${id}`,
  });
  if (!baretag) {
    return NextResponse.json(
      { success: false, error: 'Claim and verify a Baretag to RSVP.' },
      { status: 401 }
    );
  }

  try {
    const result = await withSerializableRetry(async (tx) => {
      const meetup = await tx.meetup.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          placeLabel: true,
          creatorBaretagId: true,
          minimumPeople: true,
          status: true,
          startTime: true,
        },
      });
      if (!meetup) throw new Error('MEETUP_NOT_FOUND');
      if (meetup.status !== 'active') throw new Error('MEETUP_INACTIVE');
      if (isMeetupExpired(meetup.startTime)) throw new Error('MEETUP_ENDED');

      const created = await tx.meetupRsvp.createMany({
        data: [{ meetupId: id, baretagId: baretag.id }],
        skipDuplicates: true,
      });
      const count = await tx.meetupRsvp.count({ where: { meetupId: id } });
      const joinedNow = created.count > 0;
      const unlockedNow = joinedNow && didMeetupJustUnlock({
        previousCount: count - created.count,
        nextCount: count,
        minimumPeople: meetup.minimumPeople,
      });
      const participantBaretagIds = unlockedNow
        ? (await tx.meetupRsvp.findMany({
            where: { meetupId: id },
            select: { baretagId: true },
          })).map((rsvp) => rsvp.baretagId)
        : [];
      return { meetup, count, joinedNow, unlockedNow, participantBaretagIds };
    });

    if (result.unlockedNow) {
      const crew = await prisma.streamerTag.findMany({
        where: {
          id: { in: result.participantBaretagIds, not: baretag.id },
        },
        select: { walletAddress: true },
      });
      await Promise.allSettled(crew.map((member) => createWalletNotification({
        wallet: member.walletAddress,
        type: 'MEETUP_CREW_UNLOCKED',
        title: 'Crew unlocked',
        message: `${result.meetup.title} has ${result.count} confirmed.`,
        link: getMeetupSharePath(id),
      })));
    } else if (result.joinedNow && result.meetup.creatorBaretagId !== baretag.id) {
      const creator = await prisma.streamerTag.findUnique({
        where: { id: result.meetup.creatorBaretagId },
        select: { walletAddress: true },
      });
      await createWalletNotification({
        wallet: creator?.walletAddress,
        type: 'MEETUP_RSVP',
        title: `${baretag.tag} is in`,
        message: `${result.meetup.placeLabel} now has ${result.count} going.`,
        link: getMeetupSharePath(id),
      }).catch((error) => console.error('[MEETUPS] RSVP notification failed:', error));
    }

    const count = result.count;
    return NextResponse.json({
      success: true,
      data: { rsvped: true, count, unlockedNow: result.unlockedNow },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'MEETUP_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Meetup not found' }, { status: 404 });
    }
    if (code === 'MEETUP_INACTIVE') {
      return NextResponse.json({ success: false, error: 'Meetup is not active' }, { status: 400 });
    }
    if (code === 'MEETUP_ENDED') {
      return NextResponse.json({ success: false, error: 'This meetup has ended.' }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MEETUPS] RSVP failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to RSVP' }, { status: 500 });
  }
}

// DELETE /api/meetups/[id]/rsvp — signed, idempotent withdrawal. Hosts keep
// their own RSVP while the plan is live; cancelling the plan is a separate act.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rateLimit = checkRateLimit(getClientIp(request), {
    limit: 30,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'meetup-rsvp-withdraw',
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many RSVP changes. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) },
    );
  }

  const parsed = RsvpSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Valid wallet required.' }, { status: 400 });
  }
  const baretag = await resolveHostBaretag(request, parsed.data.walletAddress ?? null, {
    action: 'meetup:rsvp:withdraw',
    resource: `meetup:${id}`,
  });
  if (!baretag) {
    return NextResponse.json(
      { success: false, error: 'Sign in with the identity that joined this plan.' },
      { status: 401 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const meetup = await tx.meetup.findUnique({
        where: { id },
        select: { creatorBaretagId: true },
      });
      if (!meetup) throw new Error('MEETUP_NOT_FOUND');
      if (meetup.creatorBaretagId === baretag.id) throw new Error('MEETUP_HOST');
      await tx.meetupRsvp.deleteMany({ where: { meetupId: id, baretagId: baretag.id } });
      const count = await tx.meetupRsvp.count({ where: { meetupId: id } });
      return { count };
    });
    return NextResponse.json({ success: true, data: { rsvped: false, count: result.count } });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'MEETUP_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Meetup not found' }, { status: 404 });
    }
    if (code === 'MEETUP_HOST') {
      return NextResponse.json(
        { success: false, error: 'The Rally host stays in until the plan is cancelled.' },
        { status: 400 },
      );
    }
    console.error('[MEETUPS] RSVP withdrawal failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to leave this plan' }, { status: 500 });
  }
}
