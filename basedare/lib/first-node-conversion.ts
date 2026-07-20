export const FIRST_NODE_RESPONSE_TYPES = [
  'REQUEST_PILOT',
  'CORRECT_REPORT',
  'ASK_QUESTION',
  'DECLINE',
] as const;

export const FIRST_NODE_TERMS_VERSION = 'first-node-pilot-v1';

export const ACTIVATION_CLOSE_ROOM_DECISIONS = [
  'APPROVE_SCOPE',
  'NEEDS_INFO',
  'CORRECT_SCOPE',
  'DECLINE',
] as const;

export type FirstNodeResponseType = (typeof FIRST_NODE_RESPONSE_TYPES)[number];
export type ActivationCloseRoomDecision = (typeof ACTIVATION_CLOSE_ROOM_DECISIONS)[number];

export type ActivationIntakeStatus =
  | 'NEW'
  | 'QUALIFIED'
  | 'NEEDS_INFO'
  | 'READY_TO_INVOICE'
  | 'PAYMENT_SENT'
  | 'PAID_CONFIRMED'
  | 'LAUNCHED'
  | 'REJECTED';

export type FirstNodeEvidenceItem = {
  label: 'VERIFIED' | 'PUBLIC SIGNAL' | 'PILOT PREVIEW — NOT YET FUNDED';
  title: string;
  detail: string;
};

export type FirstNodeDecisionBrief = {
  state: 'PROVEN' | 'UNSIGNED';
  summary: string;
  question: string;
  action: string;
  evidenceRequired: string;
  decisionRule: string;
  budget: string;
  deliverables: string[];
  nonPromises: string[];
  evidence: FirstNodeEvidenceItem[];
};

function plural(value: number, singular: string, multiple = `${singular}s`) {
  return `${value} ${value === 1 ? singular : multiple}`;
}

export function buildFirstNodeDecisionBrief(input: {
  venueName: string;
  acceptedProofs: number;
  verifiedOutcomes: number;
  checkIns: number;
  publicSignalDetail: string;
}): FirstNodeDecisionBrief {
  const acceptedProofs = Math.max(0, Math.floor(input.acceptedProofs));
  const verifiedOutcomes = Math.max(0, Math.floor(input.verifiedOutcomes));
  const checkIns = Math.max(0, Math.floor(input.checkIns));
  const hasAcceptedEvidence = acceptedProofs > 0 || verifiedOutcomes > 0 || checkIns > 0;
  const question = `What do four independent, time-bounded field checks establish about ${input.venueName} during the agreed freshness window?`;

  const evidence: FirstNodeEvidenceItem[] = [];
  if (hasAcceptedEvidence) {
    evidence.push({
      label: 'VERIFIED',
      title: 'Accepted BaseDare evidence',
      detail: [
        plural(acceptedProofs, 'accepted proof'),
        plural(verifiedOutcomes, 'verified outcome'),
        plural(checkIns, 'secure check-in'),
      ].join(' · '),
    });
  }

  evidence.push({
    label: 'PUBLIC SIGNAL',
    title: 'Venue identity and local context',
    detail: input.publicSignalDetail,
  });
  evidence.push({
    label: 'PILOT PREVIEW — NOT YET FUNDED',
    title: 'One bounded Verified Field Sprint',
    detail: question,
  });

  return {
    state: hasAcceptedEvidence ? 'PROVEN' : 'UNSIGNED',
    summary: hasAcceptedEvidence
      ? `${input.venueName} has accepted BaseDare evidence. The next decision is whether a new bounded question is worth funding.`
      : `${input.venueName} is mapped, but BaseDare has not yet proven a buyer outcome here. This is a decision brief, not a partnership claim or verification certificate.`,
    question,
    action:
      'Agree one freshness window and one observable place question. BaseDare compiles four independent missions through the existing claim, proof-review, and payout rail.',
    evidenceRequired:
      'Accepted proof or secure check-in tied to the agreed place, window, mission, and reviewer decision. Directions opens, page views, and proposals are not arrivals.',
    decisionRule:
      'Repeat only if the accepted evidence answers the question usefully; otherwise adjust once or stop.',
    budget:
      '$2,500 total: $2,000 managed service plus a separate $500 contributor reward pool. A documented design-partner exception may waive only the service fee; the reward pool remains funded.',
    deliverables: [
      'One approved venue question',
      'Four independent $125 Field Truth missions',
      'Reviewed evidence, contributor payouts, and refreshable place memory',
      'One conservative buyer receipt with a repeat, adjust, or stop recommendation',
    ],
    nonPromises: [
      'No guaranteed foot traffic, purchases, reach, or creator output',
      'No venue partnership implied before an authorized person approves',
      'No sponsor commercial-reuse rights without separate explicit consent',
    ],
    evidence,
  };
}

export function responseEventType(responseType: FirstNodeResponseType) {
  switch (responseType) {
    case 'REQUEST_PILOT':
      return 'PILOT_REQUESTED' as const;
    case 'CORRECT_REPORT':
      return 'CORRECTION_SUBMITTED' as const;
    case 'ASK_QUESTION':
      return 'QUESTION_SUBMITTED' as const;
    case 'DECLINE':
      return 'DECLINED' as const;
  }
}

export function nextActivationCloseRoomStatus(
  currentStatus: ActivationIntakeStatus,
  decision: ActivationCloseRoomDecision
): ActivationIntakeStatus {
  if (currentStatus === 'PAID_CONFIRMED' || currentStatus === 'LAUNCHED') return currentStatus;
  if (decision === 'APPROVE_SCOPE') {
    return currentStatus === 'NEW' || currentStatus === 'NEEDS_INFO' ? 'QUALIFIED' : currentStatus;
  }
  if (decision === 'DECLINE') {
    return currentStatus === 'NEW' || currentStatus === 'QUALIFIED' || currentStatus === 'NEEDS_INFO'
      ? 'REJECTED'
      : currentStatus;
  }
  if (decision === 'NEEDS_INFO' || decision === 'CORRECT_SCOPE') {
    return currentStatus === 'NEW' || currentStatus === 'QUALIFIED' ? 'NEEDS_INFO' : currentStatus;
  }
  return currentStatus;
}
