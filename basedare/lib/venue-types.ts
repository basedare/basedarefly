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
