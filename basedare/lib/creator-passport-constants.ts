/**
 * Creator Passport constants — pure data + types, no server imports.
 * Safe to import from client components AND server code.
 * Server logic (prisma) lives in lib/creator-passport.ts, which re-exports these.
 */

export type MissionId =
  | 'claim_signal'
  | 'tune_radar'
  | 'open_grid'
  | 'wake_spot'
  | 'mission_pings'
  | 'payout_ready'
  | 'first_spark_applied'
  | 'first_proof_drop';

export type MissionDetection = 'data' | 'passport' | 'explicit';

export type MissionDef = {
  id: MissionId;
  title: string;
  detail: string;
  points: number;
  detection: MissionDetection;
};

/** Starter mission set (copy reframed as upgrades, not chores). */
export const STARTER_MISSIONS: MissionDef[] = [
  { id: 'claim_signal', title: 'Claim Your Signal', detail: 'Finish tag, avatar, city.', points: 100, detection: 'data' },
  { id: 'tune_radar', title: 'Tune Your Radar', detail: 'Choose mission styles and radius.', points: 75, detection: 'passport' },
  { id: 'open_grid', title: 'Open the Grid', detail: 'Inspect one venue.', points: 50, detection: 'explicit' },
  { id: 'wake_spot', title: 'Wake a Spot', detail: 'Get your first place proof approved.', points: 150, detection: 'data' },
  { id: 'mission_pings', title: 'Mission Pings On', detail: 'Enable mission pings.', points: 75, detection: 'passport' },
  { id: 'payout_ready', title: 'Payout Ready', detail: 'Connect your payout wallet.', points: 150, detection: 'passport' },
  { id: 'first_spark_applied', title: 'First Spark Applied', detail: 'Apply to one available route.', points: 250, detection: 'explicit' },
  { id: 'first_proof_drop', title: 'First Paid Proof', detail: 'Complete a paid dare with approved proof.', points: 1000, detection: 'data' },
];

export const MISSION_BY_ID: Record<MissionId, MissionDef> = Object.fromEntries(
  STARTER_MISSIONS.map((mission) => [mission.id, mission])
) as Record<MissionId, MissionDef>;

/** Explicit (client-reported) missions that may be recorded via the mission endpoint. */
export const EXPLICIT_MISSIONS: MissionId[] = STARTER_MISSIONS.filter(
  (mission) => mission.detection === 'explicit'
).map((mission) => mission.id);

export const MISSION_STYLE_OPTIONS = [
  'nightlife',
  'food-drink',
  'beach-tourism',
  'fitness-stunts',
  'social-proof',
  'review-recap',
  'event-coverage',
  'solo-missions',
  'group-missions',
] as const;
export type MissionStyle = (typeof MISSION_STYLE_OPTIONS)[number];

export const AVAILABILITY_OPTIONS = [
  'tonight',
  'this-week',
  'weekends',
  'paid-only',
  'nearby-only',
  'travel-ready',
] as const;
export type Availability = (typeof AVAILABILITY_OPTIONS)[number];

/** Human labels for option chips. */
export const MISSION_STYLE_LABELS: Record<MissionStyle, string> = {
  nightlife: 'Nightlife',
  'food-drink': 'Food / Drink',
  'beach-tourism': 'Beach / Tourism',
  'fitness-stunts': 'Fitness / Stunts',
  'social-proof': 'Social Proof',
  'review-recap': 'Review / Recap',
  'event-coverage': 'Event Coverage',
  'solo-missions': 'Solo Missions',
  'group-missions': 'Group Missions',
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  tonight: 'Tonight',
  'this-week': 'This Week',
  weekends: 'Weekends',
  'paid-only': 'Paid Only',
  'nearby-only': 'Nearby Only',
  'travel-ready': 'Travel Ready',
};

/** Missions that, when complete, make a creator "route-ready". */
export const ROUTE_READY_MISSIONS: MissionId[] = ['claim_signal', 'tune_radar', 'payout_ready'];

export const MIN_MISSION_STYLES = 3;
export const MAX_MISSION_STYLES = 5;

/** Signal Points awarded for a proof-gated vault review (reputation only). */
export const VAULT_REVIEW_POINTS = 40;

/**
 * First high-trust visit to a venue. This is deliberately smaller than a
 * proof-gated vault review and can only be awarded once per wallet + venue.
 */
export const VERIFIED_VENUE_CHECK_IN_POINTS = 20;

export function getVenueCheckInSignalPoints(proofLevel: string | null | undefined) {
  return proofLevel === 'QR_AND_GPS' ? VERIFIED_VENUE_CHECK_IN_POINTS : 0;
}

export type PassportMissionState = MissionDef & { complete: boolean };

export type ComposedPassport = {
  walletAddress: string;
  homeZone: string | null;
  vibeLine: string | null;
  missionStyles: string[];
  availability: string[];
  radiusKm: number | null;
  pingsEnabled: boolean;
  signalPoints: number;
  routeReady: boolean;
  completedMissions: MissionId[];
  missions: PassportMissionState[];
  hasTag: boolean;
  /** Consecutive days (UTC, ending today/yesterday) with >=1 verified proof. */
  streakDays: number;
};
