export type MissionControlTone = 'critical' | 'warning' | 'active' | 'positive' | 'neutral';

export const FIRST_SPARK_RUN_STAGES = [
  'draft',
  'scheduled',
  'live',
  'proof-review',
  'recap-sent',
  'repeat-ask',
] as const;

export type FirstSparkRunStage = typeof FIRST_SPARK_RUN_STAGES[number];

export type FirstSparkMissionStatus =
  | 'pilot-ready'
  | 'scheduled'
  | 'live'
  | 'proof-review'
  | 'recap'
  | 'repeat';

export type FirstSparkRunSheet = {
  id: string | null;
  persisted: boolean;
  stage: FirstSparkRunStage;
  stageLabel: string;
  tone: MissionControlTone;
  scheduledAt: string | null;
  creatorSlots: number;
  invitedCreators: number;
  acceptedCreators: number;
  showedCreators: number;
  proofsAccepted: number;
  guestCheckIns: number;
  perkRedemptions: number;
  opsMinutes: number;
  recapSentAt: string | null;
  repeatOutcome: 'none' | 'asked' | 'interested' | 'won' | 'lost';
  note: string | null;
  nextAction: string;
  updatedAt: string | null;
};

export type FirstSparkMissionRow = {
  id: string;
  venue: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    categories: string[];
    isPartner: boolean;
  };
  status: FirstSparkMissionStatus;
  statusLabel: string;
  tone: MissionControlTone;
  missionTitle: string;
  guestMission: string;
  perkLabel: string;
  proofLabel: string;
  score: number;
  runSheet: FirstSparkRunSheet;
  metrics: {
    checkIns: number;
    uniqueVisitors: number;
    proofs: number;
    acceptedProofs: number;
    liveDares: number;
    activeCreators: number;
    perkRedemptions: number;
    leadCount: number;
  };
  nextAction: string;
  links: {
    venue: string;
    create: string;
    guestMission: string;
    recap: string;
    console: string;
  };
};

export type FirstSparkCreatorReliability = {
  tag: string;
  tone: MissionControlTone;
  statusLabel: string;
  missionsAccepted: number;
  completedMissions: number;
  proofsAccepted: number;
  noShowRisk: number;
  placeMarks: number;
  venueReach: number;
  latestSignalAt: string | null;
  nextAction: string;
  links: {
    passport: string;
    invite: string;
  };
};

export type FirstSparkGuestPerkRow = {
  id: string;
  venueSlug: string;
  venueName: string;
  tone: MissionControlTone;
  statusLabel: string;
  perkLabel: string;
  checkIns: number;
  redemptions: number;
  guestMission: string;
  nextAction: string;
  links: {
    venue: string;
    console: string;
    guestMission: string;
  };
};

export type FirstSparkRecapPreview = {
  venueName: string;
  venueSlug: string;
  missionTitle: string;
  statusLabel: string;
  participants: number;
  checkIns: number;
  proofs: number;
  acceptedProofs: number;
  contentLinks: number;
  perkRedemptions: number;
  noShowRisk: number;
  costPerUsefulAction: string;
  recommendedNextMission: string;
  links: {
    recap: string;
    repeat: string;
  };
};

export type FirstSparkPilotTarget = {
  id: string;
  label: string;
  current: number;
  target: number;
  detail: string;
  tone: MissionControlTone;
};

export type FirstSparkMissionControlReport = {
  generatedAt: string;
  market: {
    label: string;
    city: string;
    targetWindow: string;
  };
  command: {
    title: string;
    nextAction: string;
    detail: string;
  };
  summary: {
    venues: number;
    liveOrReviewMissions: number;
    readyCreators: number;
    checkIns: number;
    acceptedProofs: number;
    repeatReadyVenues: number;
  };
  missions: FirstSparkMissionRow[];
  recap: FirstSparkRecapPreview | null;
  creators: FirstSparkCreatorReliability[];
  guestPerks: FirstSparkGuestPerkRow[];
  pilotTargets: FirstSparkPilotTarget[];
};
