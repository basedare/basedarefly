export const OUTCOME_CONTRACT_VERSION = 1 as const;
export const OUTCOME_CONTRACT_SETTLEMENT_FEE_PERCENT = 4 as const;

export const OUTCOME_CONTRACT_FAMILIES = [
  'FIELD_TRUTH',
  'EXPERIENCE_EXECUTION',
  'PUBLICATION',
  'ATTENTION',
  'ARRIVAL_REDEMPTION',
  'QUALIFIED_ACTION',
] as const;

export type OutcomeContractFamily = (typeof OUTCOME_CONTRACT_FAMILIES)[number];

export const ACTIVE_OUTCOME_CONTRACT_FAMILIES = [
  'FIELD_TRUTH',
  'EXPERIENCE_EXECUTION',
  'PUBLICATION',
] as const satisfies readonly OutcomeContractFamily[];

export type ActiveOutcomeContractFamily = (typeof ACTIVE_OUTCOME_CONTRACT_FAMILIES)[number];

export const REPORTED_OUTCOME_KINDS = [
  'YES',
  'NO',
  'PARTIAL',
  'INCONCLUSIVE',
  'COMPLETED',
  'PUBLISHED',
] as const;

export type ReportedOutcomeKind = (typeof REPORTED_OUTCOME_KINDS)[number];

export type ReportedOutcome = {
  kind: ReportedOutcomeKind;
  summary: string;
  observedAt: string;
};

export type MissionCompilerOutput = {
  go: string;
  do: string;
  prove: string;
  win: string;
  earn: string;
};

export type OutcomeContractSnapshot = {
  contractId: string;
  family: ActiveOutcomeContractFamily;
  version: typeof OUTCOME_CONTRACT_VERSION;
  createdAt: string;
  buyerQuestion: string;
  payableOutcomes: string[];
  allowedOptimization: string[];
  prohibitedManipulation: string[];
  requiredEvidence: {
    rung: 'TRUSTED_MEDIA' | 'PRESENCE_ACTION' | 'PUBLIC_ASSET';
    requirements: string[];
  };
  freshness: {
    expiresAt: string | null;
    maximumObservationAgeHours: number | null;
  };
  reviewTriggers: string[];
  payoutTrigger: string;
  retryPolicy: string;
  appealPolicy: string;
  safetyRestrictions: string[];
  rights: {
    baseDareDisplay: boolean;
    sponsorCommercialReuseRequired: boolean;
  };
  permittedReceiptWording: string;
  mission: MissionCompilerOutput;
};

export type OutcomeContractRequest = {
  family?: OutcomeContractFamily | null;
  buyerQuestion?: string | null;
  maximumObservationAgeHours?: number | null;
};

type BuildOutcomeContractInput = OutcomeContractRequest & {
  title: string;
  missionMode: 'IRL' | 'STREAM';
  missionTag?: string | null;
  amount: number;
  locationLabel?: string | null;
  isNearbyDare?: boolean;
  expiresAt?: Date | string | null;
  createdAt?: Date | string;
};

type FamilyPolicy = Omit<
  OutcomeContractSnapshot,
  'contractId' | 'family' | 'version' | 'createdAt' | 'buyerQuestion' | 'freshness' | 'mission'
> & {
  allowedOutcomes: readonly ReportedOutcomeKind[];
  defaultMaximumObservationAgeHours: number | null;
};

const FAMILY_POLICIES: Record<ActiveOutcomeContractFamily, FamilyPolicy> = {
  FIELD_TRUTH: {
    payableOutcomes: [
      'A truthful current YES supported by accepted evidence.',
      'A truthful current NO supported by accepted evidence.',
      'A bounded partial or inconclusive observation when the brief permits it.',
    ],
    allowedOutcomes: ['YES', 'NO', 'PARTIAL', 'INCONCLUSIVE'],
    allowedOptimization: [
      'Choose the safest efficient route to the place.',
      'Ask a willing staff member or local for context when the answer remains independently observable.',
    ],
    prohibitedManipulation: [
      'Do not spoof location, time, media, venue confirmation, or the reported answer.',
      'Do not pressure a venue or person to manufacture the requested state.',
    ],
    requiredEvidence: {
      rung: 'TRUSTED_MEDIA',
      requirements: [
        'A structured answer recorded at submission.',
        'Fresh server-pinned photo or video showing the relevant place context.',
        'Device-reported presence evidence when the mission is location-gated.',
      ],
    },
    defaultMaximumObservationAgeHours: 6,
    reviewTriggers: [
      'Missing, stale, contradictory, duplicated, or low-confidence evidence.',
      'Every paid venue or brand mission remains subject to bounded human review.',
    ],
    payoutTrigger: 'Evidence is accepted for the reported observation, whether the truthful answer is positive or negative.',
    retryPolicy: 'A rejected evidence attempt is immutable. A new attempt requires genuinely new evidence or an explicit appeal.',
    appealPolicy: 'The contributor may appeal a rejected evidence decision; the reported observation is not rewritten by the appeal.',
    safetyRestrictions: [
      'Stay in public or explicitly authorized areas.',
      'Do not trespass, provoke confrontation, impersonate staff, or interfere with normal operations.',
    ],
    rights: {
      baseDareDisplay: true,
      sponsorCommercialReuseRequired: false,
    },
    permittedReceiptWording: 'Evidence accepted for the reported field observation.',
  },
  EXPERIENCE_EXECUTION: {
    payableOutcomes: [
      'The bounded mission action was completed with accepted evidence.',
      'A truthful partial result is payable only when the brief explicitly allows partial completion.',
    ],
    allowedOutcomes: ['COMPLETED', 'PARTIAL'],
    allowedOptimization: [
      'Use personal creativity to complete the action safely within the brief.',
      'Choose an efficient sequence that does not change the required outcome or evidence.',
    ],
    prohibitedManipulation: [
      'Do not stage, spoof, recycle, or edit evidence to imply an action that did not occur.',
      'Do not coerce participants or violate venue rules to complete the action.',
    ],
    requiredEvidence: {
      rung: 'PRESENCE_ACTION',
      requirements: [
        'Fresh server-pinned media showing both the place and the required action.',
        'Presence evidence when the mission is location-gated.',
      ],
    },
    defaultMaximumObservationAgeHours: 12,
    reviewTriggers: [
      'The action, place, freshness, participant consent, or media identity is unclear.',
      'Every paid venue or brand mission remains subject to bounded human review.',
    ],
    payoutTrigger: 'Evidence is accepted that the bounded mission action occurred.',
    retryPolicy: 'A rejected evidence attempt is immutable. Retry with genuinely new evidence or use the appeal path.',
    appealPolicy: 'A contributor may appeal an evidence decision without altering the original attempt.',
    safetyRestrictions: [
      'The action must remain legal, consensual, and within venue or public-space rules.',
      'No dangerous stunts, harassment, trespass, concealed employment, or unlicensed local operation.',
    ],
    rights: {
      baseDareDisplay: true,
      sponsorCommercialReuseRequired: false,
    },
    permittedReceiptWording: 'Evidence accepted for completion of the bounded mission action.',
  },
  PUBLICATION: {
    payableOutcomes: [
      'A compliant public asset was published and remained available for the required review window.',
      'A partial publication result is payable only when the brief explicitly allows it.',
    ],
    allowedOutcomes: ['PUBLISHED', 'PARTIAL'],
    allowedOptimization: [
      'Use creative judgment in presentation while preserving required facts, disclosures, and deliverables.',
      'Optimize the hook and format without inventing venue claims, prices, perks, or outcomes.',
    ],
    prohibitedManipulation: [
      'Do not fabricate publication URLs, engagement, disclosures, venue approval, or deliverable compliance.',
      'Do not grant sponsor commercial reuse unless the contributor separately opted in to the reviewed terms.',
    ],
    requiredEvidence: {
      rung: 'PUBLIC_ASSET',
      requirements: [
        'Server-pinned source asset or upload.',
        'Public URL and brief-compliance check.',
        'Explicit versioned rights consent before any sponsor commercial reuse.',
      ],
    },
    defaultMaximumObservationAgeHours: 24,
    reviewTriggers: [
      'The asset URL, disclosure, brief compliance, source media, or rights consent is missing or unclear.',
      'Attention screenshots alone never prove business impact.',
    ],
    payoutTrigger: 'The required public asset and evidence clear the contract review.',
    retryPolicy: 'A replacement asset is a new submission; earlier attempts remain in the evidence ledger.',
    appealPolicy: 'The contributor may appeal a compliance decision with supporting context.',
    safetyRestrictions: [
      'Do not publish private personal information or film people where consent is required.',
      'Do not make unsupported safety, availability, price, perk, or performance claims.',
    ],
    rights: {
      baseDareDisplay: true,
      sponsorCommercialReuseRequired: true,
    },
    permittedReceiptWording: 'The submitted public asset cleared the versioned publication brief.',
  },
};

function cleanText(value: string | null | undefined, fallback: string, maxLength: number): string {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  return (normalized || fallback).slice(0, maxLength);
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

export function isActiveOutcomeContractFamily(
  family: OutcomeContractFamily,
): family is ActiveOutcomeContractFamily {
  return (ACTIVE_OUTCOME_CONTRACT_FAMILIES as readonly string[]).includes(family);
}

export function inferOutcomeContractFamily(input: {
  missionMode: 'IRL' | 'STREAM';
  missionTag?: string | null;
}): ActiveOutcomeContractFamily {
  const tag = input.missionTag?.trim().toLowerCase() ?? '';
  if (tag === 'field-truth' || tag === 'place-check' || tag === 'local-signal') return 'FIELD_TRUTH';
  if (input.missionMode === 'STREAM' || tag === 'publication' || tag === 'brand-campaign') return 'PUBLICATION';
  return 'EXPERIENCE_EXECUTION';
}

export function buildOutcomeContractSnapshot(input: BuildOutcomeContractInput): OutcomeContractSnapshot {
  const requestedFamily = input.family ?? inferOutcomeContractFamily(input);
  if (!OUTCOME_CONTRACT_FAMILIES.includes(requestedFamily)) {
    throw new Error('Unknown outcome contract family.');
  }
  if (!isActiveOutcomeContractFamily(requestedFamily)) {
    throw new Error(`${requestedFamily} outcome contracts are not active in the alpha.`);
  }

  const title = cleanText(input.title, 'Complete the BaseDare mission', 200);
  const buyerQuestion = cleanText(input.buyerQuestion, title, 500);
  const location = cleanText(input.locationLabel, 'the mission location', 160);
  const createdAt = toIso(input.createdAt ?? new Date()) ?? new Date().toISOString();
  const expiresAt = toIso(input.expiresAt);
  const policy = FAMILY_POLICIES[requestedFamily];
  const maximumObservationAgeHours =
    input.maximumObservationAgeHours == null
      ? policy.defaultMaximumObservationAgeHours
      : Math.max(1, Math.min(168, Math.round(input.maximumObservationAgeHours)));

  if (requestedFamily === 'FIELD_TRUTH' && !input.isNearbyDare) {
    throw new Error('Field Truth contracts require a location-bound mission.');
  }

  const reviewExpectation = input.amount > 0 ? 'review before payout' : 'review before the receipt is accepted';
  // Keep this policy module dependency-free so the native Node policy-test
  // runner can execute it without Next.js path-alias resolution. A regression
  // test locks this value to SETTLEMENT_SPLIT in financial-canon.ts.
  const grossReward = Math.round(input.amount * 100) / 100;
  const settlementFee = Math.round(
    grossReward * OUTCOME_CONTRACT_SETTLEMENT_FEE_PERCENT,
  ) / 100;
  const completerPayout = Math.round((grossReward - settlementFee) * 100) / 100;
  const mission: MissionCompilerOutput = {
    go: input.missionMode === 'STREAM' ? 'Open the assigned digital brief.' : `Go to ${location} before the mission expires.`,
    do:
      requestedFamily === 'FIELD_TRUTH'
        ? `Answer the buyer question honestly: ${buyerQuestion}`
        : title,
    prove: policy.requiredEvidence.requirements.join(' '),
    win:
      requestedFamily === 'FIELD_TRUTH'
        ? 'A supported YES, NO, partial, or inconclusive observation counts. Good news is not required.'
        : policy.payableOutcomes[0],
    earn: `${completerPayout.toFixed(2)} USDC after ${reviewExpectation} (${grossReward.toFixed(2)} USDC gross reward less the ${OUTCOME_CONTRACT_SETTLEMENT_FEE_PERCENT}% settlement fee).`,
  };

  return {
    contractId: `${requestedFamily}:v${OUTCOME_CONTRACT_VERSION}`,
    family: requestedFamily,
    version: OUTCOME_CONTRACT_VERSION,
    createdAt,
    buyerQuestion,
    payableOutcomes: [...policy.payableOutcomes],
    allowedOptimization: [...policy.allowedOptimization],
    prohibitedManipulation: [...policy.prohibitedManipulation],
    requiredEvidence: {
      rung: policy.requiredEvidence.rung,
      requirements: [...policy.requiredEvidence.requirements],
    },
    freshness: {
      expiresAt,
      maximumObservationAgeHours,
    },
    reviewTriggers: [...policy.reviewTriggers],
    payoutTrigger: policy.payoutTrigger,
    retryPolicy: policy.retryPolicy,
    appealPolicy: policy.appealPolicy,
    safetyRestrictions: [...policy.safetyRestrictions],
    rights: { ...policy.rights },
    permittedReceiptWording: policy.permittedReceiptWording,
    mission,
  };
}

export function parseOutcomeContractSnapshot(value: unknown): OutcomeContractSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<OutcomeContractSnapshot>;
  if (
    candidate.version !== OUTCOME_CONTRACT_VERSION ||
    !candidate.family ||
    !isActiveOutcomeContractFamily(candidate.family as OutcomeContractFamily) ||
    typeof candidate.buyerQuestion !== 'string' ||
    !candidate.mission ||
    typeof candidate.mission !== 'object'
  ) {
    return null;
  }
  return candidate as OutcomeContractSnapshot;
}

export function getAllowedReportedOutcomes(
  snapshot: OutcomeContractSnapshot,
): readonly ReportedOutcomeKind[] {
  return FAMILY_POLICIES[snapshot.family].allowedOutcomes;
}

export function validateReportedOutcome(
  snapshotValue: unknown,
  input: unknown,
): { ok: true; value: ReportedOutcome } | { ok: false; error: string } {
  const snapshot = parseOutcomeContractSnapshot(snapshotValue);
  if (!snapshot) {
    return { ok: false, error: 'This mission does not have a readable outcome contract.' };
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Report what happened before submitting evidence.' };
  }
  const candidate = input as Partial<ReportedOutcome>;
  if (!candidate.kind || !REPORTED_OUTCOME_KINDS.includes(candidate.kind)) {
    return { ok: false, error: 'Choose the outcome that actually happened.' };
  }
  if (!getAllowedReportedOutcomes(snapshot).includes(candidate.kind)) {
    return { ok: false, error: `${candidate.kind} is not a valid result for this mission contract.` };
  }
  const summary = candidate.summary?.replace(/\s+/g, ' ').trim() ?? '';
  if (summary.length < 3 || summary.length > 280) {
    return { ok: false, error: 'Outcome summary must be between 3 and 280 characters.' };
  }
  const observedAt = toIso(candidate.observedAt);
  if (!observedAt) {
    return { ok: false, error: 'Outcome observation time is invalid.' };
  }
  const observedMs = Date.parse(observedAt);
  const createdMs = Date.parse(snapshot.createdAt);
  const maximumAge = snapshot.freshness.maximumObservationAgeHours;
  if (observedMs > Date.now() + 5 * 60 * 1000) {
    return { ok: false, error: 'Outcome observation time cannot be in the future.' };
  }
  if (Number.isFinite(createdMs) && observedMs < createdMs - 5 * 60 * 1000) {
    return { ok: false, error: 'Outcome observation predates this funded mission.' };
  }
  if (maximumAge != null && Date.now() - observedMs > maximumAge * 60 * 60 * 1000) {
    return { ok: false, error: 'This observation is too old for the mission contract.' };
  }
  return { ok: true, value: { kind: candidate.kind, summary, observedAt } };
}

export function formatAcceptedOutcomeReceipt(input: {
  snapshot: unknown;
  reportedOutcome: unknown;
}): string | null {
  const snapshot = parseOutcomeContractSnapshot(input.snapshot);
  if (!snapshot || !input.reportedOutcome || typeof input.reportedOutcome !== 'object') return null;
  const outcome = input.reportedOutcome as Partial<ReportedOutcome>;
  if (!outcome.kind || !outcome.summary) return null;
  return `${snapshot.permittedReceiptWording} Reported ${outcome.kind.toLowerCase()}: ${outcome.summary}`;
}
