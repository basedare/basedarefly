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

export const CREATOR_CAPTAIN_HELP_MODES = [
  'venue_scout',
  'warm_intro',
  'qr_setup',
  'crowd_starter',
  'proof_runner',
  'recap_runner',
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
export type CreatorCaptainHelpMode = (typeof CREATOR_CAPTAIN_HELP_MODES)[number];
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

export const CREATOR_CAPTAIN_HELP_MODE_LABELS: Record<CreatorCaptainHelpMode, string> = {
  venue_scout: 'Venue scout',
  warm_intro: 'Warm intro',
  qr_setup: 'QR setup',
  crowd_starter: 'Crowd starter',
  proof_runner: 'Proof runner',
  recap_runner: 'Recap runner',
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
  helpModes: CreatorCaptainHelpMode[];
  availability: CreatorCaptainAvailability;
  expectedPayout: CreatorCaptainPayout;
  walletAddress: string;
  venueLead: string;
  referralSource: string;
};

export type CreatorCaptainMissionPacket = {
  title: string;
  suggestedVenue: string;
  firstMission: string;
  operatorAsk: string;
  checklist: string[];
  chips: string[];
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

function firstMatchingHelpMode(helpModes: string[], priority: CreatorCaptainHelpMode[]) {
  return priority.find((mode) => helpModes.includes(mode));
}

function firstMatchingCategory(categories: string[], priority: CreatorCaptainCategory[]) {
  return priority.find((category) => categories.includes(category));
}

export function buildCreatorCaptainMissionPacket(input: {
  creatorName?: string | null;
  primaryHandle?: string | null;
  city?: string | null;
  categories?: string[] | null;
  helpModes?: string[] | null;
  venueLead?: string | null;
}) {
  const creator = normalizeCreatorHandle(input.primaryHandle) || normalizeText(input.creatorName) || 'this captain';
  const city = normalizeText(input.city) || 'their local area';
  const suggestedVenue = normalizeText(input.venueLead) || `${city} venue shortlist`;
  const categories = (input.categories || []).filter((category): category is CreatorCaptainCategory =>
    CREATOR_CAPTAIN_CATEGORIES.includes(category as CreatorCaptainCategory)
  );
  const helpModes = (input.helpModes || []).filter((mode): mode is CreatorCaptainHelpMode =>
    CREATOR_CAPTAIN_HELP_MODES.includes(mode as CreatorCaptainHelpMode)
  );
  const primaryHelp = firstMatchingHelpMode(helpModes, [
    'warm_intro',
    'qr_setup',
    'proof_runner',
    'crowd_starter',
    'recap_runner',
    'venue_scout',
  ]);
  const primaryLane = firstMatchingCategory(categories, ['nightlife', 'food', 'travel', 'street', 'music', 'fitness']);
  const laneLabel = primaryLane ? CREATOR_CAPTAIN_CATEGORY_LABELS[primaryLane].toLowerCase() : 'local venue';

  const packetByHelpMode: Record<CreatorCaptainHelpMode, Omit<CreatorCaptainMissionPacket, 'suggestedVenue' | 'chips'>> = {
    warm_intro: {
      title: 'Warm venue intro route',
      firstMission: `Use ${creator} to make one warm intro at ${suggestedVenue}; confirm the decision maker, one simple perk, and whether a 7-day First Spark Pilot is welcome.`,
      operatorAsk: 'Ask for the owner/manager contact, best intro path, and one low-cost perk the venue could offer.',
      checklist: ['Decision maker named', 'Perk idea captured', 'Intro permission confirmed'],
    },
    qr_setup: {
      title: 'QR proof setup test',
      firstMission: `Send ${creator} to test the QR/check-in path at ${suggestedVenue}; capture signage context, scan friction, and one clean proof moment without exposing exact private location.`,
      operatorAsk: 'Ask them to report scan friction, staff placement, and whether the venue can keep a QR visible.',
      checklist: ['QR placement photo', 'Scan/check-in tested', 'Staff or venue note captured'],
    },
    proof_runner: {
      title: 'Proof runner mission',
      firstMission: `Route ${creator} to capture one safe proof loop at ${suggestedVenue}: arrival signal, venue context, proof clip/photo, and a short recap note for operator review.`,
      operatorAsk: 'Ask for one proof asset, one venue context shot, and the clearest next activation angle.',
      checklist: ['Arrival proof', 'Venue context', 'Recap note'],
    },
    crowd_starter: {
      title: 'Guest loop starter',
      firstMission: `Use ${creator} to seed a small guest mission at ${suggestedVenue}: check in, bring one friend, capture crowd energy, and suggest the lightest perk that would make guests join.`,
      operatorAsk: 'Ask what guests would actually do, what perk feels natural, and whether the room has repeatable energy.',
      checklist: ['Guest action named', 'Crowd signal captured', 'Perk fit noted'],
    },
    recap_runner: {
      title: 'Spark receipt runner',
      firstMission: `Have ${creator} turn ${suggestedVenue} into a Spark Receipt: 3 proof points, one useful venue quote or observation, and the next mission recommendation.`,
      operatorAsk: 'Ask for a tight recap that can be pasted into the venue pitch without extra rewriting.',
      checklist: ['3 proof points', 'Venue quote/observation', 'Next mission recommendation'],
    },
    venue_scout: {
      title: 'Venue scout shortlist',
      firstMission: `Ask ${creator} to scout 3 ${laneLabel} candidates in ${city}; pick one venue, explain why it can move, and attach one proof/media signal.`,
      operatorAsk: 'Ask for venue names, fit reason, proof/media, and whether any warm intro exists.',
      checklist: ['3 venue names', 'Best venue picked', 'Proof/media signal'],
    },
  };

  const selected = packetByHelpMode[primaryHelp || 'venue_scout'];
  const chips = [
    primaryHelp ? CREATOR_CAPTAIN_HELP_MODE_LABELS[primaryHelp] : 'Venue scout',
    primaryLane ? CREATOR_CAPTAIN_CATEGORY_LABELS[primaryLane] : 'Local venue',
    city,
  ].slice(0, 3);

  return {
    ...selected,
    suggestedVenue,
    chips,
  };
}

export function scoreCreatorCaptain(input: Pick<
  CreatorCaptainApplicationInput,
  | 'audienceSize'
  | 'categories'
  | 'helpModes'
  | 'availability'
  | 'city'
  | 'primaryHandle'
  | 'venueLead'
  | 'contentStyle'
  | 'dareIdeas'
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

  if (input.helpModes.includes('warm_intro')) {
    score += 10;
    reasons.push('can make warm venue intros');
  }

  if (input.helpModes.some((mode) => ['qr_setup', 'proof_runner'].includes(mode))) {
    score += 8;
    reasons.push('can run proof/check-in ops');
  }

  if (input.helpModes.includes('crowd_starter')) {
    score += 6;
    reasons.push('can start crowd energy');
  }

  if (input.helpModes.includes('venue_scout')) {
    score += 6;
    reasons.push('can scout real venues');
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
