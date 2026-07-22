export type GrowthOwner =
  | 'Founder / closer'
  | 'Growth administrator'
  | 'Contributor router'
  | 'Field Station keeper'
  | 'Verifier / ops';

export type GrowthLane = 'money' | 'trust' | 'buyer' | 'supply' | 'distribution';

export type GrowthQuestStatus = 'ready' | 'blocked' | 'complete';

export type GrowthScoreSignal = {
  id: string;
  label: string;
  count: number;
  pointsEach: number;
  points: number;
  evidence: string;
};

export type GrowthQuest = {
  id: string;
  title: string;
  lane: GrowthLane;
  owner: GrowthOwner;
  priority: number;
  status: GrowthQuestStatus;
  why: string;
  definitionOfDone: string;
  evidence: string[];
  href: string;
  scoreOutcome: string;
  approvalGate: string | null;
};

export type GrowthTarget = {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  evidence: string;
};

export type GrowthRole = {
  id: string;
  title: GrowthOwner;
  mission: string;
  dailyOutputs: string[];
  allowed: string[];
  forbidden: string[];
  successMetric: string;
};

export type GrowthScoreInputs = {
  fundedSprints: number;
  completedSprints: number;
  buyerRepeatRequests: number;
  settledDares: number;
  approvedPlaceRecords: number;
  verifiedStationArrivals: number;
  confirmedCheckIns: number;
};

export type GrowthOperatingInputs = GrowthScoreInputs & {
  reviewQueue: number;
  payoutBacklog: number;
  activeVenueLeads: number;
  overdueVenueLeads: number;
  activeActivationIntakes: number;
  overdueActivationIntakes: number;
  activeCreators: number;
  fieldStationCount: number;
  activeSprint: {
    id: string;
    receiptCode: string;
    buyerLabel: string;
    question: string;
    status: string;
    missionCount: number;
  } | null;
  completedSprintAwaitingDecision: {
    id: string;
    receiptCode: string;
    buyerLabel: string;
  } | null;
  dailyCommand: {
    title: string;
    why: string;
    nextAction: string;
    href: string;
    evidence: string[];
  } | null;
};

export type GrowthOsReport = {
  generatedAt: string;
  period: {
    label: string;
    start: string;
    end: string;
  };
  score: {
    total: number;
    level: string;
    nextLevel: string | null;
    nextLevelAt: number | null;
    pointsToNextLevel: number;
    signals: GrowthScoreSignal[];
  };
  headline: {
    title: string;
    detail: string;
  };
  today: GrowthQuest[];
  weeklyTargets: GrowthTarget[];
  roles: GrowthRole[];
  antiGamingRules: string[];
  approvalGates: string[];
  operatingCadence: {
    daily: Array<{ block: string; minutes: number; output: string }>;
    weekly: Array<{ day: string; command: string; output: string }>;
  };
};
