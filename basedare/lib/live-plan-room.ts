import type { Prisma } from '@prisma/client';

export const CREW_ROOM_PLAN_TYPES = ['boat', 'meetup'] as const;
export const CREW_ROOM_COORDINATION_KINDS = [
  'COMING',
  'HERE',
  'RUNNING_LATE',
  'NEED_GEAR',
  'CANT_MAKE_IT',
] as const;

export type CrewRoomPlanType = (typeof CREW_ROOM_PLAN_TYPES)[number];
export type CrewRoomCoordinationKind = (typeof CREW_ROOM_COORDINATION_KINDS)[number];

export function isCrewRoomPlanType(value: string): value is CrewRoomPlanType {
  return CREW_ROOM_PLAN_TYPES.includes(value as CrewRoomPlanType);
}

export function getCrewRoomThreadId(planType: CrewRoomPlanType, planId: string) {
  return `crew-room:${planType}:${planId}`;
}

export function getCrewRoomHref(planType: CrewRoomPlanType, planId: string) {
  return planType === 'boat'
    ? `/community/boat/${encodeURIComponent(planId)}#crew-room`
    : `/community/meet/${encodeURIComponent(planId)}#crew-room`;
}

export function readCrewRoomMetadata(metadata: Prisma.JsonValue | null | undefined) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const record = metadata as Record<string, unknown>;
  const planType = typeof record.planType === 'string' && isCrewRoomPlanType(record.planType)
    ? record.planType
    : null;
  const planId = typeof record.planId === 'string' ? record.planId : null;
  const planHref = typeof record.planHref === 'string' ? record.planHref : null;
  const planTitle = typeof record.planTitle === 'string' ? record.planTitle : null;
  const expiresAt = typeof record.expiresAt === 'string' ? record.expiresAt : null;
  if (!planType || !planId || !planHref || !planTitle || !expiresAt) return null;
  return { planType, planId, planHref, planTitle, expiresAt };
}

export function isCrewRoomMetadataOpen(
  metadata: Prisma.JsonValue | null | undefined,
  now = new Date(),
) {
  const room = readCrewRoomMetadata(metadata);
  if (!room) return false;
  const expiryMs = Date.parse(room.expiresAt);
  return Number.isFinite(expiryMs) && expiryMs > now.getTime();
}

export function getCrewRoomQuickCopy(
  kind: CrewRoomCoordinationKind,
  planType: CrewRoomPlanType,
) {
  switch (kind) {
    case 'COMING':
      return 'I’m coming.';
    case 'HERE':
      return 'I’m here.';
    case 'RUNNING_LATE':
      return 'Running late.';
    case 'NEED_GEAR':
      return planType === 'boat' ? 'I need a board.' : 'I need equipment.';
    case 'CANT_MAKE_IT':
      return 'I can’t make it.';
  }
}

export function shouldNotifyCrewRoomQuickAction(kind: CrewRoomCoordinationKind) {
  return kind === 'HERE' || kind === 'RUNNING_LATE' || kind === 'NEED_GEAR' || kind === 'CANT_MAKE_IT';
}
