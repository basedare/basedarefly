import 'server-only';

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { recordActivationFunnelEvent } from '@/lib/activation-funnel';
import { prisma } from '@/lib/prisma';

type MetadataRecord = Record<string, unknown>;

export const ACTIVATION_CLOSE_ROOM_EVENTS = ['OPEN', 'PAYMENT_CLICK', 'REPLY_CLICK'] as const;

export type ActivationCloseRoomEvent = (typeof ACTIVATION_CLOSE_ROOM_EVENTS)[number];

type ActivationCloseRoomEventRow = {
  id: string;
  title: string | null;
  amount: number | null;
  status: string | null;
  actor: string | null;
  metadataJson: Prisma.JsonValue | null;
  occurredAt: Date;
  updatedAt: Date;
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  QUALIFIED: 'Qualified',
  NEEDS_INFO: 'Needs info',
  READY_TO_INVOICE: 'Ready to invoice',
  PAYMENT_SENT: 'Payment sent',
  PAID_CONFIRMED: 'Paid confirmed',
  LAUNCHED: 'Launched',
  REJECTED: 'Rejected',
};

const BUDGET_LABELS: Record<string, string> = {
  '500_1500': '$500-$1.5k',
  '1500_5000': '$1.5k-$5k',
  '5000_15000': '$5k-$15k',
  '15000_plus': '$15k+',
};

const TIMELINE_LABELS: Record<string, string> = {
  this_week: 'this week',
  this_month: 'this month',
  next_90_days: 'next 90 days',
  exploring: 'exploring',
};

const PACKAGE_LABELS: Record<string, string> = {
  'pilot-drop': 'Venue Spark Pilot',
  'local-signal': 'Always-On Spark',
  'city-takeover': 'Global Challenge Drop',
};

const EVENT_TO_FUNNEL_TYPE = {
  OPEN: 'ACTIVATION_CLOSE_ROOM_OPEN',
  PAYMENT_CLICK: 'ACTIVATION_CLOSE_ROOM_PAYMENT_CLICK',
  REPLY_CLICK: 'ACTIVATION_CLOSE_ROOM_REPLY_CLICK',
} as const;

function asRecord(value: unknown): MetadataRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
    ? (value as MetadataRecord)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeStatus(value: unknown) {
  const status = stringValue(value).toUpperCase();
  return STATUS_LABELS[status] ? status : 'NEW';
}

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://basedare.xyz').replace(/\/$/, '');
}

function tokenSecret() {
  return (
    process.env.ACTIVATION_CLOSE_ROOM_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.ADMIN_SECRET ||
    'basedare-close-room-v1'
  );
}

function signLeadId(leadId: string) {
  return createHmac('sha256', tokenSecret())
    .update(`activation-close-room:${leadId}`)
    .digest('base64url')
    .slice(0, 32);
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value === undefined) return Prisma.JsonNull;

  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return { serializationError: 'metadata_unserializable' };
  }
}

function formatAmount(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function hoursSince(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60)));
}

function getMissionIdeas(metadata: MetadataRecord) {
  const activationBrief = asRecord(metadata.activationBrief);
  const ideas = Array.isArray(activationBrief.missionIdeas) ? activationBrief.missionIdeas : [];

  return ideas
    .slice(0, 5)
    .map((idea) => {
      const record = asRecord(idea);
      return {
        title: stringValue(record.title),
        detail: stringValue(record.detail),
        proofMetric: stringValue(record.proofMetric),
      };
    })
    .filter((idea) => idea.title || idea.detail);
}

function defaultPaymentLink() {
  return (
    process.env.BASEDARE_PAYMENT_LINK?.trim() ||
    process.env.NEXT_PUBLIC_BASEDARE_PAYMENT_LINK?.trim() ||
    ''
  );
}

function defaultPaymentInstructions() {
  return (
    process.env.BASEDARE_PAYMENT_INSTRUCTIONS?.trim() ||
    'BaseDare can use a manual invoice, Stripe/checkout link, or USDC settlement depending on the buyer. The activation only launches after payment and scope are confirmed.'
  );
}

function defaultReplyEmail() {
  return process.env.BASEDARE_SALES_EMAIL?.trim() || process.env.NEXT_PUBLIC_BASEDARE_SALES_EMAIL?.trim() || 'hello@basedare.xyz';
}

function buildMailtoHref(input: { email: string; subject: string; body: string }) {
  const query = new URLSearchParams({
    subject: input.subject,
    body: input.body,
  });
  return `mailto:${encodeURIComponent(input.email)}?${query.toString()}`;
}

export function buildActivationCloseRoomToken(leadId: string) {
  return `${leadId}.${signLeadId(leadId)}`;
}

export function parseActivationCloseRoomToken(token: string) {
  const cleanToken = token.trim();
  const [leadId, signature, ...extra] = cleanToken.split('.');
  if (!leadId || !signature || extra.length > 0) return null;

  const expected = signLeadId(leadId);
  if (!safeEqual(signature, expected)) return null;
  return { leadId, token: cleanToken };
}

export function buildActivationCloseRoomHref(leadId: string) {
  return `/activations/close/${buildActivationCloseRoomToken(leadId)}`;
}

export function buildActivationCloseRoomAbsoluteHref(leadId: string) {
  return `${appBaseUrl()}${buildActivationCloseRoomHref(leadId)}`;
}

export function buildActivationCloseRoomAdminState(input: {
  id: string;
  metadata: MetadataRecord;
  company: string;
  contactName: string;
  email: string;
  assignedVenue: string;
  paymentReference: string;
}) {
  const operator = asRecord(input.metadata.operator);
  const href = buildActivationCloseRoomHref(input.id);
  const absoluteHref = `${appBaseUrl()}${href}`;
  const target = input.assignedVenue || stringValue(input.metadata.venue) || input.company || 'your activation';
  const subject = `BaseDare close room: ${target}`;
  const body = [
    `Hi ${input.contactName || 'there'},`,
    '',
    `Here is the BaseDare close room for ${target}. It has the Spark route, payment reference, proof logic, and launch gates in one place:`,
    '',
    absoluteHref,
    '',
    input.paymentReference ? `Payment reference: ${input.paymentReference}` : null,
    '',
    'Once payment and scope are confirmed, BaseDare opens the funded activation inside the app so creator proof, review, and payout state stay trackable.',
  ].filter((line): line is string => line !== null).join('\n');

  const sentAt = stringValue(operator.closeRoomSentAt);
  const viewedAt = stringValue(operator.closeRoomViewedAt);
  const paymentClickedAt = stringValue(operator.closeRoomPaymentClickedAt);

  return {
    href,
    absoluteHref,
    mailtoHref: input.email ? buildMailtoHref({ email: input.email, subject, body }) : null,
    sentAt,
    viewedAt,
    paymentClickedAt,
    replyClickedAt: stringValue(operator.closeRoomReplyClickedAt),
    viewCount: numberValue(operator.closeRoomViewCount) ?? 0,
    paymentClickCount: numberValue(operator.closeRoomPaymentClickCount) ?? 0,
    replyClickCount: numberValue(operator.closeRoomReplyClickCount) ?? 0,
    staleHours: sentAt && !paymentClickedAt ? hoursSince(sentAt) : null,
  };
}

export function buildActivationCloseRoomFromEvent(event: ActivationCloseRoomEventRow) {
  const metadata = asRecord(event.metadataJson);
  const operator = asRecord(metadata.operator);
  const activationBrief = asRecord(metadata.activationBrief);
  const status = normalizeStatus(event.status);
  const company = stringValue(metadata.company);
  const contactName = stringValue(metadata.contactName);
  const email = stringValue(metadata.email || event.actor);
  const city = stringValue(metadata.city);
  const venue = stringValue(operator.assignedVenue) || stringValue(metadata.venue);
  const budgetRange = stringValue(metadata.budgetRange);
  const timeline = stringValue(metadata.timeline);
  const packageId = stringValue(metadata.packageId);
  const amount = event.amount ?? numberValue(metadata.amount);
  const paymentLink = stringValue(operator.paymentLink) || defaultPaymentLink();
  const paymentReference = stringValue(operator.paymentReference) || `BD-${event.id.slice(0, 8).toUpperCase()}`;
  const target = venue || company || 'your activation';
  const closeRoomUrl = buildActivationCloseRoomAbsoluteHref(event.id);
  const replySubject = `BaseDare close room: ${target}`;
  const replyBody = [
    `BaseDare close room: ${target}`,
    '',
    `Lead ID: ${event.id}`,
    paymentReference ? `Payment reference: ${paymentReference}` : null,
    '',
    `I reviewed the close room: ${closeRoomUrl}`,
  ].filter((line): line is string => line !== null).join('\n');

  return {
    id: event.id,
    title: event.title || `${company || 'Activation'} close room`,
    status,
    statusLabel: STATUS_LABELS[status],
    company,
    contactName,
    email,
    city,
    venue,
    buyerType: stringValue(metadata.buyerType),
    goal: stringValue(metadata.goal),
    packageId,
    packageLabel: PACKAGE_LABELS[packageId] || packageId || 'Activation package',
    budgetLabel: BUDGET_LABELS[budgetRange] || formatAmount(amount) || 'Budget to confirm',
    timelineLabel: TIMELINE_LABELS[timeline] || timeline || 'Timeline to confirm',
    amount,
    paymentLink,
    paymentReference,
    paymentInstructions: defaultPaymentInstructions(),
    missionIdeas: getMissionIdeas(metadata),
    positioningLine: stringValue(activationBrief.positioningLine),
    proofLogic: stringValue(activationBrief.proofLogic),
    repeatMetric: stringValue(activationBrief.repeatMetric),
    closeRoomUrl,
    replyHref: buildMailtoHref({ email: defaultReplyEmail(), subject: replySubject, body: replyBody }),
    callHref:
      process.env.BASEDARE_CALENDAR_LINK?.trim() ||
      process.env.NEXT_PUBLIC_BASEDARE_CALENDAR_LINK?.trim() ||
      buildMailtoHref({
        email: defaultReplyEmail(),
        subject: `12-minute BaseDare call: ${target}`,
        body: `I reviewed the close room for ${target} and want to confirm scope/payment path.\n\n${closeRoomUrl}`,
      }),
    operator: {
      sentAt: stringValue(operator.closeRoomSentAt),
      viewedAt: stringValue(operator.closeRoomViewedAt),
      paymentClickedAt: stringValue(operator.closeRoomPaymentClickedAt),
      replyClickedAt: stringValue(operator.closeRoomReplyClickedAt),
    },
  };
}

export async function getActivationCloseRoomByToken(token: string) {
  const parsed = parseActivationCloseRoomToken(token);
  if (!parsed) return null;

  const event = await prisma.founderEvent.findFirst({
    where: {
      id: parsed.leadId,
      eventType: 'ACTIVATION_INTAKE',
    },
    select: {
      id: true,
      title: true,
      amount: true,
      status: true,
      actor: true,
      metadataJson: true,
      occurredAt: true,
      updatedAt: true,
    },
  });

  return event ? buildActivationCloseRoomFromEvent(event) : null;
}

export async function recordActivationCloseRoomEvent(input: {
  token: string;
  eventType: ActivationCloseRoomEvent;
  sessionKey?: string | null;
  actor?: string | null;
  metadata?: MetadataRecord;
}) {
  const parsed = parseActivationCloseRoomToken(input.token);
  if (!parsed) return { recorded: false, reason: 'INVALID_TOKEN' as const };

  const event = await prisma.founderEvent.findFirst({
    where: {
      id: parsed.leadId,
      eventType: 'ACTIVATION_INTAKE',
    },
    select: {
      id: true,
      amount: true,
      status: true,
      metadataJson: true,
    },
  });

  if (!event) return { recorded: false, reason: 'NOT_FOUND' as const };

  const metadata = asRecord(event.metadataJson);
  const operator = asRecord(metadata.operator);
  const now = new Date().toISOString();
  const nextOperator: MetadataRecord = {
    ...operator,
    closeRoomLastInteractionAt: now,
  };

  if (input.eventType === 'OPEN') {
    nextOperator.closeRoomViewedAt = stringValue(operator.closeRoomViewedAt) || now;
    nextOperator.closeRoomLastViewedAt = now;
    nextOperator.closeRoomViewCount = (numberValue(operator.closeRoomViewCount) ?? 0) + 1;
  } else if (input.eventType === 'PAYMENT_CLICK') {
    nextOperator.closeRoomPaymentClickedAt = now;
    nextOperator.closeRoomPaymentClickCount = (numberValue(operator.closeRoomPaymentClickCount) ?? 0) + 1;
  } else if (input.eventType === 'REPLY_CLICK') {
    nextOperator.closeRoomReplyClickedAt = now;
    nextOperator.closeRoomReplyClickCount = (numberValue(operator.closeRoomReplyClickCount) ?? 0) + 1;
  }

  const nextMetadata = normalizeJson({
    ...metadata,
    operator: nextOperator,
  });

  await prisma.founderEvent.update({
    where: { id: event.id },
    data: {
      metadataJson: nextMetadata,
    },
  });

  await recordActivationFunnelEvent({
    eventType: EVENT_TO_FUNNEL_TYPE[input.eventType],
    source: 'activation-close-room',
    subjectType: 'activation_lead',
    subjectId: event.id,
    eventId: randomUUID(),
    dedupeKey:
      input.eventType === 'OPEN' && input.sessionKey
        ? `activation-close-room:${event.id}:OPEN:${input.sessionKey}`
        : undefined,
    title: `Activation close room ${input.eventType.toLowerCase().replace(/_/g, ' ')}`,
    amount: event.amount,
    status: event.status,
    actor: input.actor ?? null,
    href: buildActivationCloseRoomHref(event.id),
    metadata: {
      closeRoomEventType: input.eventType,
      sessionKey: input.sessionKey ?? null,
      ...(input.metadata ?? {}),
    },
  });

  return { recorded: true, reason: 'RECORDED' as const };
}
