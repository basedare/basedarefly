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
    packageId: input.packageId ?? 'local-signal',
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
    packageId: 'local-signal',
    offer: '',
    missionType: 'hybrid',
    missionTitle: `Verified Field Sprint for ${creator}`,
    creatorSlots: 4,
    payout: '$120 net per accepted result',
    timeWindow: '7-10 days',
    proofRequired: 'Presence, freshness, trusted media, uniqueness, and bounded review',
    contentRequired: `${topSkill} plus one timestamped receipt; sponsor reuse is not included without explicit consent`,
    guestMission: 'One bounded place question answered independently',
    perkLabel: 'Optional place cooperation; no traffic or purchase guarantee',
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
    packageId: 'local-signal',
    offer: '',
    missionType: 'guest',
    missionTitle: input.missionTitle,
    creatorSlots: 4,
    payout: '$120 net per accepted result',
    timeWindow: '7-10 days',
    proofRequired: 'Presence, freshness, trusted media, uniqueness, and bounded review',
    contentRequired: 'Four independent field answers and one timestamped receipt; sponsor reuse requires explicit consent',
    guestMission: input.guestMission,
    perkLabel: input.perkLabel,
  });
}
