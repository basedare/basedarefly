import type { LivePlanType } from '@/lib/live-plans';

export const LIVE_PLAN_ATTENDANCE_EVENT = 'LIVE_PLAN_ATTENDANCE_CONFIRMED';
export const LIVE_PLAN_INVITE_OPENED_EVENT = 'LIVE_PLAN_INVITE_OPENED';
export const LIVE_PLAN_JOINED_EVENT = 'LIVE_PLAN_JOINED';

export type AttendancePlanType = Extract<LivePlanType, 'boat' | 'meetup'>;

export function livePlanTargetType(type: AttendancePlanType) {
  return type === 'boat' ? 'SURF_BOAT_CREW' : 'MEETUP';
}
export function livePlanParticipantKey(baretagId: string) {
  return `baretag:${baretagId}`;
}

export function countCompletedTogetherPlans(
  events: Array<{ targetType: string | null; targetId: string | null; participantKey: string | null }>,
) {
  const participantsByPlan = new Map<string, Set<string>>();
  for (const event of events) {
    if (!event.targetType || !event.targetId || !event.participantKey) continue;
    const key = `${event.targetType}:${event.targetId}`;
    const participants = participantsByPlan.get(key) ?? new Set<string>();
    participants.add(event.participantKey);
    participantsByPlan.set(key, participants);
  }
  return [...participantsByPlan.values()].filter((participants) => participants.size >= 2).length;
}
