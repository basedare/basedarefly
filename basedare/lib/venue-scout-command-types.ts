export type VenueScoutLeadPriority = {
  score: number;
  label: 'Immediate' | 'High' | 'Active' | 'Monitor';
  reasons: string[];
  staleHours: number;
  isOverdue: boolean;
};

export type VenueScoutPitch = {
  subject: string;
  opener: string;
  bullets: string[];
  cta: string;
  emailBody: string;
};

export type VenueScoutSuggestedDare = {
  title: string;
  bountyRange: string;
  proofHook: string;
  why: string;
};

export type VenueScoutActivationHandoff = {
  source: 'venue-scout-command';
  href: string;
  absoluteHref: string;
  auditBrief: string;
  outreachSubject: string;
  outreachBody: string;
  buyerGoal: 'foot_traffic';
  packageId: 'pilot-drop';
  budgetRange: '500_1500';
  nextAction: string;
  approvalChecklist: string[];
};

export type VenueScoutLead = {
  id: string;
  audience: string;
  intent: string | null;
  followUpStatus: string;
  ownerWallet: string | null;
  nextActionAt: string | null;
  contactedAt: string;
  routeCluster: string;
  opportunity: string;
  nextAction: string;
  priority: VenueScoutLeadPriority;
  contact: {
    email: string;
    name: string | null;
    organization: string | null;
  };
  venue: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
    categories: string[];
    isPartner: boolean;
    partnerTier: string | null;
    claimedBy: string | null;
    claimRequestStatus: string | null;
  };
  metrics: {
    checkIns: number;
    dares: number;
    campaigns: number;
    placeTags: number;
    reportLeads: number;
    memoryCheckIns: number;
    memoryUniqueVisitors: number;
    memoryCompletedDares: number;
  };
  pipeline: {
    stage: string;
    stageLabel: string;
    latestEventLabel: string;
    latestEventAt: string | null;
  };
  pitch: VenueScoutPitch;
  suggestedDare: VenueScoutSuggestedDare;
  activationHandoff: VenueScoutActivationHandoff;
  links: {
    venue: string;
    report: string;
    map: string;
  };
};

export type VenueScoutRouteCluster = {
  id: string;
  label: string;
  leadCount: number;
  immediateCount: number;
  topScore: number;
  totalScore: number;
  suggestedRoute: string[];
  nextMove: string;
};

export type VenueScoutSeedCandidate = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  routeCluster: string;
  score: number;
  reasons: string[];
  metrics: {
    checkIns: number;
    dares: number;
    campaigns: number;
    placeTags: number;
    memoryCheckIns: number;
    memoryCompletedDares: number;
  };
  suggestedAngle: string;
  activationHandoff: VenueScoutActivationHandoff;
  links: {
    venue: string;
    report: string;
    map: string;
  };
};

export type VenueScoutCommandReport = {
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
  routeClusters: VenueScoutRouteCluster[];
  leads: VenueScoutLead[];
  seedCandidates: VenueScoutSeedCandidate[];
};
