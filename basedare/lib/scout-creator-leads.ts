import { MANAGED_FIELD_SPRINT_BUDGET_RANGE } from '@/lib/financial-canon';

export const SCOUT_CREATOR_LEAD_EVENT_TYPE = 'SCOUT_CREATOR_LEAD';
export const DEFAULT_SCOUT_REWARD_SHARE_PCT = 10;

export const SCOUT_CREATOR_LEAD_STATUSES = [
  'LEAD_SUBMITTED',
  'INVITE_READY',
  'INVITE_SENT',
  'CREATOR_APPLIED',
  'APPROVED',
  'MISSION_SENT',
  'PROOF_SUBMITTED',
  'VENUE_PITCH_READY',
  'ACTIVATION_OPENED',
  'CREATOR_EARNED',
  'REWARD_DUE',
  'REWARD_PAID',
  'REJECTED',
] as const;

export const SCOUT_CREATOR_PLATFORMS = [
  'tiktok',
  'instagram',
  'youtube',
  'x',
  'twitch',
  'facebook',
  'local_operator',
  'other',
] as const;

export const SCOUT_RELATIONSHIP_STRENGTHS = [
  'cold',
  'warm',
  'friend',
  'manager',
  'self',
] as const;

export type ScoutCreatorLeadStatus = (typeof SCOUT_CREATOR_LEAD_STATUSES)[number];
export type ScoutCreatorPlatform = (typeof SCOUT_CREATOR_PLATFORMS)[number];
export type ScoutRelationshipStrength = (typeof SCOUT_RELATIONSHIP_STRENGTHS)[number];

export const SCOUT_CREATOR_LEAD_STATUS_LABELS: Record<ScoutCreatorLeadStatus, string> = {
  LEAD_SUBMITTED: 'Lead submitted',
  INVITE_READY: 'Invite ready',
  INVITE_SENT: 'Invite sent',
  CREATOR_APPLIED: 'Creator applied',
  APPROVED: 'Approved',
  MISSION_SENT: 'Mission sent',
  PROOF_SUBMITTED: 'Proof submitted',
  VENUE_PITCH_READY: 'Venue pitch ready',
  ACTIVATION_OPENED: 'Activation opened',
  CREATOR_EARNED: 'Creator earned',
  REWARD_DUE: 'Reward due',
  REWARD_PAID: 'Reward paid',
  REJECTED: 'Rejected',
};

export const SCOUT_CREATOR_PLATFORM_LABELS: Record<ScoutCreatorPlatform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  x: 'X',
  twitch: 'Twitch',
  facebook: 'Facebook',
  local_operator: 'Local operator',
  other: 'Other',
};

export const SCOUT_RELATIONSHIP_STRENGTH_LABELS: Record<ScoutRelationshipStrength, string> = {
  cold: 'Cold lead',
  warm: 'Warm intro',
  friend: 'Friend or collaborator',
  manager: 'Manager or team',
  self: 'I am the creator',
};

export type ScoutCreatorLeadInput = {
  scoutName: string;
  scoutHandle: string;
  scoutWallet: string;
  scoutCode: string;
  creatorHandle: string;
  creatorName: string;
  creatorPlatform: ScoutCreatorPlatform;
  creatorCity: string;
  creatorLink: string;
  relationshipStrength: ScoutRelationshipStrength;
  fitReason: string;
  notes: string;
};

export function normalizeScoutText(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

export function normalizeScoutHandle(value: string | null | undefined) {
  const clean = normalizeScoutText(value);
  if (!clean) return '';
  return clean.startsWith('@') ? clean : `@${clean}`;
}

export function normalizeScoutCode(value: string | null | undefined) {
  return normalizeScoutText(value)
    .replace(/^@/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function normalizeLeadUrl(value: string | null | undefined) {
  const clean = normalizeScoutText(value);
  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) return clean;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(clean)) return `https://${clean}`;
  return clean;
}

export function buildScoutReferralCode(input: {
  scoutCode?: string | null;
  scoutHandle?: string | null;
  scoutName?: string | null;
  scoutWallet?: string | null;
  fallbackId?: string | null;
}) {
  const explicitCode = normalizeScoutCode(input.scoutCode);
  if (explicitCode) return explicitCode;

  const handleCode = normalizeScoutCode(input.scoutHandle);
  if (handleCode) return handleCode;

  const nameCode = normalizeScoutCode(input.scoutName);
  if (nameCode) return nameCode;

  const wallet = normalizeScoutText(input.scoutWallet).toLowerCase();
  if (wallet.startsWith('0x') && wallet.length >= 10) return `wallet-${wallet.slice(-6)}`;

  const fallback = normalizeScoutCode(input.fallbackId);
  return fallback ? `scout-${fallback.slice(-10)}` : 'scout';
}

export function buildCaptainInvitePath(input: {
  scoutCode: string;
  creatorHandle?: string | null;
  source?: string | null;
}) {
  const params = new URLSearchParams({
    scout: buildScoutReferralCode({ scoutCode: input.scoutCode }),
    source: normalizeScoutText(input.source) || 'scout-referral',
  });

  const creatorHandle = normalizeScoutHandle(input.creatorHandle);
  if (creatorHandle) params.set('creator', creatorHandle);

  return `/hosts?${params.toString()}`;
}

export function buildCaptainMissionPath(input: { token: string }) {
  return `/captain-missions/${encodeURIComponent(input.token)}`;
}

export function buildCaptainMissionPacket(input: {
  creatorHandle?: string | null;
  creatorCity?: string | null;
  scoutCode?: string | null;
}) {
  const creator = normalizeScoutHandle(input.creatorHandle) || 'the creator';
  const city = normalizeScoutText(input.creatorCity) || 'your city';
  const scoutCode = normalizeScoutCode(input.scoutCode);

  return {
    title: 'Founding Captain Venue Scout',
    objective: `Scout 3 venues in ${city}, capture proof, and pick the strongest BaseDare drop candidate.`,
    prompts: [
      `Visit or research 3 real venues in ${city} that ${creator} could credibly activate.`,
      'Capture a short proof clip or photo for each venue: exterior, vibe, crowd signal, menu/product, event board, or location context.',
      'Pick the best venue for a 7-day First Spark Pilot and explain why it would make people show up.',
    ],
    proofChecklist: [
      'Venue name and city',
      'At least one proof/media link',
      'Why this venue fits BaseDare',
      'What the creator would film or do there',
      'Whether the creator can make a warm intro',
      'No private-customer filming without permission',
    ],
    captionDraft: `Scouting the next BaseDare drop in ${city}. Real venue, real proof, real mission. ${scoutCode ? `Scout code: ${scoutCode}` : ''}`.trim(),
    referralAsk:
      'If you know the owner, manager, host, bartender, promoter, or local operator, ask whether they would look at a 7-day creator proof pilot.',
    safetyRules: [
      'No illegal, reckless, harassing, or unsafe dares.',
      'Do not film private customers in a way that creates privacy problems.',
      'Only make truthful claims about BaseDare, creator pay, and venue outcomes.',
      'Paid or sponsored venue promotions must be clearly disclosed when applicable.',
    ],
  };
}

export function buildCaptainMissionActivationHref(input: {
  creatorHandle?: string | null;
  venueName?: string | null;
  city?: string | null;
  source?: string | null;
}) {
  const params = new URLSearchParams({
    source: normalizeScoutText(input.source) || 'captain-mission',
    buyerType: 'venue',
    packageId: 'pilot-drop',
    budgetRange: MANAGED_FIELD_SPRINT_BUDGET_RANGE,
    goal: 'foot_traffic',
    offer: 'first-spark',
  });

  const creatorHandle = normalizeScoutHandle(input.creatorHandle);
  const venueName = normalizeScoutText(input.venueName);
  const city = normalizeScoutText(input.city);

  if (creatorHandle) params.set('creator', creatorHandle);
  if (venueName) {
    params.set('venue', venueName);
    params.set('venueName', venueName);
  }
  if (city) params.set('city', city);

  return `/activations?${params.toString()}#activation-intake`;
}

export function buildVenuePitchPacket(input: {
  creatorHandle?: string | null;
  creatorCity?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  venueWebsite?: string | null;
  venueInstagram?: string | null;
  whyGoodFit?: string | null;
  momentDescription?: string | null;
  perkIdea?: string | null;
  ownerIntroStatus?: string | null;
}) {
  const creatorHandle = normalizeScoutHandle(input.creatorHandle) || 'BaseDare creator';
  const venueName = normalizeScoutText(input.venueName) || 'the scouted venue';
  const city = normalizeScoutText(input.creatorCity) || 'the local market';
  const whyGoodFit = normalizeScoutText(input.whyGoodFit);
  const momentDescription = normalizeScoutText(input.momentDescription);
  const perkIdea = normalizeScoutText(input.perkIdea);
  const ownerIntroStatus = normalizeScoutText(input.ownerIntroStatus);
  const activationHref = buildCaptainMissionActivationHref({
    creatorHandle,
    venueName,
    city,
    source: 'captain-mission-proof',
  });

  return {
    venueName,
    city,
    creatorHandle,
    activationHref,
    headline: `${venueName} is ready for a First Spark Pilot`,
    buyerPitch: [
      `${creatorHandle} scouted ${venueName} for BaseDare in ${city}.`,
      whyGoodFit ? `Why it fits: ${whyGoodFit}.` : null,
      momentDescription ? `Creator moment: ${momentDescription}.` : null,
      perkIdea ? `Simple venue perk/reward: ${perkIdea}.` : null,
      ownerIntroStatus ? `Intro status: ${ownerIntroStatus}.` : null,
      'BaseDare can turn this into one venue page, one creator mission, QR/check-in proof, and a Spark Receipt.',
    ].filter(Boolean).join('\n'),
    outreachDraft: [
      `Hey - a BaseDare creator-captain scouted ${venueName} as a strong fit for a First Spark Pilot.`,
      '',
      'The pilot is simple: BaseDare sets up the venue mission, proof path, and recap. The venue provides one small perk or reward, and the creator captures proof-backed content.',
      whyGoodFit ? `Why this venue: ${whyGoodFit}` : null,
      momentDescription ? `Mission idea: ${momentDescription}` : null,
      '',
      'Want to look at the pilot route?',
      activationHref,
    ].filter(Boolean).join('\n'),
    receiptBullets: [
      'Creator proof submitted before pitch',
      'Venue candidate selected by a real captain',
      'First Spark Pilot route prefilled',
      'Next step: approve venue outreach, then open activation intake',
    ],
    venueAddress: normalizeScoutText(input.venueAddress),
    venueWebsite: normalizeLeadUrl(input.venueWebsite),
    venueInstagram: normalizeLeadUrl(input.venueInstagram),
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function normalizeScoutCreatorLeadStatus(value: unknown): ScoutCreatorLeadStatus {
  return SCOUT_CREATOR_LEAD_STATUSES.includes(value as ScoutCreatorLeadStatus)
    ? (value as ScoutCreatorLeadStatus)
    : 'LEAD_SUBMITTED';
}

export function scoreScoutCreatorLead(input: Pick<
  ScoutCreatorLeadInput,
  'creatorHandle' | 'creatorCity' | 'creatorLink' | 'relationshipStrength' | 'fitReason' | 'notes'
>) {
  const reasons: string[] = [];
  let score = 18;

  if (normalizeScoutHandle(input.creatorHandle)) {
    score += 12;
    reasons.push('creator handle provided');
  }

  if (normalizeScoutText(input.creatorCity)) {
    score += 10;
    reasons.push(`city signal: ${normalizeScoutText(input.creatorCity)}`);
  }

  if (normalizeLeadUrl(input.creatorLink)) {
    score += 14;
    reasons.push('content link attached');
  }

  const relationshipScore: Record<ScoutRelationshipStrength, number> = {
    cold: 4,
    warm: 18,
    friend: 22,
    manager: 24,
    self: 16,
  };
  score += relationshipScore[input.relationshipStrength] ?? 0;
  if (input.relationshipStrength !== 'cold') {
    reasons.push(SCOUT_RELATIONSHIP_STRENGTH_LABELS[input.relationshipStrength]);
  }

  if (normalizeScoutText(input.fitReason).length > 70) {
    score += 12;
    reasons.push('clear BaseDare fit');
  }

  if (normalizeScoutText(input.notes).length > 80) {
    score += 6;
    reasons.push('extra operator context');
  }

  return {
    score: Math.min(100, score),
    reasons: reasons.length ? reasons : ['needs operator review'],
  };
}

export function estimateScoutReward(input: {
  creatorEarningsUsd?: number | null;
  rewardSharePct?: number | null;
}) {
  const earnings = Number(input.creatorEarningsUsd || 0);
  const pct = Number(input.rewardSharePct || DEFAULT_SCOUT_REWARD_SHARE_PCT);
  if (!Number.isFinite(earnings) || earnings <= 0 || !Number.isFinite(pct) || pct <= 0) return 0;
  return Math.round(earnings * pct) / 100;
}
