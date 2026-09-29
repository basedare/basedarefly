import type { VenuePerkLite, VenuePerkUnlock } from '@/lib/venue-types';

const DEFAULT_EXPIRES_IN_HOURS = 12;
const MIN_EXPIRES_IN_HOURS = 1;
const MAX_EXPIRES_IN_HOURS = 24;

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

function cleanExpiresInHours(input: unknown) {
  const value = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(value)) return DEFAULT_EXPIRES_IN_HOURS;
  return Math.min(MAX_EXPIRES_IN_HOURS, Math.max(MIN_EXPIRES_IN_HOURS, Math.round(value)));
}

export function normalizeVenuePerk(input: unknown): VenuePerkLite | null {
  const record = asRecord(input);
  const title = cleanString(record.title, 80);

  if (!title) return null;

  return {
    enabled: record.enabled === true,
    ...perkLimits(record),
    title,
    description: cleanString(record.description, 180),
    staffInstructions: cleanString(record.staffInstructions, 180),
    expiresInHours: cleanExpiresInHours(record.expiresInHours),
    updatedAt: cleanString(record.updatedAt, 40),
  };
}

function perkLimits(record: Record<string, unknown>) {
  const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
  return {
    offerId: cleanString(record.offerId, 80),
    quantityLimit: typeof record.quantityLimit === 'number' && Number.isInteger(record.quantityLimit) && record.quantityLimit > 0 ? Math.min(1000, record.quantityLimit) : null,
    startsAt: date(record.startsAt), endsAt: date(record.endsAt), conditions: cleanString(record.conditions, 300),
  };
}

export function getActiveVenuePerk(metadataJson: unknown, now = new Date()): VenuePerkLite | null {
  const metadata = asRecord(metadataJson);
  const perk = normalizeVenuePerk(metadata.venuePerk);
  return perk?.enabled && (!perk.startsAt || Date.parse(perk.startsAt) <= now.getTime())
    && (!perk.endsAt || Date.parse(perk.endsAt) > now.getTime()) ? perk : null;
}

export function writeVenuePerkToMetadata(
  metadataJson: unknown,
  input: {
    enabled: boolean;
    title: string;
    description?: string | null;
    staffInstructions?: string | null;
    expiresInHours?: number | null;
    offerId?: string | null;
    quantityLimit?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    conditions?: string | null;
  }
) {
  const metadata = { ...asRecord(metadataJson) };
  const perk = normalizeVenuePerk({
    ...input,
    enabled: input.enabled,
    title: input.title,
    description: input.description,
    staffInstructions: input.staffInstructions,
    expiresInHours: input.expiresInHours,
    updatedAt: new Date().toISOString(),
  });

  if (!perk || (!input.enabled && !input.title.trim())) {
    delete metadata.venuePerk;
    return { metadata, perk: null };
  }

  metadata.venuePerk = perk;
  return { metadata, perk };
}

export function getVenuePerkSnapshot(metadataJson: unknown): VenuePerkUnlock | null {
  const metadata = asRecord(metadataJson);
  const snapshot = asRecord(metadata.venuePerk);
  const title = cleanString(snapshot.title, 80);
  const checkInId = cleanString(snapshot.checkInId, 80);
  const redemptionCode = cleanString(snapshot.redemptionCode, 24);
  const expiresAt = cleanString(snapshot.expiresAt, 40);

  if (!title || !checkInId || !redemptionCode || !expiresAt) {
    return null;
  }

  return {
    enabled: true,
    ...perkLimits(snapshot),
    title,
    description: cleanString(snapshot.description, 180),
    staffInstructions: cleanString(snapshot.staffInstructions, 180),
    expiresInHours: cleanExpiresInHours(snapshot.expiresInHours),
    updatedAt: cleanString(snapshot.updatedAt, 40),
    checkInId,
    redemptionCode,
    expiresAt,
    redeemedAt: cleanString(snapshot.redeemedAt, 40),
  };
}

export function buildVenuePerkUnlock(input: {
  perk: VenuePerkLite;
  checkInId: string;
  scannedAt: Date;
  metadataJson?: unknown;
}) {
  const existing = getVenuePerkSnapshot(input.metadataJson);
  if (existing) return existing;

  const expiresAt = new Date(Math.min(
    input.scannedAt.getTime() + input.perk.expiresInHours * 60 * 60 * 1000,
    input.perk.endsAt ? Date.parse(input.perk.endsAt) : Infinity
  ));
  const codeSource = input.checkInId.replace(/[^a-z0-9]/gi, '').toUpperCase();

  return {
    ...input.perk,
    checkInId: input.checkInId,
    redemptionCode: codeSource.slice(-6) || input.checkInId.slice(-6).toUpperCase(),
    expiresAt: expiresAt.toISOString(),
    redeemedAt: null,
  } satisfies VenuePerkUnlock;
}

export function writeVenuePerkSnapshotToMetadata(metadataJson: unknown, unlock: VenuePerkUnlock) {
  const metadata = { ...asRecord(metadataJson) };
  metadata.venuePerk = unlock;
  return metadata;
}

export function markVenuePerkRedeemedInMetadata(
  metadataJson: unknown,
  input: {
    redeemedAt: Date;
    redeemedBy: string;
  }
) {
  const metadata = { ...asRecord(metadataJson) };
  const snapshot = getVenuePerkSnapshot(metadataJson);
  if (!snapshot) {
    return { metadata, perk: null };
  }

  const nextPerk = {
    ...snapshot,
    redeemedAt: snapshot.redeemedAt ?? input.redeemedAt.toISOString(),
    redeemedBy: input.redeemedBy,
  };
  metadata.venuePerk = nextPerk;

  return { metadata, perk: nextPerk };
}
