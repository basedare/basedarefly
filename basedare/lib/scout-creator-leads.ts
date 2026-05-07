export const SCOUT_CREATOR_LEAD_EVENT_TYPE = 'SCOUT_CREATOR_LEAD';
export const DEFAULT_SCOUT_REWARD_SHARE_PCT = 10;

export const SCOUT_CREATOR_LEAD_STATUSES = [
  'LEAD_SUBMITTED',
  'INVITE_READY',
  'INVITE_SENT',
  'CREATOR_APPLIED',
  'APPROVED',
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

  return `/captains?${params.toString()}`;
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
