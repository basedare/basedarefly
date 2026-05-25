import type {
  FirstSparkWindowState,
  FirstSparkWindowSummary,
  VenueMemorySummary,
  VenuePerkLite,
  VenueSessionSummary,
} from '@/lib/venue-types';

const DEFAULT_WINDOW_LABEL = 'Tonight 7-8:30';
const DEFAULT_PERK_LABEL = 'One simple perk';
const DEFAULT_TARGET_CHECK_INS = 20;
const MIN_TARGET_CHECK_INS = 1;
const MAX_TARGET_CHECK_INS = 500;

export type FirstSparkWindowMetrics = {
  activePerk?: VenuePerkLite | null;
  liveSession?: VenueSessionSummary | null;
  memorySummary?: VenueMemorySummary | null;
  activeDareCount?: number | null;
  checkIns?: number | null;
  proofs?: number | null;
  redemptions?: number | null;
  completedDares?: number | null;
};

export type FirstSparkWindowInput = {
  enabled: boolean;
  windowLabel?: string | null;
  perkLabel?: string | null;
  targetLabel?: string | null;
  targetCheckIns?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
};

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return input as Record<string, unknown>;
}

function cleanString(input: unknown, maxLength: number) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function cleanCounter(input: unknown, fallback = 0) {
  const value = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
}

function cleanTargetCheckIns(input: unknown) {
  const value = cleanCounter(input, DEFAULT_TARGET_CHECK_INS);
  return Math.min(MAX_TARGET_CHECK_INS, Math.max(MIN_TARGET_CHECK_INS, value));
}

function cleanIsoString(input: unknown) {
  const value = cleanString(input, 40);
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function readState(input: unknown): FirstSparkWindowState | null {
  if (input === 'quiet' || input === 'heating' || input === 'live' || input === 'proven') {
    return input;
  }

  return null;
}

function isNowWithinWindow(startsAt: string | null, endsAt: string | null) {
  if (!startsAt || !endsAt) return false;
  const now = Date.now();
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false;
  return startMs <= now && now <= endMs;
}

export function deriveFirstSparkWindowState(input: {
  enabled: boolean;
  storedState?: FirstSparkWindowState | null;
  liveSession?: VenueSessionSummary | null;
  startsAt?: string | null;
  endsAt?: string | null;
  targetCheckIns: number;
  checkIns: number;
  proofs: number;
  redemptions: number;
  activeDareCount?: number | null;
  completedDares?: number | null;
}): FirstSparkWindowState {
  if (!input.enabled) return 'quiet';
  if (
    input.storedState === 'proven' ||
    input.proofs > 0 ||
    input.redemptions > 0 ||
    (input.completedDares ?? 0) > 0 ||
    input.checkIns >= input.targetCheckIns
  ) {
    return 'proven';
  }
  if (
    input.storedState === 'live' ||
    input.liveSession?.status === 'LIVE' ||
    isNowWithinWindow(input.startsAt ?? null, input.endsAt ?? null)
  ) {
    return 'live';
  }
  if (input.checkIns > 0 || (input.activeDareCount ?? 0) > 0 || input.storedState === 'heating') {
    return 'heating';
  }

  return 'heating';
}

export function buildDefaultFirstSparkWindow(
  metrics: FirstSparkWindowMetrics = {},
  source: FirstSparkWindowSummary['source'] = 'derived'
): FirstSparkWindowSummary {
  const targetCheckIns = DEFAULT_TARGET_CHECK_INS;
  const checkIns = metrics.checkIns ?? metrics.memorySummary?.checkInCount ?? 0;
  const proofs = metrics.proofs ?? metrics.memorySummary?.proofCount ?? 0;
  const redemptions = metrics.redemptions ?? metrics.memorySummary?.perkRedemptionCount ?? 0;
  const completedDares = metrics.completedDares ?? metrics.memorySummary?.completedDareCount ?? 0;

  return {
    enabled: true,
    state: deriveFirstSparkWindowState({
      enabled: true,
      liveSession: metrics.liveSession ?? null,
      targetCheckIns,
      checkIns,
      proofs,
      redemptions,
      activeDareCount: metrics.activeDareCount,
      completedDares,
    }),
    windowLabel: DEFAULT_WINDOW_LABEL,
    perkLabel: metrics.activePerk?.title ?? DEFAULT_PERK_LABEL,
    targetLabel: `${targetCheckIns} check-ins`,
    targetCheckIns,
    checkIns,
    proofs,
    redemptions,
    startsAt: null,
    endsAt: null,
    updatedAt: null,
    source,
  };
}

export function normalizeFirstSparkWindow(
  input: unknown,
  metrics: FirstSparkWindowMetrics = {}
): FirstSparkWindowSummary | null {
  const record = asRecord(input);
  const hasConfig = Object.keys(record).length > 0;
  if (!hasConfig) return null;

  const enabled = record.enabled !== false;
  const targetCheckIns = cleanTargetCheckIns(record.targetCheckIns);
  const checkIns = cleanCounter(metrics.checkIns ?? record.checkIns, metrics.memorySummary?.checkInCount ?? 0);
  const proofs = cleanCounter(metrics.proofs ?? record.proofs, metrics.memorySummary?.proofCount ?? 0);
  const redemptions = cleanCounter(
    metrics.redemptions ?? record.redemptions,
    metrics.memorySummary?.perkRedemptionCount ?? 0
  );
  const completedDares = cleanCounter(
    metrics.completedDares,
    metrics.memorySummary?.completedDareCount ?? 0
  );
  const startsAt = cleanIsoString(record.startsAt);
  const endsAt = cleanIsoString(record.endsAt);

  const windowLabel = cleanString(record.windowLabel, 80) ?? DEFAULT_WINDOW_LABEL;
  const perkLabel = cleanString(record.perkLabel, 80) ?? metrics.activePerk?.title ?? DEFAULT_PERK_LABEL;
  const targetLabel = cleanString(record.targetLabel, 72) ?? `${targetCheckIns} check-ins`;

  return {
    enabled,
    state: deriveFirstSparkWindowState({
      enabled,
      storedState: readState(record.state),
      liveSession: metrics.liveSession ?? null,
      startsAt,
      endsAt,
      targetCheckIns,
      checkIns,
      proofs,
      redemptions,
      activeDareCount: metrics.activeDareCount,
      completedDares,
    }),
    windowLabel,
    perkLabel,
    targetLabel,
    targetCheckIns,
    checkIns,
    proofs,
    redemptions,
    startsAt,
    endsAt,
    updatedAt: cleanIsoString(record.updatedAt),
    source: 'configured',
  };
}

export function getFirstSparkWindow(
  metadataJson: unknown,
  metrics: FirstSparkWindowMetrics = {}
): FirstSparkWindowSummary | null {
  const metadata = asRecord(metadataJson);
  const configured = normalizeFirstSparkWindow(metadata.firstSparkWindow, metrics);
  if (configured) return configured;

  const hasSignal = Boolean(
    metrics.activePerk ||
      metrics.liveSession ||
      (metrics.activeDareCount ?? 0) > 0 ||
      (metrics.memorySummary?.checkInCount ?? 0) > 0 ||
      (metrics.memorySummary?.proofCount ?? 0) > 0 ||
      (metrics.memorySummary?.perkRedemptionCount ?? 0) > 0
  );

  return hasSignal ? buildDefaultFirstSparkWindow(metrics, 'derived') : null;
}

export function writeFirstSparkWindowToMetadata(metadataJson: unknown, input: FirstSparkWindowInput) {
  const metadata = { ...asRecord(metadataJson) };
  const nextWindow = normalizeFirstSparkWindow({
    enabled: input.enabled,
    windowLabel: input.windowLabel,
    perkLabel: input.perkLabel,
    targetLabel: input.targetLabel,
    targetCheckIns: input.targetCheckIns,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    updatedAt: new Date().toISOString(),
  });

  if (!nextWindow || (!input.enabled && !cleanString(input.windowLabel, 80) && !cleanString(input.perkLabel, 80))) {
    delete metadata.firstSparkWindow;
    return { metadata, firstSparkWindow: null };
  }

  metadata.firstSparkWindow = nextWindow;
  return { metadata, firstSparkWindow: nextWindow };
}
