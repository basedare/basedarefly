export const KANAWAY_BOAT_VENUE_SLUG = 'kanaway-surf-school';
export const KANAWAY_BOAT_VENUE_NAME = 'Kanaway Surf School';
export const CEMETERY_BOAT_VENUE_SLUG = 'siargao-beach-club';
export const CEMETERY_BOAT_VENUE_NAME = 'Siargao Beach Club';
export const BOAT_CREW_MINIMUM = 4;
export const INDICATIVE_BOAT_TOTAL_PHP = 1200;

export const KANAWAY_BOAT_MARKER_SLOTS = [
  // Vetted against the OpenFreeMap Liberty water layer. Keep the large
  // banca marker in the deeper bay—not merely a few metres past shore.
  { latitude: 9.81425, longitude: 126.1565 },
  { latitude: 9.814, longitude: 126.15625 },
  { latitude: 9.8145, longitude: 126.15675 },
  { latitude: 9.81375, longitude: 126.156 },
  { latitude: 9.81425, longitude: 126.157 },
] as const;

export const BOAT_DESTINATIONS = [
  { value: 'rock-island', label: 'Rock Island' },
  { value: 'stimpys', label: "Stimpy's" },
  { value: 'bumee-bomi', label: 'Bumee / Bomi' },
  { value: 'cemetery', label: 'Cemetery' },
  { value: 'best-today', label: 'Best today' },
  { value: 'flexible', label: 'Flexible' },
] as const;

export const OPERATOR_DESTINATIONS = BOAT_DESTINATIONS.slice(0, 4);

export const BOAT_LAUNCHES = [
  {
    value: KANAWAY_BOAT_VENUE_SLUG,
    label: 'Kanaway',
    name: KANAWAY_BOAT_VENUE_NAME,
    boardPath: '/community/boat/kanaway',
    mapPath: '/map?place=kanaway-surf-school&source=boat-share',
    mapLabel: 'Kanaway launch',
    destinationValues: ['rock-island', 'stimpys', 'bumee-bomi', 'best-today', 'flexible'],
    markerSlots: KANAWAY_BOAT_MARKER_SLOTS,
  },
  {
    value: CEMETERY_BOAT_VENUE_SLUG,
    label: 'Cemetery',
    name: CEMETERY_BOAT_VENUE_NAME,
    boardPath: '/community/boat/kanaway?launch=cemetery',
    mapPath: '/map?place=siargao-beach-club&source=boat-share',
    mapLabel: 'Cemetery launch',
    destinationValues: ['cemetery'],
    markerSlots: [
      { latitude: 9.78515, longitude: 126.16815 },
      { latitude: 9.78585, longitude: 126.16855 },
      { latitude: 9.7844, longitude: 126.16865 },
      { latitude: 9.7865, longitude: 126.16905 },
      { latitude: 9.7837, longitude: 126.16915 },
    ],
  },
] as const;

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
export type BoatLaunchSlug = (typeof BOAT_LAUNCHES)[number]['value'];
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

const BOAT_WINDOW_CLOSE_HOUR_MANILA: Record<BoatTimeWindow, number> = {
  dawn: 7,
  early: 9,
  later: 11,
  flexible: 15,
};

export function getBoatCrewExpiry(day: string, timeWindow: BoatTimeWindow = 'flexible') {
  const closeHour = BOAT_WINDOW_CLOSE_HOUR_MANILA[timeWindow];
  return new Date(`${day}T${String(closeHour).padStart(2, '0')}:00:00+08:00`);
}

export function isBoatWindowOpen(day: string, timeWindow: BoatTimeWindow, now = new Date()) {
  return isAllowedBoatDay(day, now) && getBoatCrewExpiry(day, timeWindow).getTime() > now.getTime();
}

export function getAvailableBoatTimeWindows(day: string, now = new Date()) {
  return BOAT_TIME_WINDOWS.filter((window) => isBoatWindowOpen(day, window.value, now));
}

export function getAvailableBoatDays(now = new Date()) {
  return getAllowedBoatDays(now).filter((day) => getAvailableBoatTimeWindows(day, now).length > 0);
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

export function getBoatLaunch(venueSlug: string) {
  return BOAT_LAUNCHES.find((launch) => launch.value === venueSlug) ?? BOAT_LAUNCHES[0];
}

export function getBoatLaunchDestinations(venueSlug: string) {
  const allowed = new Set<string>(getBoatLaunch(venueSlug).destinationValues);
  return BOAT_DESTINATIONS.filter((destination) => allowed.has(destination.value));
}

export function isBoatDestinationAllowed(venueSlug: string, destination: string) {
  return getBoatLaunch(venueSlug).destinationValues.some((value) => value === destination);
}

export function getBoatCrewMarkerPosition(venueSlug: string, index: number) {
  const slots = getBoatLaunch(venueSlug).markerSlots;
  if (index < slots.length) return slots[index];
  const anchor = slots[0];
  const overflowIndex = index - slots.length;
  const ring = Math.floor(overflowIndex / 8) + 1;
  const angle = (overflowIndex % 8) * (Math.PI / 4);
  const radius = ring * 0.00042;
  return {
    latitude: anchor.latitude + Math.sin(angle) * radius,
    longitude: anchor.longitude + Math.cos(angle) * radius,
  };
}

function formatManilaTime(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function getBoatCrewDepartureLabel(
  crew: Pick<BoatCrewSummary, 'departureDay' | 'timeWindow' | 'operatorConfirmation'>,
  now = new Date(),
) {
  const departureAt = crew.operatorConfirmation?.departureAt;
  if (departureAt) {
    const departureMs = Date.parse(departureAt);
    const minutesAway = (departureMs - now.getTime()) / 60_000;
    const time = formatManilaTime(departureAt);
    return minutesAway >= 0 && minutesAway <= 90 ? `SOON · ${time}` : `LEAVES ${time}`;
  }

  const day = crew.departureDay === getManilaDay(now) ? 'TODAY' : 'TOMORROW';
  const window = getOptionLabel(BOAT_TIME_WINDOWS, crew.timeWindow).replace(' · ', ' ');
  return `${day} · ${window}`;
}

export function getBoatCrewLoadingLabel(
  crew: Pick<BoatCrewSummary, 'confirmedCount' | 'minimumCrew' | 'status'>,
) {
  if (crew.status === 'READY') return `BOAT ${crew.confirmedCount}+ · READY`;
  if (crew.confirmedCount >= crew.minimumCrew) return `BOAT ${crew.confirmedCount}+ · CONFIRMING`;
  const needed = crew.minimumCrew - crew.confirmedCount;
  return `BOAT ${crew.confirmedCount}/${crew.minimumCrew}+ · NEEDS ${needed}`;
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

export function getBoatCrewInvitePath(id: string) {
  return `${getBoatCrewSharePath(id)}?invite=crew`;
}

export function getRepeatBoatCrewHref(
  crew: Pick<BoatCrewSummary, 'id' | 'venueSlug' | 'destination' | 'timeWindow' | 'abilityLane'> & {
    viewerMembership?: Pick<NonNullable<BoatCrewSummary['viewerMembership']>, 'needsBoard'> | null;
  },
) {
  const query = new URLSearchParams({
    repeat: 'boat',
    launch: crew.venueSlug,
    destination: crew.destination,
    time: crew.timeWindow,
    ability: crew.abilityLane,
    repeatFrom: crew.id,
  });
  if (crew.viewerMembership?.needsBoard) query.set('board', '1');
  return `/community/boat/kanaway?${query.toString()}`;
}

export function getBoatCrewShareText(crew: BoatCrewSummary) {
  const launch = getBoatLaunch(crew.venueSlug);
  const destination = getOptionLabel(BOAT_DESTINATIONS, crew.destination);
  const time = getOptionLabel(BOAT_TIME_WINDOWS, crew.timeWindow);
  const lane = getOptionLabel(SURF_ABILITY_LANES, crew.abilityLane);
  const count = getBoatCrewCountLabel(crew);
  const price = crew.operatorConfirmation
    ? `₱${crew.operatorConfirmation.sharePhp} each confirmed by the operator`
    : `about ₱${crew.projectedSharePhp} each if the current crew goes`;

  return `${destination} surf boat from ${launch.label} · ${time}\n${count} going · ${lane}\n${price}`;
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
