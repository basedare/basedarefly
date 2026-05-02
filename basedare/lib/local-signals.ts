import 'server-only';

import type { FounderEvent } from '@prisma/client';

import { calculateDistance } from '@/lib/geo';

export const LOCAL_SIGNAL_EVENT_TYPE = 'LOCAL_SIGNAL';

export const LOCAL_SIGNAL_STATUSES = ['NEW', 'APPROVED', 'REJECTED'] as const;
export type LocalSignalStatus = (typeof LOCAL_SIGNAL_STATUSES)[number];

export type LocalSignalItem = {
  id: string;
  title: string;
  status: LocalSignalStatus;
  category: string;
  venueName: string;
  city: string;
  notes: string;
  sourceUrl: string;
  startsAt: string | null;
  endsAt: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  distanceDisplay: string | null;
  submittedBy: string;
  operatorNote: string;
  createdAt: string;
  updatedAt: string;
};

type MetadataRecord = Record<string, unknown>;

function isRecord(value: unknown): value is MetadataRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asRecord(value: unknown): MetadataRecord {
  return isRecord(value) ? value : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeStatus(value: string | null | undefined): LocalSignalStatus {
  return LOCAL_SIGNAL_STATUSES.includes(value as LocalSignalStatus) ? (value as LocalSignalStatus) : 'NEW';
}

export function formatLocalSignalDistance(distanceKm: number | null) {
  if (distanceKm === null) return null;
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))}m`;
  if (distanceKm < 10) return `${distanceKm.toFixed(1)}km`;
  return `${Math.round(distanceKm)}km`;
}

export function localSignalIsCurrentlyRelevant(signal: LocalSignalItem, now = new Date()) {
  const startsAt = signal.startsAt ? new Date(signal.startsAt) : null;
  const endsAt = signal.endsAt ? new Date(signal.endsAt) : null;
  const nowMs = now.getTime();

  if (endsAt && !Number.isNaN(endsAt.getTime()) && endsAt.getTime() < nowMs - 6 * 60 * 60 * 1000) {
    return false;
  }

  if (startsAt && !Number.isNaN(startsAt.getTime())) {
    return startsAt.getTime() <= nowMs + 14 * 24 * 60 * 60 * 1000;
  }

  return true;
}

export function serializeLocalSignal(
  event: FounderEvent,
  origin?: { latitude: number; longitude: number } | null
): LocalSignalItem {
  const metadata = asRecord(event.metadataJson);
  const latitude = numberValue(metadata.latitude);
  const longitude = numberValue(metadata.longitude);
  const distanceKm =
    origin && latitude !== null && longitude !== null
      ? calculateDistance(origin.latitude, origin.longitude, latitude, longitude)
      : null;

  return {
    id: event.id,
    title: event.title || stringValue(metadata.title) || 'Local signal',
    status: normalizeStatus(event.status),
    category: stringValue(metadata.category) || 'local',
    venueName: stringValue(metadata.venueName),
    city: stringValue(metadata.city),
    notes: stringValue(metadata.notes),
    sourceUrl: stringValue(metadata.sourceUrl),
    startsAt: stringValue(metadata.startsAt) || null,
    endsAt: stringValue(metadata.endsAt) || null,
    latitude,
    longitude,
    distanceKm,
    distanceDisplay: formatLocalSignalDistance(distanceKm),
    submittedBy: event.actor || stringValue(metadata.submittedBy),
    operatorNote: stringValue(metadata.operatorNote),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}
