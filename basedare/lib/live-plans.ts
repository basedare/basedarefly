import type { BoatCrewSummary } from './surf-boat-board';
import { getActionSportsCommunitySparkByStreamId } from './action-sports-community-sparks';

export const LIVE_PLAN_HORIZON_HOURS = 72;

export type LivePlanType =
  | 'boat'
  | 'meetup'
  | 'venue_event'
  | 'community_spark'
  | 'paid_dare';

export type LivePlanViewerState =
  | 'NONE'
  | 'INTERESTED'
  | 'GOING'
  | 'PLAYING'
  | 'CLAIMED';

export type LivePlan = {
  id: string;
  sourceId: string;
  type: LivePlanType;
  title: string;
  summary: string | null;
  startsAt: string | null;
  endsAt: string | null;
  place: {
    venueId: string | null;
    venueSlug: string | null;
    label: string;
    lat: number;
    lng: number;
    approx: true;
  };
  distanceKm: number | null;
  people: {
    going: number;
    interested: number;
    minimum: number | null;
    spotsNeeded: number | null;
    unlocked: boolean;
  } | null;
  value: {
    rewardUsdc: number | null;
    indicativePerPersonPhp: number | null;
  } | null;
  status: {
    key: string;
    label: string;
    forming: boolean;
  };
  action: {
    kind: 'JOIN_CREW' | 'JOIN' | 'GOING' | 'PLAY' | 'CLAIM';
    label: string;
    href: string;
  };
  share: {
    href: string;
    title: string;
    text: string;
  };
  trust: {
    label: string;
    sourceLabel: string | null;
  };
  viewer: {
    identified: boolean;
    state: LivePlanViewerState;
    isNextMove: boolean;
  };
  visibility: 'public';
};

export type LivePlanSnapshot = {
  window: {
    startUtc: string;
    endUtc: string;
    tz: string;
  };
  center: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  totals: {
    plans: number;
    going: number;
    forming: number;
    boats: number;
    meetups: number;
    events: number;
    sparks: number;
    paidDares: number;
    completedTogether7d: number;
  };
  plans: LivePlan[];
  myNextMoves: LivePlan[];
};

export function livePlanId(type: LivePlanType, sourceId: string) {
  return `${type}:${sourceId}`;
}

/** Public coordinates stay at place granularity (~110m), never device precision. */
export function roundLivePlanCoord(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function getSpotsNeeded(going: number, minimum: number | null) {
  if (!minimum || minimum < 1) return null;
  return Math.max(0, minimum - going);
}

export function getLivePlanMapHref(
  plan: Pick<LivePlan, 'type' | 'sourceId' | 'place'>,
  source = 'my-next-move',
) {
  const query = new URLSearchParams({ source });
  if (plan.place.venueSlug) query.set('place', plan.place.venueSlug);
  if (plan.type === 'meetup') query.set('meetupId', plan.sourceId);
  return `/map?${query.toString()}`;
}

export function getLivePlanDirectionsHref(plan: Pick<LivePlan, 'place'>) {
  const destination = `${roundLivePlanCoord(plan.place.lat)},${roundLivePlanCoord(plan.place.lng)}`;
  const query = new URLSearchParams({ api: '1', destination });
  return `https://www.google.com/maps/dir/?${query.toString()}`;
}

export function isLivePlanCalendarReady(plan: Pick<LivePlan, 'type' | 'startsAt' | 'status'>) {
  if (!plan.startsAt || !Number.isFinite(new Date(plan.startsAt).getTime())) return false;
  if (plan.type !== 'boat') return true;
  return plan.status.key === 'OPERATOR_CONFIRMED' || plan.status.key === 'READY';
}

/**
 * PeeBear only chooses from real inventory. A plan the viewer already joined
 * stays first, then a plan that needs people, then the server-ranked result.
 */
export function pickLivePlan(plans: LivePlan[]) {
  return plans.find((plan) => plan.viewer.isNextMove)
    ?? plans.find((plan) => plan.status.forming)
    ?? plans[0]
    ?? null;
}

function planPlace(input: {
  venueId?: string | null;
  venueSlug?: string | null;
  label: string;
  lat: number;
  lng: number;
}): LivePlan['place'] {
  return {
    venueId: input.venueId ?? null,
    venueSlug: input.venueSlug ?? null,
    label: input.label,
    lat: roundLivePlanCoord(input.lat),
    lng: roundLivePlanCoord(input.lng),
    approx: true,
  };
}

function viewerState(
  identified: boolean,
  state: LivePlanViewerState,
): LivePlan['viewer'] {
  return { identified, state, isNextMove: state !== 'NONE' };
}

export function shapeLiveBoatPlan(
  crew: BoatCrewSummary,
  input: {
    venueId: string;
    latitude: number;
    longitude: number;
    startsAt: Date;
    endsAt: Date;
    distanceKm: number | null;
    viewerIdentified: boolean;
    display: {
      launchLabel: string;
      destinationLabel: string;
      timeLabel: string;
      statusLabel: string;
      shareText: string;
      href: string;
    };
  },
): LivePlan {
  const spotsNeeded = getSpotsNeeded(crew.confirmedCount, crew.minimumCrew);
  const state: LivePlanViewerState = crew.viewerMembership
    ? crew.viewerMembership.commitment === 'CONFIRMED'
      ? 'GOING'
      : 'INTERESTED'
    : 'NONE';
  const href = input.display.href;

  return {
    id: livePlanId('boat', crew.id),
    sourceId: crew.id,
    type: 'boat',
    title: `${input.display.destinationLabel} surf boat`,
    summary: `${input.display.launchLabel} · ${input.display.timeLabel}`,
    startsAt: input.startsAt.toISOString(),
    endsAt: input.endsAt.toISOString(),
    place: planPlace({
      venueId: input.venueId,
      venueSlug: crew.venueSlug,
      label: `${input.display.launchLabel} launch`,
      lat: input.latitude,
      lng: input.longitude,
    }),
    distanceKm: input.distanceKm,
    people: {
      going: crew.confirmedCount,
      interested: crew.interestedCount,
      minimum: crew.minimumCrew,
      spotsNeeded,
      unlocked: spotsNeeded === 0,
    },
    value: {
      rewardUsdc: null,
      indicativePerPersonPhp: crew.projectedSharePhp,
    },
    status: {
      key: crew.status,
      label: spotsNeeded === 0 ? 'Crew unlocked' : input.display.statusLabel,
      forming: spotsNeeded !== null && spotsNeeded > 0,
    },
    action: { kind: 'JOIN_CREW', label: 'Join crew', href },
    share: {
      href,
      title: `Join the ${input.display.destinationLabel} surf boat`,
      text: input.display.shareText,
    },
    trust: { label: 'Operator confirms final details', sourceLabel: null },
    viewer: viewerState(input.viewerIdentified, state),
    visibility: 'public',
  };
}

export function shapeLiveMeetupPlan(
  meetup: {
    id: string;
    title: string;
    note: string | null;
    placeLabel: string;
    venueId: string | null;
    venueSlug: string | null;
    approxLat: number;
    approxLng: number;
    startTime: Date;
    minimumPeople: number | null;
  },
  input: {
    going: number;
    viewerIdentified: boolean;
    viewerJoined: boolean;
    distanceKm: number | null;
  },
): LivePlan {
  const href = `/community/meet/${encodeURIComponent(meetup.id)}`;
  const inviteHref = `${href}?invite=1`;
  const spotsNeeded = getSpotsNeeded(input.going, meetup.minimumPeople);
  return {
    id: livePlanId('meetup', meetup.id),
    sourceId: meetup.id,
    type: 'meetup',
    title: meetup.title,
    summary: meetup.note,
    startsAt: meetup.startTime.toISOString(),
    endsAt: null,
    place: planPlace({
      venueId: meetup.venueId,
      venueSlug: meetup.venueSlug,
      label: meetup.placeLabel,
      lat: meetup.approxLat,
      lng: meetup.approxLng,
    }),
    distanceKm: input.distanceKm,
    people: {
      going: input.going,
      interested: 0,
      minimum: meetup.minimumPeople,
      spotsNeeded,
      unlocked: spotsNeeded === null || spotsNeeded === 0,
    },
    value: null,
    status: {
      key: spotsNeeded && spotsNeeded > 0 ? 'FORMING' : 'OPEN',
      label: spotsNeeded && spotsNeeded > 0 ? `${spotsNeeded} more needed` : 'Open plan',
      forming: Boolean(spotsNeeded && spotsNeeded > 0),
    },
    action: { kind: 'JOIN', label: "I'm in", href },
    share: {
      href: inviteHref,
      title: meetup.title,
      text: `${meetup.title}\n${meetup.placeLabel}`,
    },
    trust: { label: 'Public-place plan', sourceLabel: null },
    viewer: viewerState(input.viewerIdentified, input.viewerJoined ? 'GOING' : 'NONE'),
    visibility: 'public',
  };
}

export function shapeLiveVenueEventPlan(
  event: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    startsAt: Date;
    endsAt: Date | null;
    priceLabel: string | null;
    trustLabel: string;
    sourceLabel: string;
    venue: {
      id: string;
      slug: string;
      name: string;
      latitude: number;
      longitude: number;
    };
  },
  input: {
    going: number;
    interested: number;
    viewerIdentified: boolean;
    viewerStatus: 'INTERESTED' | 'GOING' | null;
    distanceKm: number | null;
  },
): LivePlan {
  const href = `/events/${encodeURIComponent(event.slug)}`;
  const state: LivePlanViewerState = input.viewerStatus ?? 'NONE';
  return {
    id: livePlanId('venue_event', event.id),
    sourceId: event.id,
    type: 'venue_event',
    title: event.title,
    summary: event.summary ?? event.priceLabel,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    place: planPlace({
      venueId: event.venue.id,
      venueSlug: event.venue.slug,
      label: event.venue.name,
      lat: event.venue.latitude,
      lng: event.venue.longitude,
    }),
    distanceKm: input.distanceKm,
    people: {
      going: input.going,
      interested: input.interested,
      minimum: null,
      spotsNeeded: null,
      unlocked: true,
    },
    value: null,
    status: { key: 'PUBLISHED', label: 'Source checked', forming: false },
    action: { kind: 'GOING', label: 'Going', href },
    share: { href, title: event.title, text: `${event.title}\n${event.venue.name}` },
    trust: { label: event.trustLabel, sourceLabel: event.sourceLabel },
    viewer: viewerState(input.viewerIdentified, state),
    visibility: 'public',
  };
}

export function shapeLiveDarePlan(
  dare: {
    id: string;
    shortId: string | null;
    title: string;
    streamId?: string | null;
    tag: string | null;
    bounty: number;
    expiresAt: Date | null;
    venueId: string | null;
    venueSlug: string | null;
    locationLabel: string | null;
    latitude: number;
    longitude: number;
    claimedBy: string | null;
    claimRequestWallet: string | null;
  },
  input: {
    viewerIdentified: boolean;
    viewerWallet: string | null;
    distanceKm: number | null;
  },
): LivePlan {
  const community = dare.bounty <= 0 && dare.tag === 'community';
  const communitySpark = community
    ? getActionSportsCommunitySparkByStreamId(dare.streamId)
    : null;
  const title = communitySpark?.title ?? dare.title;
  const type: LivePlanType = community ? 'community_spark' : 'paid_dare';
  const href = `/dare/${encodeURIComponent(dare.shortId ?? dare.id)}`;
  const viewerWallet = input.viewerWallet?.toLowerCase() ?? null;
  const participantWallet = dare.claimedBy?.toLowerCase() ?? dare.claimRequestWallet?.toLowerCase() ?? null;
  const isParticipant = Boolean(viewerWallet && participantWallet === viewerWallet);
  const state: LivePlanViewerState = isParticipant
    ? community
      ? 'PLAYING'
      : 'CLAIMED'
    : 'NONE';

  return {
    id: livePlanId(type, dare.id),
    sourceId: dare.id,
    type,
    title,
    summary: community ? communitySpark?.hook ?? 'Free to play' : `${dare.bounty} USDC reward`,
    startsAt: null,
    endsAt: dare.expiresAt?.toISOString() ?? null,
    place: planPlace({
      venueId: dare.venueId,
      venueSlug: dare.venueSlug,
      label: dare.locationLabel ?? 'On the BaseDare map',
      lat: dare.latitude,
      lng: dare.longitude,
    }),
    distanceKm: input.distanceKm,
    people: null,
    value: community
      ? null
      : { rewardUsdc: dare.bounty, indicativePerPersonPhp: null },
    status: {
      key: 'PENDING',
      label: community ? 'Free Spark' : 'Open reward',
      forming: false,
    },
    action: community
      ? { kind: 'PLAY', label: 'Play', href }
      : { kind: 'CLAIM', label: 'Claim', href },
    share: {
      href,
      title,
      text: community
        ? `${title}${communitySpark?.hook ? `\n${communitySpark.hook}` : ''}\nFree to play on BaseDare.`
        : `${title}\n${dare.bounty} USDC reward on BaseDare.`,
    },
    trust: {
      label: community ? 'Community Spark' : 'Proof-reviewed reward',
      sourceLabel: null,
    },
    viewer: viewerState(input.viewerIdentified, state),
    visibility: 'public',
  };
}

export function shouldIncludeLiveDare(dare: Pick<Parameters<typeof shapeLiveDarePlan>[0], 'bounty' | 'tag'>) {
  return dare.bounty > 0 || (dare.bounty <= 0 && dare.tag === 'community');
}

export function normalizeLivePlanTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Collapse only exact, place-bound duplicates. Paid dares win because they have
 * the stronger economic/proof contract; fuzzy merging would hide real plans.
 */
export function dedupeLivePlans(plans: LivePlan[]) {
  const seenIds = new Set<string>();
  const paidPlaceTitles = new Set(
    plans
      .filter((plan) => plan.type === 'paid_dare' && plan.place.venueId)
      .map((plan) => `${plan.place.venueId}|${normalizeLivePlanTitle(plan.title)}`),
  );
  return plans.filter((plan) => {
    if (seenIds.has(plan.id)) return false;
    seenIds.add(plan.id);
    if (
      plan.type !== 'paid_dare' &&
      plan.place.venueId &&
      paidPlaceTitles.has(`${plan.place.venueId}|${normalizeLivePlanTitle(plan.title)}`)
    ) return false;
    return true;
  });
}

export function sortLivePlans(plans: LivePlan[], now = new Date()) {
  const nowMs = now.getTime();
  return [...plans].sort((a, b) => {
    if (a.viewer.isNextMove !== b.viewer.isNextMove) return a.viewer.isNextMove ? -1 : 1;
    if (a.status.forming !== b.status.forming) return a.status.forming ? -1 : 1;
    const aTime = a.startsAt ? new Date(a.startsAt).getTime() : nowMs;
    const bTime = b.startsAt ? new Date(b.startsAt).getTime() : nowMs;
    if (aTime !== bTime) return aTime - bTime;
    return (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER);
  });
}

export function computeLivePlanTotals(plans: LivePlan[], completedTogether7d = 0): LivePlanSnapshot['totals'] {
  return {
    plans: plans.length,
    going: plans.reduce((sum, plan) => sum + (plan.people?.going ?? 0), 0),
    forming: plans.filter((plan) => plan.status.forming).length,
    boats: plans.filter((plan) => plan.type === 'boat').length,
    meetups: plans.filter((plan) => plan.type === 'meetup').length,
    events: plans.filter((plan) => plan.type === 'venue_event').length,
    sparks: plans.filter((plan) => plan.type === 'community_spark').length,
    paidDares: plans.filter((plan) => plan.type === 'paid_dare').length,
    completedTogether7d,
  };
}
