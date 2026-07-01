/**
 * Free meetup layer — client-safe constants + pure helpers.
 * No settlement, no payouts, no value. Location helpers enforce privacy
 * (rounded, public-place granularity — never raw device GPS).
 */

export const MEETUP_TYPES = ['surf', 'skate', 'sunset', 'jam', 'dwmb', 'custom'] as const;
export type MeetupType = (typeof MEETUP_TYPES)[number];

export const MEETUP_TYPE_LABELS: Record<MeetupType, string> = {
  surf: 'Surf',
  skate: 'Skate',
  sunset: 'Sunset',
  jam: 'Jam',
  dwmb: "Dude where's my bike",
  custom: 'Custom',
};

export function isMeetupType(value: unknown): value is MeetupType {
  return typeof value === 'string' && (MEETUP_TYPES as readonly string[]).includes(value);
}

/**
 * Privacy: round coordinates to ~3 decimal places (≈110m) — public-place
 * granularity. Never store or expose raw device GPS or a poster's exact spot.
 */
export function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** A meetup stays "live" on the map until startTime + this window. */
export const MEETUP_LIVE_WINDOW_MS = 4 * 60 * 60 * 1000; // 4h
const HAPPENING_LEAD_MS = 30 * 60 * 1000; // "happening now" starts 30m before startTime

/** Read-time expiry — derived from startTime, no cron/stored expiry for v1. */
export function isMeetupExpired(startTime: Date | string, now: number = Date.now()): boolean {
  return now > new Date(startTime).getTime() + MEETUP_LIVE_WINDOW_MS;
}

export function isHappeningNow(startTime: Date | string, now: number = Date.now()): boolean {
  const t = new Date(startTime).getTime();
  return now >= t - HAPPENING_LEAD_MS && now <= t + MEETUP_LIVE_WINDOW_MS;
}

/** Posting bounds: no more than 15m in the past, no more than 72h ahead. */
export const MEETUP_START_MIN_PAST_MS = 15 * 60 * 1000;
export const MEETUP_START_MAX_FUTURE_MS = 72 * 60 * 60 * 1000;
export function isStartTimeInBounds(startTime: Date | string, now: number = Date.now()): boolean {
  const t = new Date(startTime).getTime();
  if (Number.isNaN(t)) return false;
  return t >= now - MEETUP_START_MIN_PAST_MS && t <= now + MEETUP_START_MAX_FUTURE_MS;
}
