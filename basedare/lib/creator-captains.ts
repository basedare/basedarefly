export const CREATOR_CAPTAIN_EVENT_TYPE = 'CREATOR_CAPTAIN_APPLICATION';

export const CREATOR_CAPTAIN_STATUSES = [
  'NEW',
  'SHORTLISTED',
  'CONTACTED',
  'NEEDS_INFO',
  'ONBOARDED',
  'REJECTED',
] as const;

export const CREATOR_CAPTAIN_CATEGORIES = [
  'nightlife',
  'food',
  'travel',
  'street',
  'challenge',
  'fitness',
  'web3',
  'music',
] as const;

export const CREATOR_CAPTAIN_PLATFORMS = [
  'tiktok',
  'instagram',
  'youtube',
  'x',
  'twitch',
  'other',
] as const;

export const CREATOR_CAPTAIN_AUDIENCE_SIZES = [
  'under_1k',
  '1k_10k',
  '10k_50k',
  '50k_250k',
  '250k_plus',
] as const;

export const CREATOR_CAPTAIN_AVAILABILITY = [
  'this_week',
  'this_month',
  'next_90_days',
  'exploring',
] as const;

export const CREATOR_CAPTAIN_PAYOUTS = [
  'perks',
  '50_150',
  '150_300',
  '300_750',
  '750_plus',
] as const;

export type CreatorCaptainStatus = (typeof CREATOR_CAPTAIN_STATUSES)[number];
export type CreatorCaptainCategory = (typeof CREATOR_CAPTAIN_CATEGORIES)[number];
export type CreatorCaptainPlatform = (typeof CREATOR_CAPTAIN_PLATFORMS)[number];
export type CreatorCaptainAudienceSize = (typeof CREATOR_CAPTAIN_AUDIENCE_SIZES)[number];
export type CreatorCaptainAvailability = (typeof CREATOR_CAPTAIN_AVAILABILITY)[number];
export type CreatorCaptainPayout = (typeof CREATOR_CAPTAIN_PAYOUTS)[number];

export const CREATOR_CAPTAIN_STATUS_LABELS: Record<CreatorCaptainStatus, string> = {
  NEW: 'New',
  SHORTLISTED: 'Shortlisted',
  CONTACTED: 'Contacted',
  NEEDS_INFO: 'Needs info',
  ONBOARDED: 'Onboarded',
  REJECTED: 'Rejected',
};

export const CREATOR_CAPTAIN_CATEGORY_LABELS: Record<CreatorCaptainCategory, string> = {
  nightlife: 'Nightlife',
  food: 'Food',
  travel: 'Travel',
  street: 'Street interviews',
  challenge: 'Challenge',
  fitness: 'Fitness',
  web3: 'Base/Web3',
  music: 'Music',
};

export const CREATOR_CAPTAIN_PLATFORM_LABELS: Record<CreatorCaptainPlatform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  x: 'X',
  twitch: 'Twitch',
  other: 'Other',
};

export const CREATOR_CAPTAIN_AUDIENCE_LABELS: Record<CreatorCaptainAudienceSize, string> = {
  under_1k: 'Under 1k',
  '1k_10k': '1k-10k',
  '10k_50k': '10k-50k',
  '50k_250k': '50k-250k',
  '250k_plus': '250k+',
};

export const CREATOR_CAPTAIN_AVAILABILITY_LABELS: Record<CreatorCaptainAvailability, string> = {
  this_week: 'This week',
  this_month: 'This month',
  next_90_days: 'Next 90 days',
  exploring: 'Exploring',
};

export const CREATOR_CAPTAIN_PAYOUT_LABELS: Record<CreatorCaptainPayout, string> = {
  perks: 'Perks first',
  '50_150': '$50-$150',
  '150_300': '$150-$300',
  '300_750': '$300-$750',
  '750_plus': '$750+',
};

export type CreatorCaptainApplicationInput = {
  creatorName: string;
  email: string;
  city: string;
  primaryHandle: string;
  primaryPlatform: CreatorCaptainPlatform;
  socialLinks: string;
  categories: CreatorCaptainCategory[];
  audienceSize: CreatorCaptainAudienceSize;
  contentStyle: string;
  dareIdeas: string;
  availability: CreatorCaptainAvailability;
  expectedPayout: CreatorCaptainPayout;
  walletAddress: string;
  venueLead: string;
  referralSource: string;
};

export function normalizeText(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

export function normalizeCreatorHandle(value: string | null | undefined) {
  const clean = normalizeText(value);
  if (!clean) return '';
  if (clean.startsWith('@')) return clean;
  return `@${clean}`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function stringArrayValue(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function normalizeCaptainStatus(value: unknown): CreatorCaptainStatus {
  return CREATOR_CAPTAIN_STATUSES.includes(value as CreatorCaptainStatus)
    ? (value as CreatorCaptainStatus)
    : 'NEW';
}

export function scoreCreatorCaptain(input: Pick<
  CreatorCaptainApplicationInput,
  'audienceSize' | 'categories' | 'availability' | 'city' | 'primaryHandle' | 'venueLead' | 'contentStyle' | 'dareIdeas'
>) {
  const reasons: string[] = [];
  let score = 20;

  const audienceScore: Record<CreatorCaptainAudienceSize, number> = {
    under_1k: 2,
    '1k_10k': 14,
    '10k_50k': 24,
    '50k_250k': 28,
    '250k_plus': 20,
  };
  score += audienceScore[input.audienceSize] ?? 0;

  if (input.categories.some((category) => ['nightlife', 'food', 'travel', 'street', 'challenge'].includes(category))) {
    score += 14;
    reasons.push('high-fit real-world content lane');
  }

  if (input.availability === 'this_week') {
    score += 12;
    reasons.push('available this week');
  } else if (input.availability === 'this_month') {
    score += 8;
    reasons.push('available this month');
  }

  if (input.city) {
    score += 8;
    reasons.push(`local city signal: ${input.city}`);
  }

  if (input.primaryHandle) {
    score += 8;
    reasons.push('primary social handle provided');
  }

  if (input.venueLead) {
    score += 12;
    reasons.push('can introduce or name a venue');
  }

  if (input.contentStyle.length > 80) {
    score += 6;
    reasons.push('clear content style');
  }

  if (input.dareIdeas.length > 80) {
    score += 8;
    reasons.push('has concrete dare ideas');
  }

  return {
    score: Math.min(100, score),
    reasons: reasons.length ? reasons : ['needs operator review'],
  };
}

