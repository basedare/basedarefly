import 'server-only';

import type { NextRequest } from 'next/server';

import { ensureAttributionJourney } from '@/lib/creator-attribution-server';
import {
  LIVE_PLAN_ATTENDANCE_EVENT,
  LIVE_PLAN_INVITE_OPENED_EVENT,
  LIVE_PLAN_JOINED_EVENT,
  countCompletedTogetherPlans,
  livePlanParticipantKey,
  livePlanTargetType,
  type AttendancePlanType,
} from '@/lib/live-plan-retention';
import { prisma } from '@/lib/prisma';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type LivePlanEventType =
  | typeof LIVE_PLAN_INVITE_OPENED_EVENT
  | typeof LIVE_PLAN_JOINED_EVENT
  | typeof LIVE_PLAN_ATTENDANCE_EVENT;

export async function recordLivePlanJourneyEvent(request: NextRequest, input: {
  eventType: LivePlanEventType;
  planType: AttendancePlanType;
  planId: string;
  venueId?: string | null;
  baretagId?: string | null;
  clientEventId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const journey = await ensureAttributionJourney(request);
  const participantKey = input.baretagId ? livePlanParticipantKey(input.baretagId) : journey.journey.participantKey;
  const identity = input.clientEventId || participantKey || journey.journey.id;
  const result = await prisma.attributionEvent.createMany({
    data: [{
      eventType: input.eventType,
      dedupeKey: `live-plan:${input.eventType}:${input.planType}:${input.planId}:${identity}`,
      journeyId: journey.journey.id,
      participantKey,
      destinationVenueId: input.venueId ?? null,
      targetType: livePlanTargetType(input.planType),
      targetId: input.planId,
      metadataJson: {
        planType: input.planType,
        ...input.metadata,
      },
    }],
    skipDuplicates: true,
  });
  return { recorded: result.count > 0, journeyToken: journey.rawToken };
}
export async function getAttendanceCount(planType: AttendancePlanType, planId: string) {
  const rows = await prisma.attributionEvent.findMany({
    where: {
      eventType: LIVE_PLAN_ATTENDANCE_EVENT,
      targetType: livePlanTargetType(planType),
      targetId: planId,
      participantKey: { not: null },
    },
    distinct: ['participantKey'],
    select: { participantKey: true },
  });
  return rows.length;
}

export async function getCompletedTogetherPlans7d(now = new Date()) {
  const rows = await prisma.attributionEvent.findMany({
    where: {
      eventType: LIVE_PLAN_ATTENDANCE_EVENT,
      occurredAt: { gte: new Date(now.getTime() - WEEK_MS) },
    },
    select: { targetType: true, targetId: true, participantKey: true },
  });
  return countCompletedTogetherPlans(rows);
}
