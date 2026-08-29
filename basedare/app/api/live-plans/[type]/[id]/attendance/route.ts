import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { z } from 'zod';

import { applyJourneyCookie } from '@/lib/creator-attribution-server';
import { LIVE_PLAN_ATTENDANCE_EVENT, type AttendancePlanType } from '@/lib/live-plan-retention';
import { getAttendanceCount, recordLivePlanJourneyEvent } from '@/lib/live-plan-retention-server';
import { resolveHostBaretag } from '@/lib/meetups-server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const AttendanceSchema = z.object({
  walletAddress: z.string().refine((value) => isAddress(value), 'Valid wallet required').optional(),
});

async function assertParticipantCanConfirm(type: AttendancePlanType, id: string, baretagId: string, now: Date) {
  if (type === 'meetup') {
    const meetup = await prisma.meetup.findUnique({
      where: { id },
      select: { status: true, startTime: true, venueId: true, rsvps: { where: { baretagId }, select: { id: true } } },
    });
    if (!meetup) throw new Error('PLAN_NOT_FOUND');
    if (meetup.status !== 'active') throw new Error('PLAN_CLOSED');
    if (!meetup.rsvps.length) throw new Error('NOT_PARTICIPANT');
    if (meetup.startTime > now) throw new Error('TOO_EARLY');
    return { venueId: meetup.venueId };
  }

  const crew = await prisma.surfBoatCrew.findUnique({
    where: { id },
    select: {
      venueId: true,
      status: true,
      expiresAt: true,
      operatorConfirmedDepartureAt: true,
      members: { where: { baretagId, commitment: 'CONFIRMED' }, select: { id: true } },
    },
  });
  if (!crew) throw new Error('PLAN_NOT_FOUND');
  if (crew.status === 'CANCELLED') throw new Error('PLAN_CLOSED');
  if (!crew.members.length) throw new Error('NOT_PARTICIPANT');
  const departed = crew.status === 'DEPARTED'
    || crew.expiresAt <= now
    || Boolean(crew.operatorConfirmedDepartureAt && crew.operatorConfirmedDepartureAt <= now);
  if (!departed) throw new Error('TOO_EARLY');
  return { venueId: crew.venueId };
}

export async function POST(request: NextRequest, context: { params: Promise<{ type: string; id: string }> }) {
  const { type: rawType, id } = await context.params;
  if (rawType !== 'boat' && rawType !== 'meetup') {
    return NextResponse.json({ success: false, error: 'Attendance is unavailable for this plan.' }, { status: 400 });
  }
  const type: AttendancePlanType = rawType;
  const rate = checkRateLimit(`live-plan-attendance:${getClientIp(request)}`, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!rate.allowed) {
    return NextResponse.json({ success: false, error: 'Too many confirmations. Try again later.' }, {
      status: 429,
      headers: createRateLimitHeaders(rate),
    });
  }
  const parsed = AttendanceSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Valid wallet required.' }, { status: 400 });
  }
  const baretag = await resolveHostBaretag(request, parsed.data.walletAddress ?? null, {
    action: 'live-plan:attendance',
    resource: `${type}:${id}`,
  });
  if (!baretag) {
    return NextResponse.json({ success: false, error: 'Sign in with the identity that joined this plan.' }, { status: 401 });
  }

  try {
    const plan = await assertParticipantCanConfirm(type, id, baretag.id, new Date());
    const recorded = await recordLivePlanJourneyEvent(request, {
      eventType: LIVE_PLAN_ATTENDANCE_EVENT,
      planType: type,
      planId: id,
      venueId: plan.venueId,
      baretagId: baretag.id,
      metadata: { evidence: 'participant_self_attestation' },
    });
    const attendanceCount = await getAttendanceCount(type, id);
    const response = NextResponse.json({
      success: true,
      data: {
        recorded: recorded.recorded,
        attendanceCount,
        completedTogether: attendanceCount >= 2,
      },
    });
    applyJourneyCookie(response, recorded.journeyToken);
    return response;
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'PLAN_NOT_FOUND') return NextResponse.json({ success: false, error: 'Plan not found.' }, { status: 404 });
    if (code === 'PLAN_CLOSED') return NextResponse.json({ success: false, error: 'This plan was cancelled.' }, { status: 409 });
    if (code === 'NOT_PARTICIPANT') return NextResponse.json({ success: false, error: 'Only joined participants can confirm.' }, { status: 403 });
    if (code === 'TOO_EARLY') return NextResponse.json({ success: false, error: 'Confirm after the plan begins.' }, { status: 409 });
    console.error('[LIVE_PLAN_ATTENDANCE] failed:', error);
    return NextResponse.json({ success: false, error: 'Could not confirm attendance.' }, { status: 500 });
  }
}
