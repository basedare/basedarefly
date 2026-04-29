export type DailyCommandRiskTier = 'auto' | 'review' | 'human';

export type DailyCommandTone = 'critical' | 'warning' | 'active' | 'positive' | 'neutral';

export type DailyCommandMetric = {
  id: string;
  label: string;
  value: string | number;
  detail: string;
  tone: DailyCommandTone;
};

export type DailyCommandItem = {
  id: string;
  title: string;
  workstream: 'ops' | 'growth' | 'trust' | 'money' | 'market';
  riskTier: DailyCommandRiskTier;
  priority: number;
  why: string;
  nextAction: string;
  href: string;
  evidence: string[];
};

export type DailyReviewItem = {
  id: string;
  title: string;
  count: number;
  owner: 'Human' | 'Ops' | 'Moderator' | 'Founder';
  riskTier: DailyCommandRiskTier;
  nextAction: string;
  href: string;
};

export type DailyVenueScoutBrief = {
  generatedAt: string;
  currentCommand: {
    title: string;
    detail: string;
    nextAction: string;
  };
  summary: {
    totalLeads: number;
    immediateLeads: number;
    highLeads: number;
    unownedLeads: number;
    overdueLeads: number;
    activeRoutes: number;
    seedCandidates: number;
    topRoute: string | null;
  };
  topRoute: {
    label: string;
    leadCount: number;
    immediateCount: number;
    topScore: number;
    nextMove: string;
    suggestedRoute: string[];
  } | null;
  topLead: {
    venueName: string;
    routeCluster: string;
    priorityLabel: string;
    score: number;
    nextAction: string;
    reasons: string[];
    href: string;
  } | null;
  topSeedCandidate: {
    venueName: string;
    routeCluster: string;
    score: number;
    suggestedAngle: string;
    reasons: string[];
    href: string;
  } | null;
};

export type DailyPlaceTagReviewPressure = {
  totalPending: number;
  overdue: number;
  dueSoon: number;
  firstMarks: number;
  oldestQueuedLabel: string;
  topVenue: {
    name: string;
    slug: string;
    city: string | null;
    country: string | null;
    creatorLabel: string;
    submittedAt: string;
    reviewLabel: string;
    reviewDetail: string;
  } | null;
};

export type DailyCommandLoopReport = {
  generatedAt: string;
  period: {
    label: string;
    start: string;
    end: string;
  };
  objective: {
    title: string;
    detail: string;
  };
  currentSignal: {
    title: string;
    detail: string;
    tone: DailyCommandTone;
  };
  scorecard: DailyCommandMetric[];
  commandStack: DailyCommandItem[];
  needsReview: DailyReviewItem[];
  safeAutomaticWork: DailyCommandItem[];
  learnings: string[];
  watchouts: string[];
  founderPulse: {
    settledGmv: number;
    realizedRevenue: number;
    liveGmv: number;
    completionRate: number;
    checkIns: number;
    activeVenues: number;
    suggestedCommand: string;
    tone: DailyCommandTone;
    evidence: string[];
  };
  venueScout: DailyVenueScoutBrief;
  placeTagReview: DailyPlaceTagReviewPressure;
  sourceSignals: {
    moderationReady: number;
    payoutBacklog: number;
    activeVenueLeads: number;
    overdueVenueLeads: number;
    unownedVenueLeads: number;
    pendingClaims: number;
    pendingVenueClaims: number;
    pendingCreatorTags: number;
    pendingPlaceTags: number;
    overduePlaceTags: number;
    dueSoonPlaceTags: number;
    activeCampaigns: number;
    openCampaignSlots: number;
    recentDares: number;
    recentVenueLeads: number;
    recentPlaceTags: number;
    recentCheckIns: number;
    venueScoutRoutes: number;
    venueScoutSeedCandidates: number;
  };
};
