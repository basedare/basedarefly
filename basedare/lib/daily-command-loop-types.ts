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
    activeCampaigns: number;
    openCampaignSlots: number;
    recentDares: number;
    recentVenueLeads: number;
    recentPlaceTags: number;
    recentCheckIns: number;
  };
};
