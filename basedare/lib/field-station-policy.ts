const FIELD_STATION_CODE_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;

function normalizeLocalTargetHref(value: string): string {
  const normalized = value.trim();
  if (!normalized.startsWith('/') || normalized.startsWith('//') || normalized.length > 1024) {
    throw new Error('Field Station links must use a local BaseDare path.');
  }
  const parsed = new URL(normalized, 'https://basedare.local');
  if (parsed.origin !== 'https://basedare.local' || parsed.pathname.startsWith('/api/')) {
    throw new Error('Field Station links must use a public BaseDare path.');
  }
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export const FIELD_STATION_ATTENTION_MODES = [
  'ASK',
  'NEARBY',
  'TONIGHT',
  'MYSTERY',
  'SOCIAL',
  'REWARD',
] as const;

export type FieldStationAttentionMode = (typeof FIELD_STATION_ATTENTION_MODES)[number];

export const FIELD_STATION_DEFAULT_MINIMUM_DENSITY = 3;
export const FIELD_STATION_DEFAULT_RADIUS_KM = 3;
export const FIELD_STATION_QR_ERROR_CORRECTION = 'H' as const;
export const FIELD_STATION_QR_QUIET_ZONE_MODULES = 4;

const ATTENTION_SET = new Set<string>(FIELD_STATION_ATTENTION_MODES);

export function normalizeFieldStationCode(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/^@/, '');
  if (!FIELD_STATION_CODE_PATTERN.test(normalized)) {
    throw new Error('stationCode must be 1-64 lowercase letters, numbers, dashes, or underscores.');
  }
  return normalized;
}

export function normalizeFieldStationAttention(
  value: string | null | undefined,
  fallback: FieldStationAttentionMode = 'ASK'
): FieldStationAttentionMode {
  const normalized = value?.trim().toUpperCase() ?? '';
  if (!normalized) return fallback;
  if (!ATTENTION_SET.has(normalized)) {
    throw new Error('Unsupported Field Station attention mode.');
  }
  return normalized as FieldStationAttentionMode;
}

export function normalizeFieldStationFallback(
  value: string | null | undefined
): Extract<FieldStationAttentionMode, 'ASK' | 'NEARBY'> {
  const normalized = normalizeFieldStationAttention(value, 'NEARBY');
  if (normalized !== 'ASK' && normalized !== 'NEARBY') {
    throw new Error('Field Station fallback must be ASK or NEARBY.');
  }
  return normalized;
}

export function normalizeMinimumDensity(value: number | null | undefined): number {
  if (value === null || value === undefined) return FIELD_STATION_DEFAULT_MINIMUM_DENSITY;
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    throw new Error('minimumDensity must be a whole number from 1 to 20.');
  }
  return value;
}

export function normalizeDensityRadiusKm(value: number | null | undefined): number {
  if (value === null || value === undefined) return FIELD_STATION_DEFAULT_RADIUS_KM;
  if (!Number.isFinite(value) || value < 0.2 || value > 15) {
    throw new Error('densityRadiusKm must be between 0.2 and 15km.');
  }
  return Math.round(value * 10) / 10;
}

export function resolveFieldStationAttention(input: {
  requested: FieldStationAttentionMode;
  fallback: FieldStationAttentionMode;
  densityCount: number;
  minimumDensity: number;
  densityAvailable?: boolean;
}) {
  const densityCount = Math.max(0, Math.floor(input.densityCount));
  const targeted = !['ASK', 'NEARBY'].includes(input.requested);
  const densityAvailable = input.densityAvailable !== false;
  const fallbackApplied = targeted && (!densityAvailable || densityCount < input.minimumDensity);

  return {
    requestedAttention: input.requested,
    resolvedAttention: fallbackApplied ? input.fallback : input.requested,
    densityCount,
    minimumDensity: input.minimumDensity,
    fallbackApplied,
    fallbackReason: fallbackApplied
      ? densityAvailable
        ? 'BELOW_MINIMUM_DENSITY'
        : 'DENSITY_UNAVAILABLE'
      : null,
  } as const;
}

export function fieldStationAttentionToMapIntent(
  attention: string | null | undefined
): 'meet' | 'discover' | 'now' | 'tonight' | null {
  switch (attention?.trim().toLowerCase()) {
    case 'social':
      return 'meet';
    case 'mystery':
      return 'discover';
    case 'reward':
      return 'now';
    case 'tonight':
      return 'tonight';
    default:
      return null;
  }
}

export function mapIntentToFieldStationAttention(
  intent: 'meet' | 'discover' | 'now' | 'tonight' | null
): FieldStationAttentionMode | null {
  if (intent === 'meet') return 'SOCIAL';
  if (intent === 'discover') return 'MYSTERY';
  if (intent === 'now') return 'REWARD';
  if (intent === 'tonight') return 'TONIGHT';
  return null;
}

export function formatFieldStationSerial(serialNumber: number): string {
  const normalized = Number.isSafeInteger(serialNumber) && serialNumber > 0 ? serialNumber : 0;
  return `FS-${String(normalized).padStart(5, '0')}`;
}

export function aggregateFieldStationReceiptCounts(events: Array<{
  eventType: string;
  stationCode: string | null;
  contentCode: string | null;
  destinationVenueId: string | null;
}>) {
  const stationHosts: Record<string, Record<string, number>> = {};
  const creatives: Record<string, Record<string, number>> = {};
  const destinations: Record<string, Record<string, number>> = {};
  const increment = (ledger: Record<string, Record<string, number>>, key: string | null, eventType: string) => {
    if (!key) return;
    ledger[key] ??= {};
    ledger[key][eventType] = (ledger[key][eventType] ?? 0) + 1;
  };
  for (const event of events) {
    increment(stationHosts, event.stationCode, event.eventType);
    increment(creatives, event.contentCode, event.eventType);
    increment(destinations, event.destinationVenueId, event.eventType);
  }
  return { stationHosts, creatives, destinations };
}

export function computeFieldStationTimeToAction(events: Array<{
  eventType: string;
  stationCode: string | null;
  journeyId: string | null;
  occurredAt: Date;
}>) {
  const scans = new Map<string, number>();
  const deltas = new Map<string, number[]>();
  for (const event of [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())) {
    if (!event.stationCode || !event.journeyId) continue;
    const key = `${event.stationCode}:${event.journeyId}`;
    if (event.eventType === 'STATION_SCAN' && !scans.has(key)) {
      scans.set(key, event.occurredAt.getTime());
      continue;
    }
    if (!['STATION_VERIFIED_ARRIVAL', 'PATH_VERIFIED_COMPLETION', 'DIRECT_VERIFIED_COMPLETION'].includes(event.eventType)) continue;
    const scannedAt = scans.get(key);
    if (scannedAt === undefined) continue;
    const delta = event.occurredAt.getTime() - scannedAt;
    if (delta < 0) continue;
    const row = deltas.get(event.stationCode) ?? [];
    row.push(delta);
    deltas.set(event.stationCode, row);
  }
  return Object.fromEntries(Array.from(deltas, ([stationCode, values]) => {
    const ordered = [...values].sort((a, b) => a - b);
    const middle = Math.floor(ordered.length / 2);
    const medianMs = ordered.length % 2
      ? ordered[middle]
      : (ordered[middle - 1] + ordered[middle]) / 2;
    return [stationCode, {
      verifiedActions: ordered.length,
      medianMinutes: Math.round(medianMs / 60_000),
    }];
  }));
}

export function appendFieldStationContextToHref(input: {
  targetHref: string;
  stationCode: string;
  stationSerial: string;
  stationLabel: string;
  city?: string | null;
  latitude: number;
  longitude: number;
  requestedAttention: FieldStationAttentionMode;
  resolvedAttention: FieldStationAttentionMode;
  fallbackApplied: boolean;
}) {
  const safeHref = normalizeLocalTargetHref(input.targetHref);
  const url = new URL(safeHref, 'https://basedare.local');
  url.searchParams.set('field', '1');
  url.searchParams.set('station', input.stationCode);
  url.searchParams.set('stationSerial', input.stationSerial);
  url.searchParams.set('stationLabel', input.stationLabel.slice(0, 100));
  url.searchParams.set('attention', input.resolvedAttention.toLowerCase());
  url.searchParams.set('lat', input.latitude.toFixed(6));
  url.searchParams.set('lng', input.longitude.toFixed(6));
  if (input.city) url.searchParams.set('city', input.city.slice(0, 100));
  if (input.fallbackApplied) {
    url.searchParams.set('fallback', '1');
    url.searchParams.set('requestedAttention', input.requestedAttention.toLowerCase());
  }
  return normalizeLocalTargetHref(`${url.pathname}${url.search}${url.hash}`);
}
