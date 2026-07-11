// Pure policy for the "Tonight" aggregation (playbook: social-coordination-layer, A1).
//
// Dependency-free (the route computes distances via lib/geo and passes results in)
// so windowing, filtering, dedup, and response shaping live in ONE tested place.
// Honesty rules baked in: the destination's timezone defines "tonight", counts are
// real (zeros are zeros — density thresholds are a UI concern), and only public,
// approximate coordinates are ever emitted (3dp ≈ 110m; meetup coords are already
// rounded at write time and are re-rounded here defensively).

/** Local hour at which "tonight" ends (04:00 covers the late-night tail). */
export const TONIGHT_END_HOUR = 4;
/** A scheduled activity that started this recently still counts as "on now". */
export const GRACE_STARTED_MS = 2 * 60 * 60 * 1000;

export interface TonightWindow {
  startUtc: Date;
  endUtc: Date;
  tz: string;
}

/** True when `tz` is a usable IANA timezone on this runtime. */
export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** UTC offset (minutes) of `tz` at instant `now`, via Intl (DST-correct). */
export function parseUtcOffsetMinutes(now: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'longOffset',
  }).formatToParts(now);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const match = /GMT(?:([+-])(\d{2}):(\d{2}))?/.exec(name);
  if (!match) return 0;
  if (!match[1]) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

/**
 * The "tonight" window in the DESTINATION's timezone: from now until the next
 * local TONIGHT_END_HOUR (04:00). Before 04:00 local, tonight ends at 04:00
 * today; from 04:00 onward it ends at 04:00 tomorrow.
 */
export function tonightWindow(now: Date, tz: string): TonightWindow {
  const offsetMs = parseUtcOffsetMinutes(now, tz) * 60_000;
  const local = new Date(now.getTime() + offsetMs);
  const endLocalBase = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    TONIGHT_END_HOUR,
    0,
    0,
  );
  const endLocalMs =
    local.getUTCHours() >= TONIGHT_END_HOUR ? endLocalBase + 86_400_000 : endLocalBase;
  return { startUtc: now, endUtc: new Date(endLocalMs - offsetMs), tz };
}

export interface TonightMeetupInput {
  status: string;
  startTime: Date;
}

/** Public meetups: active, not long-started, and starting before the window ends. */
export function isMeetupTonight(
  meetup: TonightMeetupInput,
  window: TonightWindow,
  nowMs: number,
  graceMs = GRACE_STARTED_MS,
): boolean {
  if (meetup.status !== 'active') return false;
  const start = meetup.startTime.getTime();
  return start >= nowMs - graceMs && start <= window.endUtc.getTime();
}

export interface TonightDareInput {
  status: string;
  latitude: number | null;
  longitude: number | null;
  expiresAt: Date | null;
}

/** Public dares: live (PENDING), placed on the map, and not expired. */
export function isDareTonight(dare: TonightDareInput, nowMs: number): boolean {
  if (dare.status !== 'PENDING') return false;
  if (dare.latitude == null || dare.longitude == null) return false;
  if (dare.expiresAt && dare.expiresAt.getTime() <= nowMs) return false;
  return true;
}

/** Public, approximate coordinate (~110m). Never emit anything finer. */
export function roundCoord3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function normalizeActivityTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export interface TonightActivity {
  id: string;
  type: 'dare' | 'meetup';
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  place: {
    venueId: string | null;
    label: string;
    lat: number;
    lng: number;
    approx: true;
  };
  distanceKm: number | null;
  goingCount: number | null;
  capacity: number | null;
  reward: { amountUsdc: number } | null;
  viewer: { identified: boolean; rsvped: boolean };
  visibility: 'public';
  href: string;
}

export function shapeMeetup(
  meetup: {
    id: string;
    title: string;
    placeLabel: string;
    venueId: string | null;
    approxLat: number;
    approxLng: number;
    startTime: Date;
  },
  extra: {
    goingCount: number;
    viewerIdentified: boolean;
    viewerRsvped: boolean;
    distanceKm: number | null;
  },
): TonightActivity {
  return {
    id: meetup.id,
    type: 'meetup',
    title: meetup.title,
    startsAt: meetup.startTime.toISOString(),
    endsAt: null,
    place: {
      venueId: meetup.venueId ?? null,
      label: meetup.placeLabel,
      lat: roundCoord3(meetup.approxLat),
      lng: roundCoord3(meetup.approxLng),
      approx: true,
    },
    distanceKm: extra.distanceKm,
    goingCount: extra.goingCount,
    capacity: null,
    reward: null,
    viewer: { identified: extra.viewerIdentified, rsvped: extra.viewerRsvped },
    visibility: 'public',
    href: `/map?meetup=${encodeURIComponent(meetup.id)}`,
  };
}

export function shapeDare(
  dare: {
    id: string;
    shortId: string | null;
    title: string;
    bounty: number;
    latitude: number;
    longitude: number;
    venueId: string | null;
    locationLabel: string | null;
    expiresAt: Date | null;
  },
  extra: { viewerIdentified: boolean; distanceKm: number | null },
): TonightActivity {
  return {
    id: dare.id,
    type: 'dare',
    title: dare.title,
    startsAt: null,
    endsAt: dare.expiresAt ? dare.expiresAt.toISOString() : null,
    place: {
      venueId: dare.venueId ?? null,
      label: dare.locationLabel ?? 'On the map',
      lat: roundCoord3(dare.latitude),
      lng: roundCoord3(dare.longitude),
      approx: true,
    },
    distanceKm: extra.distanceKm,
    goingCount: null,
    capacity: null,
    reward: dare.bounty > 0 ? { amountUsdc: dare.bounty } : null,
    viewer: { identified: extra.viewerIdentified, rsvped: false },
    visibility: 'public',
    href: `/dare/${encodeURIComponent(dare.shortId ?? dare.id)}`,
  };
}

/**
 * Conservative duplicate collapse. There is no explicit meetup→dare link yet, so
 * the ONLY cross-type merge is an exact match on (non-null venueId + normalized
 * title) — a funded dare and a meetup describing the same activity at the same
 * place collapse to the dare (the richer, reward-bearing record). Nothing fuzzy:
 * different venues, null venues, or different titles never merge.
 */
export function dedupeActivities(activities: TonightActivity[]): TonightActivity[] {
  const seenIds = new Set<string>();
  const dareVenueTitle = new Set<string>();
  for (const activity of activities) {
    if (activity.type === 'dare' && activity.place.venueId) {
      dareVenueTitle.add(`${activity.place.venueId}|${normalizeActivityTitle(activity.title)}`);
    }
  }
  const result: TonightActivity[] = [];
  for (const activity of activities) {
    const idKey = `${activity.type}:${activity.id}`;
    if (seenIds.has(idKey)) continue;
    seenIds.add(idKey);
    if (
      activity.type === 'meetup' &&
      activity.place.venueId &&
      dareVenueTitle.has(`${activity.place.venueId}|${normalizeActivityTitle(activity.title)}`)
    ) {
      continue;
    }
    result.push(activity);
  }
  return result;
}

export interface TonightTotals {
  activities: number;
  dares: number;
  meetups: number;
  going: number;
}

/** Honest totals — zeros are real zeros; the UI owns empty-state presentation. */
export function computeTotals(activities: TonightActivity[]): TonightTotals {
  return {
    activities: activities.length,
    dares: activities.filter((a) => a.type === 'dare').length,
    meetups: activities.filter((a) => a.type === 'meetup').length,
    going: activities.reduce((sum, a) => sum + (a.goingCount ?? 0), 0),
  };
}
