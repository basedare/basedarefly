import { getAdventurePlaceSprite } from './map-adventure-policy';
import { GRACE_STARTED_MS, isValidTimeZone, tonightWindow } from './tonight';

export type RecommendationWindow = 'now' | 'next2h' | 'tonight' | 'browse';
export type RecommendationInput = {
  title: string;
  kind: 'place' | 'activity' | 'boat';
  latitude: number;
  longitude: number;
  categories?: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  distanceKm?: number | null;
  lastVerifiedAt?: string | null;
};
export type RecommendationContext = {
  now: Date;
  window: RecommendationWindow;
  timeZone?: string | null;
};
export type RecommendationAssessment = {
  eligible: boolean;
  reason: string;
  score: number;
};

const MINUTE = 60_000;
const DAYLIGHT_MARGIN = 45 * MINUTE;
const OUTDOOR_ACTIVITY = /\b(surf(?:ing)?|paddl(?:e|ing|eboard)|kayak(?:ing)?|snorkel(?:ing)?|diving|swim(?:ming)?|hike|hiking|waterfall|island.hopp?ing)\b/i;
const SOCIAL_ACTIVITY = /\b(trivia|quiz|film|movie|screening|dinner|breakfast|lunch|coffee|party|concert|karaoke|workshop|talk)\b/i;

/** Approximate solar elevation, independent of the viewer's timezone.
 * NOAA: https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 * This is a daylight suitability estimate, not weather or water-safety advice.
 */
export function solarElevation(now: Date, latitude: number, longitude: number): number | null {
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  const year = now.getUTCFullYear();
  const days = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000;
  const day = Math.floor((now.getTime() - Date.UTC(year, 0, 1)) / 86_400_000) + 1;
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const gamma = 2 * Math.PI / days * (day - 1 + (hour - 12) / 24);
  const equation = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const angle = (hour * 60 + equation + 4 * longitude) / 4 - 180;
  const radians = Math.PI / 180;
  const sine = Math.sin(latitude * radians) * Math.sin(declination) +
    Math.cos(latitude * radians) * Math.cos(declination) * Math.cos(angle * radians);
  return Math.asin(Math.max(-1, Math.min(1, sine))) / radians;
}

export function destinationHour(now: Date, longitude: number, timeZone?: string | null) {
  if (timeZone && isValidTimeZone(timeZone)) {
    const parts = new Intl.DateTimeFormat('en', { timeZone, hour: 'numeric', hourCycle: 'h23' }).formatToParts(now);
    return Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  }
  // A longitude-based daypart estimate is preferable to the viewer's clock
  // when a place has no timezone. Never display this as verified opening hours.
  return new Date(now.getTime() + longitude * 4 * MINUTE).getUTCHours();
}

export function formatRecommendationTime(value: string, timeZone?: string | null) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Time unconfirmed';
  const knownZone = timeZone && isValidTimeZone(timeZone) ? timeZone : null;
  return new Intl.DateTimeFormat('en', {
    timeZone: knownZone ?? 'UTC', hour: 'numeric', minute: '2-digit',
    ...(!knownZone ? { timeZoneName: 'short' as const } : {}),
  }).format(date);
}

export function requiresDaylight(input: RecommendationInput) {
  if (input.kind === 'boat') return true;
  if (input.kind === 'activity') {
    // A surf film or dinner at a surf school is a social plan, not a paddle-out.
    return OUTDOOR_ACTIVITY.test(input.title) && !SOCIAL_ACTIVITY.test(input.title);
  }
  const sprite = getAdventurePlaceSprite({
    challengeLiveCount: 0, categories: input.categories, venueName: input.title,
  });
  return sprite === 'surf' || sprite === 'palm' || sprite === 'rental';
}

/** All recommendation surfaces must apply eligibility BEFORE ranking/popularity. */
export function assessRecommendation(input: RecommendationInput, context: RecommendationContext): RecommendationAssessment {
  const reject = (reason: string): RecommendationAssessment => ({ eligible: false, reason, score: 0 });
  const nowMs = context.now.getTime();
  const start = input.startsAt ? Date.parse(input.startsAt) : null;
  const end = input.endsAt ? Date.parse(input.endsAt) : null;
  if (!Number.isFinite(nowMs) || (start != null && !Number.isFinite(start)) || (end != null && !Number.isFinite(end))) {
    return reject('Time unconfirmed');
  }
  if (end != null && (end <= nowMs || (start != null && end <= start))) return reject('This window has ended');
  if (start != null && end == null && start < nowMs - GRACE_STARTED_MS) return reject('This plan needs a fresh update');
  if (context.window === 'browse') return { eligible: true, reason: input.kind === 'place' ? 'Explore for later · check access before visiting' : 'Explore the details and planned time', score: 0 };

  const horizon = context.window === 'now' ? 30 * MINUTE : 120 * MINUTE;
  if (context.window !== 'tonight' && start != null && start > nowMs + horizon) return reject('Planned for later');
  if (context.window === 'tonight' && input.kind !== 'place') {
    if (start == null) return reject('No scheduled time for tonight');
    // The API supplies the destination timezone. UTC is explicit fallback,
    // never the timezone of the browser running this function.
    const tz = context.timeZone && isValidTimeZone(context.timeZone) ? context.timeZone : 'UTC';
    if (start >= tonightWindow(context.now, tz).endUtc.getTime()) return reject('Planned after tonight');
  }
  const effectiveStart = Math.max(nowMs, start ?? nowMs);
  if (end != null && end - effectiveStart < 15 * MINUTE) return reject('Too little time left');

  if (requiresDaylight(input)) {
    const first = solarElevation(new Date(effectiveStart), input.latitude, input.longitude);
    const later = solarElevation(new Date(effectiveStart + DAYLIGHT_MARGIN), input.latitude, input.longitude);
    if (input.kind === 'place' && context.window === 'tonight') return reject('Save this for daylight');
    if (first == null || later == null) return reject('Daylight at this place is unconfirmed');
    if (first <= 0 || later <= 0) return reject('Save this for daylight');
  }

  let reason: string;
  let score = 0;
  const hour = destinationHour(context.now, input.longitude, context.timeZone);
  if (input.kind === 'place') {
    const categories = (input.categories ?? []).join(' ');
    const nightlife = /nightlife|late-night|nightclub|beach-club|sports-bar|cocktail|pub|\bbar\b|music-club|24.hour/i.test(categories);
    const dining = /restaurant|dinner|food|kitchen|market/i.test(categories);
    const lateFood = /late-night|24.hour/i.test(categories);
    const dark = (solarElevation(context.now, input.latitude, input.longitude) ?? -90) <= 0;
    const nightIntent = context.window === 'tonight' || dark;
    // Unknown hours stay unknown. Restrict category-only fallbacks to plausible
    // dayparts; a daytime cafe cannot become the 1am default.
    if (nightIntent && !nightlife && !(dining && hour >= 17 && hour < 23) && !lateFood) {
      return reject('No night-time suitability confirmed');
    }
    if (!nightIntent && nightlife && hour < 16 && !dining) return reject('Better suited to the evening');
    reason = nightIntent ? 'Night-time option · hours unconfirmed' : requiresDaylight(input)
      ? 'Daylight fits · check access and conditions' : 'Daytime option · hours unconfirmed';
    score = 10;
    const verified = input.lastVerifiedAt ? Date.parse(input.lastVerifiedAt) : NaN;
    if (verified <= nowMs && nowMs - verified <= 6 * 60 * MINUTE) {
      score += 12;
      reason += ' · updated within 6h';
    }
  } else if (start != null) {
    reason = start > nowMs
      ? `Scheduled ${formatRecommendationTime(input.startsAt!, context.timeZone)}`
      : 'Recently started · check the host’s latest update';
    score = 80 - Math.max(0, start - nowMs) / (10 * MINUTE);
  } else {
    reason = 'Available brief · check its requirements';
    score = 40;
  }
  if (input.distanceKm != null && Number.isFinite(input.distanceKm) && input.distanceKm >= 0) {
    score -= Math.min(30, input.distanceKm * 2);
    reason += ` · ${input.distanceKm < 1 ? `${Math.round(input.distanceKm * 1000)}m` : `${input.distanceKm.toFixed(1)}km`} away`;
  }
  return { eligible: true, reason, score };
}

export function rankRecommendations<T>(
  items: readonly T[],
  project: (item: T) => RecommendationInput,
  context: RecommendationContext,
  preference: (item: T) => number = () => 0,
) {
  return items.map((item) => ({ item, assessment: assessRecommendation(project(item), context) }))
    .filter(({ assessment }) => assessment.eligible)
    .sort((a, b) => (b.assessment.score + preference(b.item)) - (a.assessment.score + preference(a.item)));
}
