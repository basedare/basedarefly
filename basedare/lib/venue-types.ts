export type VenueMemorySummary = {
  bucketType: string;
  bucketStartAt: string;
  bucketEndAt: string;
  checkInCount: number;
  uniqueVisitorCount: number;
  dareCount: number;
  completedDareCount: number;
  proofCount: number;
  perkRedemptionCount: number;
  topCreatorTag: string | null;
};

export type VenueTagSummary = {
  approvedCount: number;
  heatScore: number;
  lastTaggedAt: string | null;
};

export type VenueRecentTag = {
  id: string;
  creatorTag: string | null;
  walletAddress: string;
  caption: string | null;
  vibeTags: string[];
  proofMediaUrl: string;
  proofType: string;
  source?: string | null;
  submittedAt: string;
  firstMark: boolean;
  isOwn?: boolean;
};

export type VenueCreatorContribution = {
  walletAddress: string;
  creatorTag: string | null;
  totalMarksHere: number;
  totalWinsHere: number;
  firstMarksHere: number;
  pulseContribution: number;
  shareOfVenuePulse: number;
  lastMarkedAt: string | null;
  isTopLocalSignal: boolean;
};

export type VenueSessionSummary = {
  id: string;
  scope: string;
  status: string;
  label: string | null;
  campaignLabel: string | null;
  rotationSeconds: number;
  startedAt: string;
  endsAt: string | null;
  lastRotatedAt: string;
  pausedAt: string | null;
  lastCheckInAt: string | null;
};

export type VenueCommandCenterSummary = {
  status: 'live' | 'claimable';
  claimState: 'unclaimed' | 'pending' | 'claimed';
  label: string;
  summary: string;
  sponsorReady: boolean;
  activeCampaignCount: number;
  consoleUrl: string | null;
  contactUrl: string;
  contactLabel: string;
  operatorTag: string | null;
  metrics: {
    approvedMarks: number;
    activeChallenges: number;
    paidActivations: number;
    totalLiveFundingUsd: number;
    uniqueVisitorsToday: number | null;
    scansLastHour: number | null;
  };
};

export type VenueExperienceMode = {
  id: 'classic' | 'noir' | 'ar';
  status: 'live' | 'planned';
  label: string;
  description: string;
};

export type VenueActivationInsight = {
  timeframeLabel: string;
  summary: string;
  repeatReady: boolean;
  reasons: string[];
  bestActivation: {
    id: string;
    shortId: string;
    title: string;
    bounty: number;
    brandName: string | null;
    campaignTitle: string | null;
    streamerHandle: string | null;
    status: string;
    claimRequestStatus: string | null;
    claimRequestTag: string | null;
    claimedBy: string | null;
    targetWalletAddress: string | null;
    expiresAt: string | null;
    createdAt: string;
  } | null;
  lift: {
    recentCompletedCount: number;
    completedDelta: number;
    uniqueVisitorDelta: number;
    checkInDelta: number;
  };
};

export type BrandVenueRadarItem = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  claimState: VenueCommandCenterSummary['claimState'];
  commandStatus: VenueCommandCenterSummary['status'];
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
  topCreators: VenueTopCreator[];
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
};

export type VenueTopCreator = {
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
};

export type NearbyVenueItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  categories: string[];
  status: string;
  isPartner: boolean;
  partnerTier: string | null;
  checkInRadiusMeters: number;
  qrRotationSeconds: number;
  distanceKm: number;
  distanceDisplay: string;
  memorySummary: VenueMemorySummary | null;
  tagSummary: VenueTagSummary;
  liveSession: VenueSessionSummary | null;
  commandCenter: VenueCommandCenterSummary;
  mapModes: VenueExperienceMode[];
  activeDareCount: number;
  checkInCount: number;
};

export type VenueDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  categories: string[];
  status: string;
  isPartner: boolean;
  partnerTier: string | null;
  qrMode: string;
  qrRotationSeconds: number;
  checkInRadiusMeters: number;
  memorySummary: VenueMemorySummary | null;
  memoryHistory: VenueMemorySummary[];
  tagSummary: VenueTagSummary;
  liveSession: VenueSessionSummary | null;
  commandCenter: VenueCommandCenterSummary;
  mapModes: VenueExperienceMode[];
  activationInsight: VenueActivationInsight;
  liveStats: {
    scansLastHour: number;
    uniqueVisitorsToday: number;
    activeDares: number;
  };
  recentCheckIns: Array<{
    tag: string | null;
    walletAddress: string;
    proofLevel: string;
    scannedAt: string;
  }>;
  recentTags: VenueRecentTag[];
  topCreators: VenueTopCreator[];
  creatorContribution: VenueCreatorContribution | null;
  activeDares: Array<{
    id: string;
    shortId: string;
    title: string;
    missionMode: string;
    bounty: number;
    status: string;
    streamerHandle: string | null;
    expiresAt: string | null;
    createdAt: string;
    campaignTitle: string | null;
    brandName: string | null;
    targetWalletAddress: string | null;
    claimedBy: string | null;
    claimRequestTag: string | null;
    claimRequestedAt: string | null;
    claimRequestStatus: string | null;
  }>;
  paidActivationCount: number;
  featuredPaidActivation: {
    id: string;
    shortId: string;
    title: string;
    missionMode: string;
    bounty: number;
    status: string;
    streamerHandle: string | null;
    expiresAt: string | null;
    createdAt: string;
    campaignTitle: string | null;
    brandName: string | null;
    targetWalletAddress: string | null;
    claimedBy: string | null;
    claimRequestTag: string | null;
    claimRequestedAt: string | null;
    claimRequestStatus: string | null;
  } | null;
  consoleUrl: string;
};

export type VenueQrPayload = {
  token: string;
  scope: string;
  venueId: string;
  sessionId: string;
  venueSlug: string;
  windowStartedAt: string;
  expiresAt: string;
  qrValue: string;
};
