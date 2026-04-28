export type FounderScoreboardTone = 'critical' | 'warning' | 'active' | 'positive' | 'neutral';

export type FounderScoreboardMetric = {
  id: string;
  label: string;
  value: string | number;
  detail: string;
  tone: FounderScoreboardTone;
};

export type FounderScoreboardFunnelStep = {
  id: string;
  label: string;
  count: number;
  amount: number;
  detail: string;
  tone: FounderScoreboardTone;
};

export type FounderLedgerEventType =
  | 'dare_created'
  | 'dare_funded'
  | 'proof_submitted'
  | 'dare_settled'
  | 'payout_queued'
  | 'dare_refunded'
  | 'dare_failed'
  | 'campaign_slot_paid'
  | 'venue_check_in'
  | 'place_tag_submitted';

export type FounderLedgerEvent = {
  id: string;
  type: FounderLedgerEventType;
  label: string;
  title: string;
  occurredAt: string;
  amount: number | null;
  detail: string;
  href: string;
  status: string | null;
  actor: string | null;
  venue: {
    name: string;
    slug: string;
    city: string | null;
  } | null;
  tone: FounderScoreboardTone;
};

export type FounderScoreboardCommandSignal = {
  tone: FounderScoreboardTone;
  cashPriority: number;
  trustPriority: number;
  placePriority: number;
  growthPriority: number;
  suggestedCommand: string;
  evidence: string[];
};

export type FounderScoreboardReport = {
  generatedAt: string;
  period: {
    label: string;
    start: string;
    end: string;
  };
  headline: {
    title: string;
    detail: string;
    tone: FounderScoreboardTone;
  };
  money: {
    createdGmv: number;
    fundedGmv: number;
    settledGmv: number;
    liveGmv: number;
    pendingPayoutGmv: number;
    refundedGmv: number;
    failedGmv: number;
    realizedRevenue: number;
    consumerRevenue: number;
    campaignRevenue: number;
    averageSettledBounty: number;
    completionRate: number;
    refundRate: number;
  };
  trust: {
    proofSubmissions: number;
    reviewQueue: number;
    payoutBacklog: number;
    failedDares: number;
    refundedDares: number;
  };
  growth: {
    createdDares: number;
    fundedDares: number;
    settledDares: number;
    activeCampaigns: number;
    openCampaignSlots: number;
    activeVenueLeads: number;
    newVenueLeads: number;
    activeCreators: number;
    newCreatorTags: number;
  };
  place: {
    checkIns: number;
    activeVenues: number;
    placeTags: number;
    approvedPlaceTags: number;
    venueLinkedDares: number;
    partnerVenueCheckIns: number;
  };
  scorecard: FounderScoreboardMetric[];
  funnel: FounderScoreboardFunnelStep[];
  ledger: FounderLedgerEvent[];
  insights: string[];
  watchouts: string[];
  commandSignal: FounderScoreboardCommandSignal;
};
