import 'server-only';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type { FounderLedgerEventType } from '@/lib/founder-scoreboard-types';

export const FOUNDER_LEDGER_EVENT_TYPES = [
  'dare_created',
  'dare_funded',
  'proof_submitted',
  'dare_settled',
  'payout_queued',
  'dare_refunded',
  'dare_failed',
  'campaign_slot_paid',
  'venue_check_in',
  'place_tag_submitted',
] as const satisfies readonly FounderLedgerEventType[];

const LEDGER_ID_PREFIX: Record<FounderLedgerEventType, string> = {
  dare_created: 'dare-created',
  dare_funded: 'dare-funded',
  proof_submitted: 'proof-submitted',
  dare_settled: 'dare-settled',
  payout_queued: 'payout-queued',
  dare_refunded: 'dare-refunded',
  dare_failed: 'dare-failed',
  campaign_slot_paid: 'campaign-slot-paid',
  venue_check_in: 'venue-check-in',
  place_tag_submitted: 'place-tag',
};

type FounderEventMetadata = unknown;

export type FounderDareEventLike = {
  id: string;
  shortId?: string | null;
  title: string;
  bounty: number;
  status: string;
  streamerHandle?: string | null;
  stakerAddress?: string | null;
  targetWalletAddress?: string | null;
  claimedBy?: string | null;
  venueId?: string | null;
  venue?: {
    slug?: string | null;
  } | null;
};

export type RecordFounderEventInput = {
  eventType: FounderLedgerEventType;
  source?: string;
  subjectType?: string | null;
  subjectId?: string | null;
  dedupeKey: string;
  title?: string | null;
  amount?: number | null;
  status?: string | null;
  actor?: string | null;
  href?: string | null;
  venueId?: string | null;
  venueSlug?: string | null;
  metadata?: FounderEventMetadata;
  occurredAt?: Date;
};

export function isFounderLedgerEventType(value: string): value is FounderLedgerEventType {
  return FOUNDER_LEDGER_EVENT_TYPES.includes(value as FounderLedgerEventType);
}

export function founderLedgerDedupeKey(eventType: FounderLedgerEventType, subjectId: string) {
  return `${LEDGER_ID_PREFIX[eventType]}-${subjectId}`;
}

function safeAmount(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeJson(value: FounderEventMetadata): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;

  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return { serializationError: 'metadata_unserializable' };
  }
}

export function isMissingFounderEventStorage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message : '';
  return code === 'P2021' || code === 'P2022' || message.includes('FounderEvent');
}

export async function recordFounderEvent(input: RecordFounderEventInput) {
  const metadataJson = normalizeJson(input.metadata);
  const now = input.occurredAt ?? new Date();

  await prisma.founderEvent.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: {
      eventType: input.eventType,
      source: input.source ?? 'server',
      subjectType: input.subjectType ?? null,
      subjectId: input.subjectId ?? null,
      dedupeKey: input.dedupeKey,
      title: input.title ?? null,
      amount: safeAmount(input.amount),
      status: input.status ?? null,
      actor: input.actor ?? null,
      href: input.href ?? null,
      venueId: input.venueId ?? null,
      venueSlug: input.venueSlug ?? null,
      metadataJson,
      occurredAt: now,
    },
    update: {
      source: input.source ?? 'server',
      title: input.title ?? null,
      amount: safeAmount(input.amount),
      status: input.status ?? null,
      actor: input.actor ?? null,
      href: input.href ?? null,
      venueId: input.venueId ?? null,
      venueSlug: input.venueSlug ?? null,
      metadataJson,
      occurredAt: now,
    },
  });
}

export async function recordFounderEventSafe(input: RecordFounderEventInput) {
  try {
    await recordFounderEvent(input);
  } catch (error) {
    if (isMissingFounderEventStorage(error)) {
      console.warn('[FOUNDER_EVENTS] FounderEvent storage unavailable; continuing without durable event');
      return;
    }

    console.warn('[FOUNDER_EVENTS] Failed to record founder event:', error);
  }
}

export async function recordDareFounderEventSafe(input: {
  eventType: FounderLedgerEventType;
  dare: FounderDareEventLike;
  source?: string;
  dedupeKey?: string;
  status?: string | null;
  actor?: string | null;
  metadata?: FounderEventMetadata;
  occurredAt?: Date;
}) {
  const actor =
    input.actor ??
    input.dare.streamerHandle ??
    input.dare.targetWalletAddress ??
    input.dare.claimedBy ??
    input.dare.stakerAddress ??
    null;

  await recordFounderEventSafe({
    eventType: input.eventType,
    source: input.source,
    subjectType: 'Dare',
    subjectId: input.dare.id,
    dedupeKey: input.dedupeKey ?? founderLedgerDedupeKey(input.eventType, input.dare.id),
    title: input.dare.title,
    amount: input.dare.bounty,
    status: input.status ?? input.dare.status,
    actor,
    href: input.dare.shortId ? `/dare/${input.dare.shortId}` : '/admin',
    venueId: input.dare.venueId ?? null,
    venueSlug: input.dare.venue?.slug ?? null,
    metadata: input.metadata,
    occurredAt: input.occurredAt,
  });
}
