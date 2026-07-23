import type { PlaceHealthSnapshot } from './place-health.ts';

export const PLAYABLE_ROUTE_MODES = ['ORDERED', 'FREE_PLAY'] as const;
export type PlayableRouteMode = (typeof PLAYABLE_ROUTE_MODES)[number];

export type RouteStopHealth = {
  venueId: string;
  venueName: string;
  active: boolean;
  health: PlaceHealthSnapshot;
};

export function evaluateRoutePublication(stops: RouteStopHealth[]) {
  const failures: string[] = [];
  if (stops.length < 3 || stops.length > 5) {
    failures.push('A playable route must contain between three and five distinct places.');
  }
  const duplicateVenueIds = stops.filter(
    (stop, index) => stops.findIndex((item) => item.venueId === stop.venueId) !== index,
  );
  if (duplicateVenueIds.length > 0) failures.push('A place can appear only once in a route.');
  for (const stop of stops) {
    if (!stop.active) failures.push(`${stop.venueName} is no longer an active public place.`);
    if (stop.health.state !== 'FRESH') {
      failures.push(
        `${stop.venueName} is ${stop.health.state.toLowerCase().replace('_', ' ')}: ${stop.health.reason}`,
      );
    }
  }
  return { publishable: failures.length === 0, failures };
}

export function canCompleteRouteStop(input: {
  mode: PlayableRouteMode;
  ordinal: number;
  completedOrdinals: number[];
}) {
  if (input.mode === 'FREE_PLAY') return { allowed: true, reason: null };
  const missing = Array.from({ length: input.ordinal - 1 }, (_, index) => index + 1).filter(
    (ordinal) => !input.completedOrdinals.includes(ordinal),
  );
  return missing.length === 0
    ? { allowed: true, reason: null }
    : { allowed: false, reason: `Complete stop ${missing[0]} first.` };
}
