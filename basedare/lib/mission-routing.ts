export type MissionActivationGoal = 'foot_traffic' | 'ugc' | 'launch' | 'event' | 'repeat_visits' | 'other';
export type MissionActivationPackage = 'pilot-drop' | 'local-signal' | 'city-takeover';
export type MissionBuyerType = 'venue' | 'brand' | 'agency' | 'event' | 'other';

type MissionActivationHrefInput = {
  source: string;
  creator?: string | null;
  venueName?: string | null;
  venueId?: string | null;
  venueSlug?: string | null;
  city?: string | null;
  goal?: MissionActivationGoal;
  buyerType?: MissionBuyerType;
  packageId?: MissionActivationPackage;
  offer?: 'first-spark' | '';
  missionType?: 'creator' | 'guest' | 'hybrid';
  missionTitle?: string | null;
  creatorSlots?: string | number | null;
  payout?: string | number | null;
  timeWindow?: string | null;
  proofRequired?: string | null;
  contentRequired?: string | null;
  guestMission?: string | null;
  perkLabel?: string | null;
};

function appendParam(params: URLSearchParams, key: string, value: string | number | null | undefined) {
  if (value === null || value === undefined) return;
  const normalized = String(value).trim();
  if (!normalized) return;
  params.set(key, normalized);
}

function normalizeCreator(creator: string | null | undefined) {
  const trimmed = creator?.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

export function buildMissionActivationHref(input: MissionActivationHrefInput) {
  const params = new URLSearchParams({
    source: input.source,
    goal: input.goal ?? 'ugc',
    buyerType: input.buyerType ?? 'venue',
    packageId: input.packageId ?? 'pilot-drop',
  });

  if (input.offer !== '') {
    params.set('offer', input.offer ?? 'first-spark');
  }

  appendParam(params, 'creator', normalizeCreator(input.creator));
  appendParam(params, 'venueName', input.venueName);
  appendParam(params, 'venueId', input.venueId);
  appendParam(params, 'venueSlug', input.venueSlug);
  appendParam(params, 'city', input.city);
  appendParam(params, 'missionType', input.missionType);
  appendParam(params, 'missionTitle', input.missionTitle);
  appendParam(params, 'creatorSlots', input.creatorSlots);
  appendParam(params, 'payout', input.payout);
  appendParam(params, 'timeWindow', input.timeWindow);
  appendParam(params, 'proofRequired', input.proofRequired);
  appendParam(params, 'contentRequired', input.contentRequired);
  appendParam(params, 'guestMission', input.guestMission);
  appendParam(params, 'perkLabel', input.perkLabel);

  const isFirstSpark = params.get('offer') === 'first-spark';
  return `${isFirstSpark ? '/first-spark' : '/activations'}?${params.toString()}#${isFirstSpark ? 'pilot-request' : 'activation-intake'}`;
}

export function buildCreatorMissionActivationHref(input: {
  creator: string;
  source: string;
  venueName?: string | null;
  venueSlug?: string | null;
  city?: string | null;
  skills?: string[];
}) {
  const creator = normalizeCreator(input.creator) ?? input.creator;
  const topSkill = input.skills?.[0] ?? 'proof capture';

  return buildMissionActivationHref({
    source: input.source,
    creator,
    venueName: input.venueName,
    venueSlug: input.venueSlug,
    city: input.city,
    goal: 'ugc',
    buyerType: 'venue',
    packageId: 'pilot-drop',
    offer: 'first-spark',
    missionType: 'hybrid',
    missionTitle: `First Spark mission for ${creator}`,
    creatorSlots: 3,
    payout: '$40-$75 per creator',
    timeWindow: 'Tonight or this weekend',
    proofRequired: 'QR check-in, coarse GPS, approved photo or clip',
    contentRequired: `${topSkill} plus one shareable receipt card`,
    guestMission: 'First 25 guest check-ins unlock a venue perk',
    perkLabel: 'Venue provides one simple access/status perk',
  });
}

export function buildVenueMissionActivationHref(input: {
  source: string;
  venueName: string;
  venueSlug: string;
  city?: string | null;
  goal?: MissionActivationGoal;
  missionTitle: string;
  guestMission: string;
  perkLabel: string;
}) {
  return buildMissionActivationHref({
    source: input.source,
    venueName: input.venueName,
    venueSlug: input.venueSlug,
    city: input.city,
    goal: input.goal ?? 'foot_traffic',
    buyerType: 'venue',
    packageId: 'pilot-drop',
    offer: 'first-spark',
    missionType: 'guest',
    missionTitle: input.missionTitle,
    creatorSlots: 3,
    payout: '$40-$75 per seeded creator',
    timeWindow: 'One night pilot',
    proofRequired: 'Venue QR, check-in proof, and recap receipt',
    contentRequired: 'Creators seed the night; guests check in and collect receipts',
    guestMission: input.guestMission,
    perkLabel: input.perkLabel,
  });
}
