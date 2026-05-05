import 'server-only';

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { trackServerEvent } from '@/lib/server-analytics';
import { alertActivationIntakeFollowUpQueue } from '@/lib/telegram';

export const ACTIVATION_PUBLIC_FUNNEL_EVENTS = [
  'ACTIVATION_PAGE_VIEW',
  'ACTIVATION_CTA_CLICK',
  'ACTIVATION_SPARK_AUDIT_USED',
  'ACTIVATION_FORM_START',
  'ACTIVATION_FORM_SUBMIT',
] as const;

export const ACTIVATION_STATUS_FUNNEL_EVENTS = [
  'ACTIVATION_STATUS_QUALIFIED',
  'ACTIVATION_STATUS_READY_TO_INVOICE',
  'ACTIVATION_STATUS_PAYMENT_SENT',
  'ACTIVATION_STATUS_PAID_CONFIRMED',
  'ACTIVATION_STATUS_LAUNCHED',
] as const;

export const ACTIVATION_OPERATIONAL_EVENTS = [
  'ACTIVATION_FOLLOWUP_ALERT_SENT',
] as const;

export const ACTIVATION_FUNNEL_EVENT_TYPES = [
  ...ACTIVATION_PUBLIC_FUNNEL_EVENTS,
  ...ACTIVATION_STATUS_FUNNEL_EVENTS,
  ...ACTIVATION_OPERATIONAL_EVENTS,
] as const;

export type ActivationFunnelEventType = (typeof ACTIVATION_FUNNEL_EVENT_TYPES)[number];

export type ActivationFunnelAttribution = {
  source?: string | null;
  routedSource?: string | null;
  venueSlug?: string | null;
  venueId?: string | null;
  venueName?: string | null;
  creator?: string | null;
  packageId?: string | null;
  budgetRange?: string | null;
  goal?: string | null;
  buyerType?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  referrer?: string | null;
};

type MetadataRecord = Record<string, unknown>;

type StuckActivationIntake = {
  id: string;
  company: string;
  contactName: string;
  email: string;
  city: string;
  venue: string;
  status: string;
  amount: number | null;
  budgetRange: string;
  packageId: string;
  source: string;
  ageHours: number;
  nextActionAt: string | null;
  priority: {
    score: number;
    reasons: string[];
  };
};

const DEFAULT_FUNNEL_PERIOD_DAYS = 30;
const STUCK_LEAD_MIN_AGE_HOURS = 24;
const ALERT_COOLDOWN_MS = 3 * 60 * 60 * 1000;
const ACTIVE_INTAKE_STATUSES = [
  'NEW',
  'QUALIFIED',
  'NEEDS_INFO',
  'READY_TO_INVOICE',
  'PAYMENT_SENT',
  'PAID_CONFIRMED',
];

const STATUS_EVENT_BY_STATUS: Record<string, ActivationFunnelEventType> = {
  QUALIFIED: 'ACTIVATION_STATUS_QUALIFIED',
  READY_TO_INVOICE: 'ACTIVATION_STATUS_READY_TO_INVOICE',
  PAYMENT_SENT: 'ACTIVATION_STATUS_PAYMENT_SENT',
  PAID_CONFIRMED: 'ACTIVATION_STATUS_PAID_CONFIRMED',
  LAUNCHED: 'ACTIVATION_STATUS_LAUNCHED',
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

export function isActivationFunnelEventType(value: string): value is ActivationFunnelEventType {
  return ACTIVATION_FUNNEL_EVENT_TYPES.includes(value as ActivationFunnelEventType);
}

export function activationFunnelEventTypeForStatus(status: string | null | undefined) {
  if (!status) return null;
  return STATUS_EVENT_BY_STATUS[status] ?? null;
}

function asRecord(value: unknown): MetadataRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
    ? (value as MetadataRecord)
    : {};
}

function cleanString(value: unknown, maxLength = 240) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function safeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function hoursSince(value: Date) {
  return Math.max(0, Math.round((Date.now() - value.getTime()) / (1000 * 60 * 60)));
}

function normalizeStatus(value: unknown) {
  const status = stringValue(value).toUpperCase();
  return STATUS_LABELS[status] ? status : 'NEW';
}

function normalizeJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;

  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return { serializationError: 'metadata_unserializable' };
  }
}

function eventTitle(eventType: ActivationFunnelEventType) {
  const labels: Record<ActivationFunnelEventType, string> = {
    ACTIVATION_PAGE_VIEW: 'Activation page viewed',
    ACTIVATION_CTA_CLICK: 'Activation CTA clicked',
    ACTIVATION_SPARK_AUDIT_USED: 'Spark Audit used',
    ACTIVATION_FORM_START: 'Activation form started',
    ACTIVATION_FORM_SUBMIT: 'Activation form submitted',
    ACTIVATION_STATUS_QUALIFIED: 'Activation intake qualified',
    ACTIVATION_STATUS_READY_TO_INVOICE: 'Activation intake ready to invoice',
    ACTIVATION_STATUS_PAYMENT_SENT: 'Activation payment sent',
    ACTIVATION_STATUS_PAID_CONFIRMED: 'Activation paid confirmed',
    ACTIVATION_STATUS_LAUNCHED: 'Activation launched',
    ACTIVATION_FOLLOWUP_ALERT_SENT: 'Activation follow-up alert sent',
  };
  return labels[eventType];
}

function statusReached(status: string, reachedStatuses: string[]) {
  return reachedStatuses.includes(status);
}

function conversionRate(value: number, previous: number | null) {
  if (!previous || previous <= 0) return null;
  return Math.round((value / previous) * 100);
}

function countBy<T>(rows: T[], keyForRow: (row: T) => string) {
  return Array.from(
    rows.reduce((map, row) => {
      const key = keyForRow(row) || 'direct';
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export async function recordActivationFunnelEvent(input: {
  eventType: ActivationFunnelEventType;
  source?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  sessionKey?: string | null;
  eventId?: string | null;
  dedupeKey?: string | null;
  title?: string | null;
  amount?: number | null;
  status?: string | null;
  actor?: string | null;
  href?: string | null;
  venueId?: string | null;
  venueSlug?: string | null;
  attribution?: ActivationFunnelAttribution | null;
  metadata?: MetadataRecord | null;
  occurredAt?: Date;
}) {
  const eventId = cleanString(input.eventId, 120);
  const sessionKey = cleanString(input.sessionKey, 200);
  const subjectId = cleanString(input.subjectId, 200) || sessionKey || null;
  const source = cleanString(input.source, 80) || 'activation-funnel';
  const attribution = asRecord(input.attribution);
  const venueSlug =
    cleanString(input.venueSlug, 180) ||
    cleanString(attribution.venueSlug, 180) ||
    null;
  const dedupeKey =
    cleanString(input.dedupeKey, 260) ||
    `activation-funnel:${input.eventType}:${subjectId ?? sessionKey ?? 'anon'}:${eventId || randomUUID()}`;

  try {
    await prisma.founderEvent.upsert({
      where: { dedupeKey },
      create: {
        eventType: input.eventType,
        source,
        subjectType: input.subjectType ?? 'activation_funnel',
        subjectId,
        dedupeKey,
        title: input.title ?? eventTitle(input.eventType),
        amount: input.amount ?? null,
        status: input.status ?? null,
        actor: input.actor ?? null,
        href: input.href ?? '/activations',
        venueId: cleanString(input.venueId, 120) || null,
        venueSlug,
        metadataJson: normalizeJson({
          ...(input.metadata ?? {}),
          attribution,
          sessionKey: sessionKey || null,
          eventId: eventId || null,
        }),
        occurredAt: input.occurredAt ?? new Date(),
      },
      update: {
        source,
        title: input.title ?? eventTitle(input.eventType),
        amount: input.amount ?? null,
        status: input.status ?? null,
        actor: input.actor ?? null,
        href: input.href ?? '/activations',
        venueId: cleanString(input.venueId, 120) || null,
        venueSlug,
        metadataJson: normalizeJson({
          ...(input.metadata ?? {}),
          attribution,
          sessionKey: sessionKey || null,
          eventId: eventId || null,
        }),
      },
    });
  } catch (error) {
    console.warn('[ACTIVATION_FUNNEL] Failed to record event:', error);
  }
}

export async function buildActivationFunnelSummary(options: { periodDays?: number } = {}) {
  const periodDays = Math.max(1, Math.round(options.periodDays ?? DEFAULT_FUNNEL_PERIOD_DAYS));
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const [eventCounts, intakeRows, stuckIntakes] = await Promise.all([
    prisma.founderEvent.groupBy({
      by: ['eventType'],
      where: {
        occurredAt: { gte: periodStart },
        eventType: { in: [...ACTIVATION_PUBLIC_FUNNEL_EVENTS] },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.founderEvent.findMany({
      where: {
        eventType: 'ACTIVATION_INTAKE',
        occurredAt: { gte: periodStart },
      },
      orderBy: { occurredAt: 'desc' },
      take: 240,
      select: {
        id: true,
        status: true,
        amount: true,
        metadataJson: true,
        occurredAt: true,
      },
    }),
    findStuckActivationIntakes({ minAgeHours: STUCK_LEAD_MIN_AGE_HOURS }),
  ]);

  const countMap = new Map(eventCounts.map((row) => [row.eventType, row._count._all]));
  const statusRows = intakeRows.map((row) => ({
    ...row,
    status: normalizeStatus(row.status),
    metadata: asRecord(row.metadataJson),
  }));
  const submissions = intakeRows.length;
  const formStarts = Math.max(countMap.get('ACTIVATION_FORM_START') ?? 0, submissions);
  const qualified = statusRows.filter((row) =>
    statusReached(row.status, ['QUALIFIED', 'READY_TO_INVOICE', 'PAYMENT_SENT', 'PAID_CONFIRMED', 'LAUNCHED'])
  ).length;
  const paymentSent = statusRows.filter((row) =>
    statusReached(row.status, ['PAYMENT_SENT', 'PAID_CONFIRMED', 'LAUNCHED'])
  ).length;
  const paid = statusRows.filter((row) =>
    statusReached(row.status, ['PAID_CONFIRMED', 'LAUNCHED'])
  ).length;
  const launched = statusRows.filter((row) => row.status === 'LAUNCHED').length;

  const rawSteps = [
    {
      key: 'views',
      label: 'Views',
      value: countMap.get('ACTIVATION_PAGE_VIEW') ?? 0,
      hint: 'Public activation page sessions.',
    },
    {
      key: 'ctaClicks',
      label: 'CTA clicks',
      value: countMap.get('ACTIVATION_CTA_CLICK') ?? 0,
      hint: 'Launch, audit, portal, and intake clicks.',
    },
    {
      key: 'formStarts',
      label: 'Starts',
      value: formStarts,
      hint: 'First meaningful intake form edits.',
    },
    {
      key: 'submissions',
      label: 'Submits',
      value: submissions,
      hint: 'Real activation intake records.',
    },
    {
      key: 'qualified',
      label: 'Qualified',
      value: qualified,
      hint: 'Qualified or further down the pipe.',
    },
    {
      key: 'paymentSent',
      label: 'Payment sent',
      value: paymentSent,
      hint: 'Payment packet sent or beyond.',
    },
    {
      key: 'paid',
      label: 'Paid',
      value: paid,
      hint: 'Paid confirmed or launched.',
    },
    {
      key: 'launched',
      label: 'Launched',
      value: launched,
      hint: 'Activation moved into launch handoff.',
    },
  ];

  const steps = rawSteps.map((step, index) => ({
    ...step,
    conversionFromPrevious: conversionRate(step.value, index === 0 ? null : rawSteps[index - 1].value),
  }));

  const topSources = countBy(statusRows, (row) => {
    const metadata = row.metadata;
    const attribution = asRecord(metadata.activationAttribution);
    return (
      cleanString(metadata.routedSource, 80) ||
      cleanString(attribution.source, 80) ||
      cleanString(attribution.routedSource, 80) ||
      cleanString(metadata.source, 80) ||
      'direct'
    );
  }).slice(0, 5);

  const topPackages = countBy(statusRows, (row) => cleanString(row.metadata.packageId, 80) || 'unknown')
    .slice(0, 5);
  const submittedAmount = intakeRows.reduce((sum, row) => sum + (safeNumber(row.amount) ?? 0), 0);

  return {
    periodDays,
    generatedAt: new Date().toISOString(),
    steps,
    sparkAudits: countMap.get('ACTIVATION_SPARK_AUDIT_USED') ?? 0,
    submittedAmount,
    attribution: {
      topSources,
      topPackages,
    },
    stuck: {
      count: stuckIntakes.length,
      minAgeHours: STUCK_LEAD_MIN_AGE_HOURS,
      top: stuckIntakes[0] ?? null,
    },
  };
}

export async function findStuckActivationIntakes(options: { minAgeHours?: number } = {}) {
  const minAgeHours = Math.max(1, Math.round(options.minAgeHours ?? STUCK_LEAD_MIN_AGE_HOURS));
  const ageCutoff = new Date(Date.now() - minAgeHours * 60 * 60 * 1000);

  const rows = await prisma.founderEvent.findMany({
    where: {
      eventType: 'ACTIVATION_INTAKE',
      occurredAt: { lte: ageCutoff },
    },
    orderBy: { occurredAt: 'asc' },
    take: 120,
    select: {
      id: true,
      status: true,
      amount: true,
      actor: true,
      metadataJson: true,
      occurredAt: true,
      updatedAt: true,
    },
  });

  const now = Date.now();
  const stuck = rows
    .map((row): StuckActivationIntake | null => {
      const status = normalizeStatus(row.status);
      if (!ACTIVE_INTAKE_STATUSES.includes(status)) return null;

      const metadata = asRecord(row.metadataJson);
      const operator = asRecord(metadata.operator);
      const attribution = asRecord(metadata.activationAttribution);
      const nextActionAtRaw = stringValue(operator.nextActionAt);
      const nextActionDate = nextActionAtRaw ? new Date(nextActionAtRaw) : null;
      const hasValidNextAction = Boolean(nextActionDate && !Number.isNaN(nextActionDate.getTime()));
      const isOverdue = Boolean(hasValidNextAction && (nextActionDate as Date).getTime() < now);
      const hasNoNextAction = !hasValidNextAction;

      if (!hasNoNextAction && !isOverdue) return null;

      const amount = safeNumber(row.amount);
      const packageId = cleanString(metadata.packageId, 80);
      const budgetRange = cleanString(metadata.budgetRange, 80);
      const timeline = cleanString(metadata.timeline, 80);
      const routedSource =
        cleanString(metadata.routedSource, 80) ||
        cleanString(attribution.source, 80) ||
        cleanString(attribution.routedSource, 80);
      const routedVenueSlug = cleanString(metadata.routedVenueSlug, 180) || cleanString(attribution.venueSlug, 180);
      const venue = cleanString(metadata.venue, 180);
      const ageHours = hoursSince(row.occurredAt);
      const reasons: string[] = [];
      let score = 0;

      if (hasNoNextAction) {
        score += 34;
        reasons.push('no next action');
      }
      if (isOverdue) {
        score += 34;
        reasons.push('overdue');
      }
      if ((amount ?? 0) >= 5000 || budgetRange === '5000_15000' || budgetRange === '15000_plus') {
        score += 24;
        reasons.push('large budget');
      } else if ((amount ?? 0) >= 1500 || budgetRange === '1500_5000') {
        score += 16;
        reasons.push('real budget');
      }
      if (packageId === 'local-signal' || packageId === 'city-takeover') {
        score += 12;
        reasons.push('higher package');
      }
      if (timeline === 'this_week' || timeline === 'this_month') {
        score += 12;
        reasons.push('near timeline');
      }
      if (routedSource || routedVenueSlug || venue) {
        score += 10;
        reasons.push('routed context');
      }
      if (status === 'PAYMENT_SENT' || status === 'READY_TO_INVOICE') {
        score += 18;
        reasons.push(status === 'PAYMENT_SENT' ? 'money pending' : 'ready to pay');
      }
      if (ageHours >= 72) {
        score += 12;
        reasons.push('72h stale');
      } else if (ageHours >= 24) {
        score += 8;
        reasons.push('24h stale');
      }

      const highIntent =
        score >= 58 ||
        Boolean(venue || routedVenueSlug) ||
        (amount ?? 0) >= 1500 ||
        ['PAYMENT_SENT', 'READY_TO_INVOICE'].includes(status);

      if (!highIntent) return null;

      return {
        id: row.id,
        company: cleanString(metadata.company, 140) || 'Activation lead',
        contactName: cleanString(metadata.contactName, 120),
        email: cleanString(metadata.email, 180) || row.actor || '',
        city: cleanString(metadata.city, 140),
        venue,
        status,
        amount,
        budgetRange,
        packageId,
        source: routedSource || 'direct',
        ageHours,
        nextActionAt: hasValidNextAction ? (nextActionDate as Date).toISOString() : null,
        priority: {
          score,
          reasons: reasons.slice(0, 5),
        },
      };
    })
    .filter((row): row is StuckActivationIntake => Boolean(row))
    .sort((a, b) => b.priority.score - a.priority.score || b.ageHours - a.ageHours);

  return stuck.slice(0, 12);
}

export async function checkAndSendActivationIntakeFollowUpAlert() {
  const stuckIntakes = await findStuckActivationIntakes({ minAgeHours: STUCK_LEAD_MIN_AGE_HOURS });

  if (stuckIntakes.length === 0) {
    return {
      alerted: false,
      urgentCount: 0,
      reason: 'NO_STUCK_INTAKES' as const,
    };
  }

  const lastAlert = await prisma.founderEvent.findFirst({
    where: {
      eventType: 'ACTIVATION_FOLLOWUP_ALERT_SENT',
      occurredAt: { gte: new Date(Date.now() - ALERT_COOLDOWN_MS) },
    },
    orderBy: { occurredAt: 'desc' },
    select: { id: true, occurredAt: true },
  });

  if (lastAlert) {
    return {
      alerted: false,
      urgentCount: stuckIntakes.length,
      reason: 'COOLDOWN' as const,
      lastAlertAt: lastAlert.occurredAt.toISOString(),
    };
  }

  const sent = await alertActivationIntakeFollowUpQueue({
    urgentCount: stuckIntakes.length,
    minAgeHours: STUCK_LEAD_MIN_AGE_HOURS,
    leads: stuckIntakes.map((lead) => ({
      leadId: lead.id,
      company: lead.company,
      contactName: lead.contactName,
      email: lead.email,
      city: lead.city,
      venue: lead.venue,
      status: STATUS_LABELS[lead.status] ?? lead.status,
      budgetRange: lead.budgetRange,
      packageId: lead.packageId,
      source: lead.source,
      ageHours: lead.ageHours,
      reasons: lead.priority.reasons,
    })),
  });

  if (!sent) {
    return {
      alerted: false,
      urgentCount: stuckIntakes.length,
      reason: 'SEND_FAILED' as const,
    };
  }

  await recordActivationFunnelEvent({
    eventType: 'ACTIVATION_FOLLOWUP_ALERT_SENT',
    source: 'activation-intake-cron',
    dedupeKey: `activation-followup-alert:${new Date().toISOString().slice(0, 13)}`,
    title: 'Activation follow-up alert sent',
    status: 'SENT',
    href: '/admin/activation-intakes',
    metadata: {
      urgentCount: stuckIntakes.length,
      leadIds: stuckIntakes.map((lead) => lead.id),
    },
  });

  trackServerEvent('activation_intake_follow_up_alert_sent', {
    urgentCount: stuckIntakes.length,
    source: 'activation_intake_cron',
  });

  return {
    alerted: true,
    urgentCount: stuckIntakes.length,
    reason: 'ALERT_SENT' as const,
  };
}

export async function markActivationIntakeLaunchedFromCampaign(input: {
  leadId: string;
  campaignId: string;
  campaignTitle: string;
  venueId?: string | null;
  venueSlug?: string | null;
  actor?: string | null;
  amount?: number | null;
}) {
  const lead = await prisma.founderEvent.findFirst({
    where: {
      id: input.leadId,
      eventType: 'ACTIVATION_INTAKE',
    },
    select: {
      id: true,
      status: true,
      amount: true,
      metadataJson: true,
    },
  });

  if (!lead) return { updated: false, reason: 'LEAD_NOT_FOUND' as const };

  const currentStatus = normalizeStatus(lead.status);
  const metadata = asRecord(lead.metadataJson);
  const statusHistory = Array.isArray(metadata.statusHistory) ? metadata.statusHistory : [];
  const nextMetadata = normalizeJson({
    ...metadata,
    statusHistory:
      currentStatus !== 'LAUNCHED'
        ? [
            ...statusHistory.slice(-12),
            {
              from: currentStatus,
              to: 'LAUNCHED',
              at: new Date().toISOString(),
              by: input.actor ?? 'campaign-create',
              campaignId: input.campaignId,
            },
          ]
        : statusHistory,
    launchedFromCampaign: {
      campaignId: input.campaignId,
      campaignTitle: input.campaignTitle,
      at: new Date().toISOString(),
    },
  }) as Prisma.InputJsonValue;

  await prisma.founderEvent.update({
    where: { id: lead.id },
    data: {
      status: 'LAUNCHED',
      href: '/admin/activation-intakes',
      metadataJson: nextMetadata,
    },
  });

  await recordActivationFunnelEvent({
    eventType: 'ACTIVATION_STATUS_LAUNCHED',
    source: 'campaign-create',
    subjectType: 'activation_lead',
    subjectId: lead.id,
    dedupeKey: `activation-status:${lead.id}:LAUNCHED:${input.campaignId}`,
    title: `Activation launched: ${input.campaignTitle}`,
    amount: input.amount ?? lead.amount ?? null,
    status: 'LAUNCHED',
    actor: input.actor ?? null,
    href: '/admin/activation-intakes',
    venueId: input.venueId ?? null,
    venueSlug: input.venueSlug ?? null,
    metadata: {
      campaignId: input.campaignId,
      campaignTitle: input.campaignTitle,
      previousStatus: currentStatus,
    },
  });

  return { updated: true, reason: 'UPDATED' as const };
}
