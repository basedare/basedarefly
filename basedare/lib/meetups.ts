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

// ============================================================================
// Stage 3 — map read layer (client-safe). Visual only; no settlement or value.
// ============================================================================

/** Shape returned by GET /api/meetups (rounded coords, joined creator display). */
export type MeetupPin = {
  id: string;
  title: string;
  type: string;
  placeLabel: string;
  venueId: string | null;
  approxLat: number;
  approxLng: number;
  startTime: string;
  note: string | null;
  happeningNow: boolean;
  creator: { tag: string; pfpUrl: string | null } | null;
};

/**
 * Map layer filter. Labels are the founder-approved vocabulary — do NOT reword
 * (never "Verified missions"). "Live Dares" = the paid/proof layer; "Free
 * Meetups" = this community layer; "Happening Now" = temporal cut, not verified.
 */
export const MAP_LAYER_FILTERS = ['all', 'dares', 'meetups', 'now'] as const;
export type MapLayerFilter = (typeof MAP_LAYER_FILTERS)[number];
export const MAP_LAYER_FILTER_LABELS: Record<MapLayerFilter, string> = {
  all: 'All',
  dares: 'Live Dares',
  meetups: 'Free Meetups',
  now: 'Happening Now',
};

/**
 * Whether a meetup pin shows for the active layer filter (controls the MEETUP
 * layer only — the paid layer is governed separately by a CSS attr hook).
 */
export function meetupPassesLayerFilter(
  meetup: Pick<MeetupPin, 'happeningNow'>,
  filter: MapLayerFilter
): boolean {
  switch (filter) {
    case 'dares':
      return false; // paid layer only — meetups hidden
    case 'now':
      return meetup.happeningNow;
    case 'meetups':
    case 'all':
    default:
      return true;
  }
}

const MEETUP_TYPE_GLYPH: Record<MeetupType, string> = {
  surf: '🏄',
  skate: '🛹',
  sunset: '🌅',
  jam: '🎸',
  dwmb: '🚲',
  custom: '📍',
};

/**
 * Lighter community pin for the free-meetup layer. Deliberately SUBORDINATE to
 * verified dare pins: no gold, no seal/stamp, no "verified" chrome. A subtle
 * ring pulses only while a meetup is happening now (temporal, not verified).
 * Glyph is a fixed lookup — no user free-text in marker HTML, so no XSS surface.
 */
export function createMeetupMarkerHtml(meetup: Pick<MeetupPin, 'type' | 'happeningNow'>): string {
  const glyph = MEETUP_TYPE_GLYPH[meetup.type as MeetupType] ?? '📍';
  return `<div class="bd-meetup-pin" data-now="${meetup.happeningNow ? 'true' : 'false'}"><span aria-hidden="true">${glyph}</span></div>`;
}
