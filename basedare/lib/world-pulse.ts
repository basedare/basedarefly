import { pickLivePlan, roundLivePlanCoord, type LivePlan } from './live-plans';
import { GRACE_STARTED_MS, tonightWindow } from './tonight';

export const WORLD_PULSE_TZ = 'Asia/Manila';
export const WORLD_PULSE_RADIUS_KM = 12;

export const WORLD_PULSE_MODES = ['NOW', 'NEXT_2H', 'TONIGHT', 'ALL'] as const;
export type WorldPulseMode = (typeof WORLD_PULSE_MODES)[number];

export const WORLD_PULSE_INTENTS = ['SURF', 'MEET', 'PLAY', 'SOCIAL', 'SURPRISE'] as const;
export type WorldPulseIntent = (typeof WORLD_PULSE_INTENTS)[number];

export type WorldPulseDecision = {
  intent: WorldPulseIntent;
  candidates: [LivePlan] | [LivePlan, LivePlan];
  winner: LivePlan;
  runnerUp: LivePlan | null;
  sideQuest: string | null;
};

const MODE_QUERY: Record<WorldPulseMode, string> = {
  NOW: 'now',
  NEXT_2H: 'next2h',
  TONIGHT: 'tonight',
  ALL: 'all',
};

const NOW_LOOKAHEAD_MS = 30 * 60 * 1000;
const NEXT_TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function parsePlanTime(value: string | null) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function parseWorldPulseMode(value: unknown): WorldPulseMode {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return WORLD_PULSE_MODES.find((mode) => MODE_QUERY[mode] === normalized) ?? 'NOW';
}

export function worldPulseModeQuery(mode: WorldPulseMode) {
  return MODE_QUERY[mode];
}

export function normalizeWorldPulseCenter(
  latitude: unknown,
  longitude: unknown,
  fallback = { latitude: 9.803, longitude: 126.159 },
) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return fallback;
  }
  return {
    latitude: roundLivePlanCoord(lat),
    longitude: roundLivePlanCoord(lng),
  };
}

export function normalizeWorldPulseRadius(value: unknown) {
  const radius = Number(value);
  if (!Number.isFinite(radius)) return WORLD_PULSE_RADIUS_KM;
  return Math.min(25, Math.max(0.1, Math.round(radius * 10) / 10));
}

export function isWorldPulseNowPlan(plan: Pick<LivePlan, 'startsAt' | 'endsAt'>, now = new Date()) {
  const nowMs = now.getTime();
  const startMs = parsePlanTime(plan.startsAt);
  const endMs = parsePlanTime(plan.endsAt);
  if (endMs != null && endMs < nowMs) return false;
  if (startMs == null) return true;
  if (startMs > nowMs + NOW_LOOKAHEAD_MS) return false;
  return endMs != null ? endMs >= nowMs : startMs >= nowMs - GRACE_STARTED_MS;
}

export function filterWorldPulsePlans(
  plans: LivePlan[],
  mode: WorldPulseMode,
  now = new Date(),
  timeZone = WORLD_PULSE_TZ,
) {
  if (mode === 'ALL') return plans;
  const nowMs = now.getTime();

  if (mode === 'NOW') {
    return plans.filter((plan) => isWorldPulseNowPlan(plan, now));
  }

  if (mode === 'NEXT_2H') {
    return plans.filter((plan) => {
      if (isWorldPulseNowPlan(plan, now)) return true;
      const startMs = parsePlanTime(plan.startsAt);
      return startMs != null && startMs > nowMs && startMs <= nowMs + NEXT_TWO_HOURS_MS;
    });
  }

  const window = tonightWindow(now, timeZone);
  return plans.filter((plan) => {
    const startMs = parsePlanTime(plan.startsAt);
    if (startMs == null) return false;
    const endMs = parsePlanTime(plan.endsAt);
    if (endMs != null && endMs < nowMs) return false;
    return startMs >= nowMs - GRACE_STARTED_MS && startMs <= window.endUtc.getTime();
  });
}

const SURF_INTENT_PATTERN = /\b(surf|wave|reef|paddle|board|boat|island|wake)\b/i;
const MEET_INTENT_PATTERN = /\b(meet|crew|social|trivia|hang|together|party|night)\b/i;

function isSurfPlan(plan: LivePlan) {
  if (plan.type === 'boat') return true;
  return SURF_INTENT_PATTERN.test([
    plan.title,
    plan.summary ?? '',
    plan.place.label,
  ].join(' '));
}

function isMeetPlan(plan: LivePlan) {
  if (plan.type === 'boat' || plan.type === 'meetup' || plan.type === 'venue_event') return true;
  if (plan.people?.minimum != null) return true;
  return MEET_INTENT_PATTERN.test([
    plan.title,
    plan.summary ?? '',
    plan.place.label,
  ].join(' '));
}

function isPlayPlan(plan: LivePlan) {
  return plan.type === 'community_spark';
}

function getIntentPlans(plans: LivePlan[], intent: WorldPulseIntent) {
  if (intent === 'SURPRISE') return plans;
  if (intent === 'SURF') return plans.filter(isSurfPlan);
  if (intent === 'PLAY') return plans.filter(isPlayPlan);
  return plans.filter(isMeetPlan);
}

function randomIndex(size: number, random: () => number) {
  if (size <= 1) return 0;
  const value = random();
  const bounded = Number.isFinite(value) ? Math.min(0.999999, Math.max(0, value)) : 0;
  return Math.floor(bounded * size);
}

const SIDE_QUESTS: Partial<Record<LivePlan['type'], readonly string[]>> = {
  boat: [
    'Ask one person what the break is doing before anyone paddles out.',
    'Find out who needs a board before the crew reaches the launch.',
  ],
  meetup: [
    'Let the least decisive person choose the first move.',
    'Ask one person for a nearby place the group should try next time.',
  ],
  venue_event: [
    'Find one detail worth telling the next mate who joins.',
    'Let someone else choose where the crew stands or sits first.',
  ],
  community_spark: [
    'Bring one mate and try the easy version first.',
    'Give the combo a name before you finish.',
  ],
};

export function getWorldPulseSideQuest(plan: LivePlan, random: () => number = Math.random) {
  const options = SIDE_QUESTS[plan.type];
  if (!options?.length) return null;
  return options[randomIndex(options.length, random)] ?? options[0] ?? null;
}

/**
 * PeeBear narrows real visible inventory; it never invents a destination.
 * Food/drink lanes stay out until venue hours and suitability are trustworthy.
 */
export function pickWorldPulsePlan(plans: LivePlan[], intent: WorldPulseIntent) {
  return pickLivePlan(getIntentPlans(plans, intent));
}

/**
 * Poke PeeBear is a decision layer over real World Pulse inventory. It puts
 * one joined/needs-people plan into the showdown when available, draws one
 * other eligible plan, then makes a fair one-of-two choice. It never creates
 * a venue, schedule, attendance claim, or proof state.
 */
export function getWorldPulseDecision(
  plans: LivePlan[],
  intent: WorldPulseIntent,
  random: () => number = Math.random,
): WorldPulseDecision | null {
  const matching = getIntentPlans(plans, intent);
  const priority = pickLivePlan(matching);
  if (!priority) return null;

  const remaining = matching.filter((plan) => plan.id !== priority.id);
  const opponent = remaining.length
    ? remaining[randomIndex(remaining.length, random)] ?? null
    : null;
  const candidates: [LivePlan] | [LivePlan, LivePlan] = opponent
    ? [priority, opponent]
    : [priority];
  const winner = candidates[randomIndex(candidates.length, random)] ?? priority;
  const runnerUp = candidates.find((plan) => plan.id !== winner.id) ?? null;

  return {
    intent,
    candidates,
    winner,
    runnerUp,
    sideQuest: getWorldPulseSideQuest(winner, random),
  };
}

export type WorldPulseSignal = {
  state: 'LIVE' | 'REPORTED' | 'SOURCE_CHECKED' | 'SCHEDULED' | 'OUTDATED';
  label: string;
  sourceLabel: string | null;
};

export function getWorldPulseSignal(plan: LivePlan, now = new Date()): WorldPulseSignal {
  const nowMs = now.getTime();
  const startMs = parsePlanTime(plan.startsAt);
  const endMs = parsePlanTime(plan.endsAt);

  if (endMs != null && endMs < nowMs) {
    return { state: 'OUTDATED', label: 'Outdated', sourceLabel: plan.trust.sourceLabel };
  }
  if (plan.status.forming && plan.people?.spotsNeeded) {
    return {
      state: 'LIVE',
      label: `Needs ${plan.people.spotsNeeded}`,
      sourceLabel: plan.trust.sourceLabel,
    };
  }
  if (startMs != null && startMs > nowMs + NOW_LOOKAHEAD_MS) {
    return { state: 'SCHEDULED', label: 'Scheduled', sourceLabel: plan.trust.sourceLabel };
  }
  if (plan.type === 'venue_event') {
    return { state: 'SOURCE_CHECKED', label: 'Source checked', sourceLabel: plan.trust.sourceLabel };
  }
  if (plan.type === 'boat' || plan.type === 'meetup') {
    return { state: 'REPORTED', label: 'Crew reported', sourceLabel: null };
  }
  return { state: 'LIVE', label: 'Live', sourceLabel: null };
}

export function getWorldPulseMapHref(
  plan: Pick<LivePlan, 'id' | 'type' | 'sourceId' | 'place'>,
  mode: WorldPulseMode,
) {
  const query = new URLSearchParams({
    source: 'world-pulse',
    pulse: worldPulseModeQuery(mode),
    plan: plan.id,
    lat: String(roundLivePlanCoord(plan.place.lat)),
    lng: String(roundLivePlanCoord(plan.place.lng)),
    zoom: '14',
  });
  if (plan.place.venueSlug) query.set('place', plan.place.venueSlug);
  if (plan.type === 'meetup') query.set('meetupId', plan.sourceId);
  return `/map?${query.toString()}`;
}

export function getWorldPulseMapViewHref(
  center: { latitude: number; longitude: number },
  mode: WorldPulseMode,
) {
  const query = new URLSearchParams({
    source: 'world-pulse',
    pulse: worldPulseModeQuery(mode),
    lat: String(roundLivePlanCoord(center.latitude)),
    lng: String(roundLivePlanCoord(center.longitude)),
    zoom: '13',
  });
  return `/map?${query.toString()}`;
}

export function getWorldPulseViewHref(input: {
  mode: WorldPulseMode;
  center: { latitude: number; longitude: number };
  radiusKm: number;
  selectedPlanId?: string | null;
  needsPeople?: boolean;
}) {
  const query = new URLSearchParams({
    mode: worldPulseModeQuery(input.mode),
    lat: String(roundLivePlanCoord(input.center.latitude)),
    lng: String(roundLivePlanCoord(input.center.longitude)),
    radiusKm: String(normalizeWorldPulseRadius(input.radiusKm)),
  });
  if (input.selectedPlanId) query.set('plan', input.selectedPlanId);
  if (input.needsPeople) query.set('needs', '1');
  return `/now?${query.toString()}`;
}
