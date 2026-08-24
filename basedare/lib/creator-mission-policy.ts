export type CreatorMissionFamily = 'FIELD_TRUTH' | 'EXPERIENCE_EXECUTION' | 'PUBLICATION';

export type CreatorMissionSnapshot = {
  family?: string | null;
  mission?: {
    do?: string | null;
    prove?: string | null;
  } | null;
  safetyRestrictions?: string[] | null;
  prohibitedManipulation?: string[] | null;
  rights?: {
    baseDareDisplay?: boolean;
    sponsorCommercialReuseRequired?: boolean;
  } | null;
};

export type CreatorMissionRecord = {
  status: string;
  title: string;
  bounty: number;
  isSimulated: boolean;
  missionMode: string | null;
  tag: string | null;
  streamerHandle: string | null;
  claimedBy: string | null;
  targetWalletAddress: string | null;
  claimRequestStatus: string | null;
  expiresAt: Date | null;
  outcomeContractSnapshot: unknown;
};

const OPEN_HANDLES = new Set(['@open', '@everyone']);

const TEST_DARE_PATTERNS: RegExp[] = [
  /smoke/i,
  /autocreate/i,
  /acceptance\s+(flow|place)/i,
  /\bplace\s+\d{5,}\b/i,
  /\bmap test\b/i,
  /\bphase\s?\d/i,
  /\btest dare\b/i,
  /\bqa\b/i,
];

function cleanLine(value: string | null | undefined, fallback: string, maxLength = 220) {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  return (normalized || fallback).slice(0, maxLength);
}

function readSnapshot(value: unknown): CreatorMissionSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as CreatorMissionSnapshot;
}

export function requiresSponsorCommercialReuseConsent(snapshotValue: unknown): boolean {
  return readSnapshot(snapshotValue)?.rights?.sponsorCommercialReuseRequired === true;
}

export function isPublicFacingDareTitle(title: string | null | undefined): boolean {
  if (!title?.trim()) return false;
  return !TEST_DARE_PATTERNS.some((pattern) => pattern.test(title));
}

export function isOpenCreatorHandle(handle: string | null | undefined): boolean {
  if (!handle?.trim()) return true;
  return OPEN_HANDLES.has(handle.trim().toLowerCase());
}

function isVacantCreatorMissionRequest(status: string | null | undefined): boolean {
  return status == null || status === 'REJECTED';
}

export function isCreatorMissionFunnelCandidate(
  mission: CreatorMissionRecord,
  now: Date = new Date(),
): boolean {
  return (
    mission.status === 'PENDING' &&
    mission.bounty > 0 &&
    Number.isFinite(mission.bounty) &&
    !mission.isSimulated &&
    isPublicFacingDareTitle(mission.title) &&
    isOpenCreatorHandle(mission.streamerHandle) &&
    !mission.claimedBy &&
    !mission.targetWalletAddress &&
    [null, 'PENDING', 'REJECTED'].includes(mission.claimRequestStatus) &&
    (!mission.expiresAt || mission.expiresAt.getTime() >= now.getTime())
  );
}

export function isCreatorMissionAvailable(
  mission: CreatorMissionRecord,
  now: Date = new Date(),
): boolean {
  return (
    isCreatorMissionFunnelCandidate(mission, now) &&
    isVacantCreatorMissionRequest(mission.claimRequestStatus) &&
    !requiresSponsorCommercialReuseConsent(mission.outcomeContractSnapshot)
  );
}

export function inferCreatorMissionFamily(
  snapshotValue: unknown,
  missionMode: string | null,
  tag: string | null,
): CreatorMissionFamily {
  const snapshot = readSnapshot(snapshotValue);
  if (
    snapshot?.family === 'FIELD_TRUTH' ||
    snapshot?.family === 'EXPERIENCE_EXECUTION' ||
    snapshot?.family === 'PUBLICATION'
  ) {
    return snapshot.family;
  }

  const normalizedTag = tag?.trim().toLowerCase() ?? '';
  if (['field-truth', 'place-check', 'local-signal'].includes(normalizedTag)) {
    return 'FIELD_TRUTH';
  }
  if (missionMode === 'STREAM' || ['publication', 'brand-campaign'].includes(normalizedTag)) {
    return 'PUBLICATION';
  }
  return 'EXPERIENCE_EXECUTION';
}

export function buildCreatorMissionCopy(input: {
  title: string;
  missionMode: string | null;
  tag: string | null;
  outcomeContractSnapshot: unknown;
}) {
  const snapshot = readSnapshot(input.outcomeContractSnapshot);
  const family = inferCreatorMissionFamily(
    input.outcomeContractSnapshot,
    input.missionMode,
    input.tag,
  );

  const typeLabel =
    family === 'PUBLICATION'
      ? 'Create & publish'
      : family === 'FIELD_TRUTH'
        ? 'Visit & report'
        : 'Complete & film';

  const submitLabel =
    family === 'PUBLICATION'
      ? 'Upload the source content and add the public post link.'
      : family === 'FIELD_TRUTH'
        ? 'Upload a fresh photo or short clip with your honest answer.'
        : 'Upload a fresh photo or short clip showing the place and completed action.';

  return {
    family,
    typeLabel,
    whatToMake: cleanLine(snapshot?.mission?.do, input.title),
    submitLabel,
    proofDetail: cleanLine(
      snapshot?.mission?.prove,
      'Fresh work that clearly shows the required result.',
      520,
    ),
    safety: (snapshot?.safetyRestrictions ?? []).filter(Boolean).slice(0, 3),
    prohibited: (snapshot?.prohibitedManipulation ?? []).filter(Boolean).slice(0, 2),
    baseDareCanDisplay: snapshot?.rights?.baseDareDisplay !== false,
    sponsorReuseNeedsOptIn: requiresSponsorCommercialReuseConsent(input.outcomeContractSnapshot),
  };
}

export function calculateCreatorPayout(grossReward: number, settlementFeePercent = 4): number {
  if (!Number.isFinite(grossReward) || grossReward <= 0) return 0;
  return Math.round(grossReward * (1 - settlementFeePercent / 100) * 100) / 100;
}
