export const LOCAL_POST_TYPES = ['signal', 'ask', 'offer'] as const;
export type LocalPostType = (typeof LOCAL_POST_TYPES)[number];

export const COMMUNITY_POST_TTL_HOURS = 72;

const COMMUNITY_COMMERCE_PATTERN =
  /\b(?:buy|sell|for\s+sale|cash|payment|deposit|shipping?|deliver(?:y)?|room\s+for\s+rent|apartment|weapon|gun|drugs?|weed|crypto|usdc)\b/i;

const MANILA_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const SUNDAY = 0;

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lng2 - lng1);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export const SUNDAY_COMMUNITY_HANG = {
  idPrefix: 'curated:sunday-fun-day',
  title: 'Sunday Fun Day · community hang',
  category: 'community',
  postType: 'signal' as const,
  venueSlug: 'happiness-beach-bar-siargao',
  venueName: 'Happiness Beach Bar Siargao',
  city: 'General Luna',
  latitude: 9.8018102,
  longitude: 126.159654,
  sourceUrl: 'https://happinessphilippines.com/upcoming-event/',
  sourceAttribution: 'Happiness Philippines schedule',
  notes:
    'Recurring Sunday social from the venue’s published schedule. Check the official page before going; BaseDare is not the host or venue partner.',
} as const;

function formatDistance(distanceKm: number | null) {
  if (distanceKm === null) return null;
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))}m`;
  if (distanceKm < 10) return `${distanceKm.toFixed(1)}km`;
  return `${Math.round(distanceKm)}km`;
}

function manilaDateParts(now: Date) {
  const manilaClock = new Date(now.getTime() + MANILA_UTC_OFFSET_MS);
  return {
    year: manilaClock.getUTCFullYear(),
    month: manilaClock.getUTCMonth(),
    date: manilaClock.getUTCDate(),
    day: manilaClock.getUTCDay(),
  };
}

/**
 * Happiness publishes Sunday Fun Day as a recurring 6pm-midnight venue event.
 * Manila has no daylight-saving shift, so the public schedule maps to 10:00Z.
 */
export function getSundayCommunityHangWindow(now = new Date()) {
  const manila = manilaDateParts(now);
  const daysUntilSunday = (SUNDAY - manila.day + 7) % 7;
  let startsAt = new Date(
    Date.UTC(manila.year, manila.month, manila.date + daysUntilSunday, 10, 0, 0, 0)
  );
  let endsAt = new Date(startsAt.getTime() + 6 * 60 * 60 * 1000);

  // Once the published window has ended, advance to the next occurrence.
  if (endsAt.getTime() <= now.getTime()) {
    startsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    endsAt = new Date(endsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  return { startsAt, endsAt };
}

export function buildSundayCommunityHangSignal(
  now = new Date(),
  origin?: { latitude: number; longitude: number } | null
) {
  const { startsAt, endsAt } = getSundayCommunityHangWindow(now);
  const distanceKm = origin
    ? calculateDistance(
        origin.latitude,
        origin.longitude,
        SUNDAY_COMMUNITY_HANG.latitude,
        SUNDAY_COMMUNITY_HANG.longitude
      )
    : null;
  const occurrenceKey = startsAt.toISOString().slice(0, 10);

  return {
    id: `${SUNDAY_COMMUNITY_HANG.idPrefix}:${occurrenceKey}`,
    title: SUNDAY_COMMUNITY_HANG.title,
    status: 'APPROVED' as const,
    category: SUNDAY_COMMUNITY_HANG.category,
    postType: SUNDAY_COMMUNITY_HANG.postType,
    venueId: null,
    venueSlug: SUNDAY_COMMUNITY_HANG.venueSlug,
    venueName: SUNDAY_COMMUNITY_HANG.venueName,
    city: SUNDAY_COMMUNITY_HANG.city,
    notes: SUNDAY_COMMUNITY_HANG.notes,
    sourceUrl: SUNDAY_COMMUNITY_HANG.sourceUrl,
    sourceAttribution: SUNDAY_COMMUNITY_HANG.sourceAttribution,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    latitude: SUNDAY_COMMUNITY_HANG.latitude,
    longitude: SUNDAY_COMMUNITY_HANG.longitude,
    distanceKm,
    distanceDisplay: formatDistance(distanceKm),
    submittedBy: SUNDAY_COMMUNITY_HANG.sourceAttribution,
    operatorNote: 'Curated recurring public schedule; no BaseDare partnership claim.',
    createdAt: startsAt.toISOString(),
    updatedAt: startsAt.toISOString(),
  };
}

export function getLocalPostDefaultWindow(now = new Date()) {
  return {
    startsAt: now.toISOString(),
    endsAt: new Date(now.getTime() + COMMUNITY_POST_TTL_HOURS * 60 * 60 * 1000).toISOString(),
  };
}

export function localPostRequiresPlace(postType: LocalPostType) {
  return postType === 'ask' || postType === 'offer';
}

export function getCommunityPostSafetyError(input: { title: string; notes?: string | null }) {
  const text = `${input.title} ${input.notes ?? ''}`;
  if (COMMUNITY_COMMERCE_PATTERN.test(text)) {
    return 'Ask and Offer posts cannot arrange payments, sales, shipping, housing, or prohibited goods.';
  }
  return null;
}

export function getLocalPostMapHref(input: {
  postType: LocalPostType;
  venueSlug?: string | null;
  sourceUrl?: string | null;
}) {
  if (input.sourceUrl) return input.sourceUrl;
  if (input.venueSlug) {
    const params = new URLSearchParams({
      place: input.venueSlug,
      source: `local-${input.postType}`,
    });
    if (input.postType === 'ask' || input.postType === 'offer') params.set('room', '1');
    return `/map?${params.toString()}`;
  }
  return '/map?source=local-signal';
}

export function getLocalPostLabel(postType: LocalPostType, category?: string | null) {
  if (postType === 'ask') return 'ASK';
  if (postType === 'offer') return 'OFFER';
  if (category === 'community' || category === 'market') return 'HANG';
  return 'LOCAL';
}
