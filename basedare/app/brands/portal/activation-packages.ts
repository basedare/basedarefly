// Types, mission-template catalog, and pure helpers for the Buyer Portal.
// Extracted verbatim from page.tsx (Phase A structural split — no behavior changes).

export interface Brand {
  id: string;
  name: string;
  logo: string | null;
  walletAddress: string;
  verified: boolean;
  totalSpend: number;
  latestCompletedSprintReceiptHref?: string;
  campaignSummary?: {
    total: number;
    live: number;
    settled: number;
    place: number;
    creator: number;
    creatorMovement: number;
    claimRequestsPending: number;
    creatorsAttached: number;
    proofsSubmitted: number;
    inReview: number;
    payoutQueued: number;
    paid: number;
  };
  venueRadar?: BrandVenueRadarItem[];
}

export interface BrandVenueRadarItem {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  claimState: 'unclaimed' | 'pending' | 'claimed';
  commandStatus: 'live' | 'claimable';
  sponsorReady: boolean;
  priorityLabel: string;
  strategyLabel: string;
  summary: string;
  score: number;
  rankReasons: string[];
  activity: {
    approvedMarks: number;
    activeChallenges: number;
    paidActivations: number;
    totalLiveFundingUsd: number;
    uniqueVisitorsToday: number;
    scansLastHour: number;
    recentCompletedCount: number;
  };
  brandHistory: {
    campaigns: number;
    liveCampaigns: number;
    totalSpendUsd: number;
  };
  topCreators: Array<{
    creatorTag: string;
    walletAddress: string;
    marksHere: number;
    firstMarksHere: number;
    latestMarkAt: string;
    totalEarned: number;
    completedDares: number;
    followerCount: number | null;
    trustLevel: number;
    trustLabel: string;
    trustScore: number;
  }>;
  recentSignals: Array<{
    creatorTag: string | null;
    caption: string | null;
    submittedAt: string;
    vibeTags: string[];
    firstMark: boolean;
  }>;
  contactUrl: string;
  contactLabel: string;
  consoleUrl: string | null;
}

export interface Campaign {
  id: string;
  shortId: string;
  type: string;
  tier: string;
  title: string;
  description: string | null;
  budgetUsdc: number;
  creatorCountTarget: number;
  payoutPerCreator: number;
  status: string;
  syncTime: string | null;
  createdAt: string;
  venue?: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
    impact?: {
      pulseNow: number;
      memoriesNow: number;
      lastMarkedAt: string | null;
      recentProofCount: number;
      recentCompletedCount: number;
      recentCheckInCount: number;
      memoryBucketStartedAt: string | null;
      campaignVerifiedMemory: boolean;
      firstMarkWon: boolean;
      pulseContribution: number;
      linkedMemoryAt: string | null;
    };
  } | null;
  linkedDare?: {
    id: string;
    shortId: string | null;
    status: string;
    videoUrl?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    moderatedAt?: string | null;
    verifiedAt?: string | null;
    completedAt?: string | null;
    streamerHandle?: string | null;
    targetWalletAddress?: string | null;
    claimedBy?: string | null;
    claimedAt?: string | null;
    claimRequestWallet?: string | null;
    claimRequestTag?: string | null;
    claimRequestedAt?: string | null;
    claimRequestStatus?: string | null;
    moderatorNote?: string | null;
  } | null;
  truth?: {
    sourceOfTruth: 'LINKED_DARE' | 'CAMPAIGN';
    lifecycleState: string;
    followsLinkedDare: boolean;
    creatorRoutingDormant: boolean;
    linkedDareState: {
      id: string;
      shortId: string | null;
      status: string;
      verifiedAt: string | null;
      completedAt: string | null;
      createdAt: string | null;
      venueId: string | null;
    } | null;
    timeline: {
      createdAt: string | null;
      fundedAt: string | null;
      liveAt: string | null;
      settledAt: string | null;
      linkedDareVerifiedAt: string | null;
      linkedDareCompletedAt: string | null;
      lastOperationalAt: string | null;
    };
  };
  slotCounts: {
    total: number;
    open: number;
    claimed: number;
    assigned: number;
    completed: number;
  };
  targetingCriteria?: string;
}

export interface CampaignFormData {
  type: 'PLACE' | 'CREATOR';
  tier: 'SIP_MENTION' | 'SIP_SHILL' | 'CHALLENGE' | 'APEX';
  title: string;
  description: string;
  creatorCountTarget: number;
  payoutPerCreator: number;
  syncTime: string;
  targetingCriteria: {
    niche: string;
    minFollowers: number;
    location: 'anywhere' | 'near-venue';
    platforms: string[];
  };
  verificationCriteria: {
    hashtagsRequired: string[];
    minDurationSeconds: number;
    productVisible?: {
      target: string;
      minFramePercent: number;
    };
    ctaSpoken?: {
      phrase: string;
      fuzzyMatch: boolean;
    };
  };
}

export interface CampaignMatch {
  score: number;
  reasons: string[];
  venueAffinity: {
    exactVenueMarks: number;
    exactVenueCheckIns: number;
    exactVenueWins: number;
    sameCityMarks: number;
  };
  creator: {
    id: string;
    tag: string;
    walletAddress: string;
    bio: string | null;
    pfpUrl: string | null;
    followerCount: number | null;
    tags: string[];
    status: string;
    identityPlatform: string | null;
    identityHandle: string | null;
    totalEarned: number;
    completedDares: number;
    platforms: {
      twitter: { handle: string; verified: boolean } | null;
      twitch: { handle: string; verified: boolean } | null;
      youtube: { handle: string; verified: boolean } | null;
      kick: { handle: string; verified: boolean } | null;
    };
  };
}

export interface CampaignMatchesState {
  loading: boolean;
  data: CampaignMatch[];
  error: string | null;
}

export type ResponseRailTab = 'shortlisted' | 'claimed' | 'proof' | 'review' | 'verified';
export type VenueRadarFilter = 'hot' | 'managed' | 'claimable';
export type CampaignTier = CampaignFormData['tier'];
export type ComposerPrefill = {
  creatorTag?: string | null;
  tier?: CampaignTier;
  payoutPerCreator?: number | null;
  title?: string | null;
  description?: string | null;
  syncTime?: string | null;
  reportSource?: string | null;
  reportAudience?: 'venue' | 'sponsor' | null;
  reportSessionKey?: string | null;
  reportIntent?: 'activation' | 'repeat' | null;
};

export type ReportAttribution = {
  source: string | null;
  audience: 'venue' | 'sponsor' | null;
  sessionKey: string | null;
  intent: 'activation' | 'repeat' | null;
};

export const PLATFORM_OPTIONS = [
  { value: 'twitter', label: 'X' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'kick', label: 'Kick' },
] as const;

export interface PlaceSearchResult {
  id: string;
  name: string;
  displayName: string;
  address?: string | null;
  city: string | null;
  country: string | null;
  slug?: string;
  placeId?: string;
  placeSource?: string;
  externalPlaceId?: string;
  latitude?: number;
  longitude?: number;
}

// Internal campaign tiers are retained for contract/API compatibility. Buyer-facing
// language describes the real-world question and proof, not influencer jargon.
export const TIER_INFO = {
  SIP_MENTION: {
    name: 'Field Check',
    description: 'Confirm one useful fact at a real place',
    minPayout: 50,
    window: '7 days',
    bonus: 'None',
    rake: '0%',
    color: 'from-zinc-600 to-zinc-700',
    borderColor: 'border-zinc-500/30',
  },
  SIP_SHILL: {
    name: 'Experience Check',
    description: 'Document what an experience is actually like',
    minPayout: 100,
    window: '24 hours',
    bonus: 'None',
    rake: '0%',
    color: 'from-blue-600 to-blue-700',
    borderColor: 'border-blue-500/30',
  },
  CHALLENGE: {
    name: 'Discovery Drop',
    description: 'Answer a richer place question with reusable proof',
    minPayout: 250,
    window: '2 hours',
    bonus: '1.3x Strike',
    rake: '0%',
    color: 'from-purple-600 to-purple-700',
    borderColor: 'border-purple-500/30',
  },
  APEX: {
    name: 'First Spark',
    description: 'Run a higher-proof venue or destination mission',
    minPayout: 1000,
    window: '1 hour',
    bonus: '1.5x Strike',
    rake: '0%',
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/30',
  },
};

export type ActivationPackageId = 'verified-field-sprint';
export type ActivationPackage = {
  id: ActivationPackageId;
  name: string;
  eyebrow: string;
  tier: CampaignTier;
  payout: number;
  bestFor: string;
  outcome: string;
  proof: string;
  buyerCopy: string;
};

export const DEFAULT_ACTIVATION_PACKAGE_ID: ActivationPackageId = 'verified-field-sprint';

export const ACTIVATION_PACKAGES: ActivationPackage[] = [
  {
    id: 'verified-field-sprint',
    name: 'Verified Field Sprint',
    eyebrow: '$2,500 managed fieldwork',
    tier: 'SIP_MENTION',
    payout: 125,
    bestFor: 'One bounded buyer question in one real micro-area',
    outcome: 'Up to four independently verified field answers, place memory, and one durable receipt.',
    proof: 'BaseDare assigns four contributors, pays $120 net for each accepted answer, and records the actual accepted, rejected, and inconclusive result.',
    buyerCopy: 'Seven to ten days. No guaranteed traffic or sales lift; the receipt reports what the field actually proved.',
  },
];

export function getActivationPackage(packageId: ActivationPackageId) {
  return (
    ACTIVATION_PACKAGES.find((activationPackage) => activationPackage.id === packageId) ??
    ACTIVATION_PACKAGES.find((activationPackage) => activationPackage.id === DEFAULT_ACTIVATION_PACKAGE_ID) ??
    ACTIVATION_PACKAGES[0]
  );
}

export function getActivationPackageForTier(tier: CampaignTier | undefined) {
  if (!tier) return getActivationPackage(DEFAULT_ACTIVATION_PACKAGE_ID);
  return ACTIVATION_PACKAGES.find((activationPackage) => activationPackage.tier === tier) ?? getActivationPackage(DEFAULT_ACTIVATION_PACKAGE_ID);
}

export function buildActivationPackageTitle(activationPackage: ActivationPackage, venueName?: string | null) {
  const target = venueName?.trim();
  return target ? `${target} ${activationPackage.name}` : activationPackage.name;
}

export function buildActivationPackageDescription(activationPackage: ActivationPackage, venueName?: string | null) {
  const target = venueName?.trim() || 'the place';
  return `${activationPackage.proof} Target place: ${target}.`;
}

export function formatUsdAmount(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function isCampaignTier(value: string | null): value is CampaignTier {
  return value === 'SIP_MENTION' || value === 'SIP_SHILL' || value === 'CHALLENGE' || value === 'APEX';
}

export function formatCompactAudience(value: number | null) {
  if (typeof value !== 'number' || value <= 0) return 'Building';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M+`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K+`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K+`;
  return `${value}+`;
}

export function getCreatorInitial(tag: string) {
  return tag.replace(/^@/, '').charAt(0).toUpperCase() || 'C';
}

export function getCreatorVenueFitLabel(match: CampaignMatch) {
  if (match.venueAffinity.exactVenueWins > 0) return 'Proven here';
  if (match.venueAffinity.exactVenueMarks > 0 || match.venueAffinity.exactVenueCheckIns > 0) return 'Knows this venue';
  if (match.venueAffinity.sameCityMarks > 0) return 'Active nearby';
  return 'Fresh eyes';
}

export function getCreatorReliabilityLabel(match: CampaignMatch) {
  if (match.creator.completedDares >= 10) return 'Elite closer';
  if (match.creator.completedDares >= 5) return 'Reliable closer';
  if (match.creator.completedDares >= 1) return 'Getting reps';
  return 'New to BaseDare';
}

export function getCreatorStrengthLabel(match: CampaignMatch) {
  if (match.creator.platforms.youtube) return 'Strong on YouTube';
  if (match.creator.platforms.twitter) return 'Strong on X';
  if (match.creator.platforms.twitch) return 'Strong on Twitch';
  if (match.creator.platforms.kick) return 'Strong on Kick';
  if ((match.creator.followerCount ?? 0) >= 10000) return 'Audience signal';
  return 'Ready to activate';
}

export function getVenueRadarClaimTone(venue: BrandVenueRadarItem) {
  if (venue.claimState === 'claimed') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (venue.claimState === 'pending') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-zinc-200 bg-zinc-100 text-zinc-600';
}

export function formatVenueRadarLocation(venue: Pick<BrandVenueRadarItem, 'city' | 'country'>) {
  return [venue.city, venue.country].filter(Boolean).join(', ') || 'Venue on the grid';
}

export function buildVenueCreatorChatHref(
  venue: BrandVenueRadarItem,
  creator: BrandVenueRadarItem['topCreators'][number]
) {
  const creatorTag = creator.creatorTag.startsWith('@') ? creator.creatorTag : `@${creator.creatorTag}`;
  const location = formatVenueRadarLocation(venue);
  const params = new URLSearchParams({
    creator: creatorTag,
    venue: venue.slug,
    subject: `Activation route: ${venue.name} x ${creatorTag}`,
    message: `BaseDare matched you to a paid field mission at ${venue.name} (${location}). Are you available to answer one place question with verified proof? Send your availability and any relevant local context.`,
    source: 'brand-portal-venue-radar',
  });
  return `/chat?${params.toString()}`;
}

export const getDefaultResponseTab = (campaign: Campaign): ResponseRailTab => {
  const dare = campaign.linkedDare;
  if (dare?.status === 'VERIFIED' || dare?.status === 'PENDING_PAYOUT') return 'verified';
  if (dare?.status === 'PENDING_REVIEW') return 'review';
  if (dare?.videoUrl) return 'proof';
  if (dare?.claimRequestStatus === 'PENDING' || dare?.claimedBy || dare?.targetWalletAddress) return 'claimed';
  return 'shortlisted';
};

export const formatWallet = (value: string | null | undefined) =>
  value ? `${value.slice(0, 6)}...${value.slice(-4)}` : null;
