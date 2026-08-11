export const KANAWAY_BOAT_VENUE_SLUG = 'kanaway-surf-school';
export const KANAWAY_BOAT_VENUE_NAME = 'Kanaway Surf School';
export const BOAT_CREW_MINIMUM = 4;
export const INDICATIVE_BOAT_TOTAL_PHP = 1200;

export const BOAT_DESTINATIONS = [
  { value: 'rock-island', label: 'Rock Island' },
  { value: 'stimpys', label: "Stimpy's" },
  { value: 'bumee-bomi', label: 'Bumee / Bomi' },
  { value: 'best-today', label: 'Best today' },
  { value: 'flexible', label: 'Flexible' },
] as const;

export const OPERATOR_DESTINATIONS = BOAT_DESTINATIONS.slice(0, 3);

export const BOAT_TIME_WINDOWS = [
  { value: 'dawn', label: 'Dawn · 5–7' },
  { value: 'early', label: 'Early · 7–9' },
  { value: 'later', label: 'Later · 9–11' },
  { value: 'flexible', label: 'Flexible' },
] as const;

export const SURF_ABILITY_LANES = [
  { value: 'guided', label: 'Guided', detail: 'I want local guidance' },
  { value: 'independent', label: 'Independent', detail: 'Comfortable in the lineup' },
  { value: 'experienced', label: 'Experienced', detail: 'Confident in reef surf' },
] as const;

export const BOAT_COMMITMENTS = ['INTERESTED', 'CONFIRMED'] as const;
export const BOAT_CREW_STATUSES = [
  'FORMING',
  'AWAITING_OPERATOR',
  'OPERATOR_CONFIRMED',
  'READY',
  'CANCELLED',
] as const;

export type BoatDestination = (typeof BOAT_DESTINATIONS)[number]['value'];
export type OperatorDestination = (typeof OPERATOR_DESTINATIONS)[number]['value'];
export type BoatTimeWindow = (typeof BOAT_TIME_WINDOWS)[number]['value'];
export type SurfAbilityLane = (typeof SURF_ABILITY_LANES)[number]['value'];
export type BoatCommitment = (typeof BOAT_COMMITMENTS)[number];
export type BoatCrewStatus = (typeof BOAT_CREW_STATUSES)[number];
export type DisplayBoatCrewStatus = BoatCrewStatus | 'DEPARTED';

export type BoatCrewSummary = {
  id: string;
  venueSlug: string;
  departureDay: string;
  timeWindow: BoatTimeWindow;
  destination: BoatDestination;
  abilityLane: SurfAbilityLane;
  minimumCrew: number;
  indicativeTotalPhp: number;
  status: DisplayBoatCrewStatus;
  confirmedCount: number;
  interestedCount: number;
  boardCount: number;
  acceptedCount: number;
  projectedSharePhp: number;
  creatorTag: string | null;
  isCreator: boolean;
  viewerMembership: {
    commitment: BoatCommitment;
    needsBoard: boolean;
    acceptedFinalDetails: boolean;
  } | null;
  operatorConfirmation: {
    name: string;
    destination: OperatorDestination;
    totalPhp: number;
    capacity: number;
    departureAt: string;
    note: string | null;
    confirmedAt: string;
    sharePhp: number;
  } | null;
};

export function getOptionLabel<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function getManilaDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function addCalendarDays(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function getAllowedBoatDays(now = new Date()) {
  const today = getManilaDay(now);
  return [today, addCalendarDays(today, 1)] as const;
}

export function isAllowedBoatDay(day: string, now = new Date()) {
  return getAllowedBoatDays(now).includes(day as never);
}

export function getBoatCrewExpiry(day: string) {
  // 15:00 in the Philippines: enough time for a later morning departure to close.
  return new Date(`${day}T07:00:00.000Z`);
}

export function getProjectedSharePhp(totalPhp: number, confirmedCount: number, minimumCrew = BOAT_CREW_MINIMUM) {
  return Math.ceil(totalPhp / Math.max(confirmedCount, minimumCrew));
}

export function deriveBoatCrewStatus(input: {
  persistedStatus?: BoatCrewStatus;
  confirmedCount: number;
  acceptedCount: number;
  minimumCrew?: number;
  operatorConfirmedAt?: Date | string | null;
  departureAt?: Date | string | null;
  now?: Date;
}): DisplayBoatCrewStatus {
  if (input.persistedStatus === 'CANCELLED') return 'CANCELLED';
  const now = input.now ?? new Date();
  const departureAt = input.departureAt ? new Date(input.departureAt) : null;
  if (departureAt && Number.isFinite(departureAt.getTime()) && departureAt.getTime() <= now.getTime()) {
    return 'DEPARTED';
  }
  const minimumCrew = input.minimumCrew ?? BOAT_CREW_MINIMUM;
  if (input.confirmedCount < minimumCrew) return 'FORMING';
  if (!input.operatorConfirmedAt) return 'AWAITING_OPERATOR';
  if (input.acceptedCount >= input.confirmedCount) return 'READY';
  return 'OPERATOR_CONFIRMED';
}

export function getBoatCrewMapLabel(crew: Pick<BoatCrewSummary, 'confirmedCount' | 'minimumCrew' | 'status'>) {
  if (crew.status === 'READY') return 'BOAT READY';
  if (crew.status === 'DEPARTED' || crew.status === 'CANCELLED') return null;
  if (crew.confirmedCount >= crew.minimumCrew) return `BOAT ${crew.confirmedCount}+`;
  return `BOAT ${crew.confirmedCount}/${crew.minimumCrew}`;
}

export function getBoatCrewCountLabel(
  crew: Pick<BoatCrewSummary, 'confirmedCount' | 'minimumCrew' | 'operatorConfirmation'>,
) {
  if (crew.operatorConfirmation) {
    return `${crew.confirmedCount}/${crew.operatorConfirmation.capacity}`;
  }
  if (crew.confirmedCount >= crew.minimumCrew) return `${crew.confirmedCount}+`;
  return `${crew.confirmedCount}/${crew.minimumCrew}`;
}

export function getBoatCrewSharePath(id: string) {
  return `/community/boat/${encodeURIComponent(id)}`;
}

export function getBoatCrewShareText(crew: BoatCrewSummary) {
  const destination = getOptionLabel(BOAT_DESTINATIONS, crew.destination);
  const time = getOptionLabel(BOAT_TIME_WINDOWS, crew.timeWindow);
  const lane = getOptionLabel(SURF_ABILITY_LANES, crew.abilityLane);
  const count = getBoatCrewCountLabel(crew);
  const price = crew.operatorConfirmation
    ? `₱${crew.operatorConfirmation.sharePhp} each confirmed by the operator`
    : `about ₱${crew.projectedSharePhp} each if the current crew goes`;

  return `${destination} surf boat · ${time}\n${count} going · ${lane}\n${price}`;
}

export function getBoatCrewStatusCopy(status: DisplayBoatCrewStatus) {
  switch (status) {
    case 'FORMING':
      return 'Finding crew';
    case 'AWAITING_OPERATOR':
      return 'Crew found · confirm boat';
    case 'OPERATOR_CONFIRMED':
      return 'Boat confirmed · accept details';
    case 'READY':
      return 'Crew ready';
    case 'DEPARTED':
      return 'Out surfing';
    default:
      return 'Closed';
  }
}
