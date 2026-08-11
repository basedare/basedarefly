import type { MeetupType } from '@/lib/meetups';

export type MeetupPlanStatus = 'ACTIVE' | 'HAPPENING' | 'ENDED' | 'CANCELLED';

export type MeetupPlanSummary = {
  id: string;
  title: string;
  type: MeetupType;
  placeLabel: string;
  venueId: string | null;
  venueSlug: string | null;
  approxLat: number;
  approxLng: number;
  startTime: string;
  note: string | null;
  status: MeetupPlanStatus;
  creatorTag: string | null;
  rsvpCount: number;
  viewerRsvped: boolean;
};

export function getMeetupSharePath(id: string) {
  return `/community/meet/${encodeURIComponent(id)}`;
}

export function getMeetupShareText(plan: Pick<MeetupPlanSummary, 'placeLabel' | 'startTime' | 'note' | 'rsvpCount'>) {
  const start = new Date(plan.startTime);
  const when = Number.isFinite(start.getTime())
    ? new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      }).format(start)
    : 'Soon';
  const people = `${Math.max(1, plan.rsvpCount)} going`;
  return [`Meet me at ${plan.placeLabel}`, `${when} · ${people}`, plan.note].filter(Boolean).join('\n');
}

export function normalizeMeetupInviteTags(values: string[]) {
  return [...new Set(
    values
      .map((value) => value.trim().replace(/^@+/, '').toLowerCase())
      .filter((value) => /^[a-z0-9_.-]{2,32}$/.test(value)),
  )].slice(0, 5);
}

export function getDefaultMeetHereStart(now = new Date()) {
  const next = new Date(now.getTime() + 30 * 60 * 1000);
  next.setMinutes(Math.ceil(next.getMinutes() / 15) * 15, 0, 0);
  return next;
}
