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
  minimumPeople: number | null;
  status: MeetupPlanStatus;
  creatorTag: string | null;
  rsvpCount: number;
  viewerRsvped: boolean;
};

export function getMeetupSharePath(id: string) {
  return `/community/meet/${encodeURIComponent(id)}`;
}

export function getMeetupShareText(
  plan: Pick<MeetupPlanSummary, 'placeLabel' | 'startTime' | 'note' | 'rsvpCount'>
    & Partial<Pick<MeetupPlanSummary, 'title' | 'minimumPeople'>>,
) {
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
  const threshold = plan.minimumPeople
    ? `${Math.max(0, plan.minimumPeople - plan.rsvpCount)} more needed`
    : null;
  return [plan.title ?? `Meet at ${plan.placeLabel}`, plan.placeLabel, `${when} · ${people}${threshold ? ` · ${threshold}` : ''}`, plan.note]
    .filter(Boolean)
    .join('\n');
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

export function getRepeatRallyHref(plan: Pick<MeetupPlanSummary, 'title' | 'type' | 'venueId' | 'minimumPeople'>) {
  const template = ['padel', 'trivia', 'drinks', 'surf'].includes(plan.type) ? plan.type : 'meet';
  const query = new URLSearchParams({
    repeat: '1',
    template,
    title: plan.title,
    minimum: String(plan.minimumPeople ?? 2),
  });
  if (plan.venueId) query.set('venueId', plan.venueId);
  return `/community/rally/new?${query.toString()}`;
}

export function didMeetupJustUnlock(input: {
  previousCount: number;
  nextCount: number;
  minimumPeople: number | null;
}) {
  if (!input.minimumPeople || input.minimumPeople < 2) return false;
  return input.previousCount < input.minimumPeople && input.nextCount >= input.minimumPeople;
}
