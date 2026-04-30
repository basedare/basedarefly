import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const INTAKE_STATUSES = [
  'NEW',
  'QUALIFIED',
  'NEEDS_INFO',
  'READY_TO_INVOICE',
  'LAUNCHED',
  'REJECTED',
] as const;

const IntakeStatusSchema = z.enum(INTAKE_STATUSES);

const IntakeUpdateSchema = z.object({
  id: z.string().min(1),
  status: IntakeStatusSchema.optional(),
  assignedCreator: z.string().max(120).nullable().optional(),
  assignedVenue: z.string().max(180).nullable().optional(),
  operatorNote: z.string().max(1200).nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
});

type IntakeStatus = (typeof INTAKE_STATUSES)[number];
type MetadataRecord = Record<string, unknown>;

const STATUS_LABELS: Record<IntakeStatus, string> = {
  NEW: 'New',
  QUALIFIED: 'Qualified',
  NEEDS_INFO: 'Needs info',
  READY_TO_INVOICE: 'Ready to invoice',
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

function isRecord(value: unknown): value is MetadataRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asRecord(value: unknown): MetadataRecord {
  return isRecord(value) ? value : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeStatus(value: unknown): IntakeStatus {
  return INTAKE_STATUSES.includes(value as IntakeStatus) ? (value as IntakeStatus) : 'NEW';
}

function cleanOptional(value: string | null | undefined) {
  const clean = value?.replace(/\s+/g, ' ').trim() || '';
  return clean || null;
}

function hoursSince(value: Date) {
  return Math.max(0, Math.round((Date.now() - value.getTime()) / (1000 * 60 * 60)));
}

function buildCreateHref(input: {
  id: string;
  company: string;
  venue: string;
  city: string;
  amount: number | null;
  assignedCreator: string;
}) {
  const params = new URLSearchParams();
  const venueName = input.venue || input.company;
  params.set('mode', 'venue_activation');
  params.set('source', 'activation-intake');
  params.set('activationLeadId', input.id);
  if (venueName) {
    params.set('venueName', venueName);
    params.set('title', `Activate ${venueName}`);
  }
  if (input.city) params.set('city', input.city);
  if (input.amount) params.set('amount', String(input.amount));
  if (input.assignedCreator) params.set('streamer', input.assignedCreator);
  return `/create?${params.toString()}`;
}

function buildScoutHref(input: { id: string; venue: string; city: string }) {
  const params = new URLSearchParams();
  params.set('from', 'activation-intake');
  params.set('leadId', input.id);
  if (input.venue) params.set('venue', input.venue);
  if (input.city) params.set('city', input.city);
  return `/scouts/dashboard?${params.toString()}`;
}

function buildReplyDraft(input: {
  contactName: string;
  company: string;
  venue: string;
  city: string;
  budgetLabel: string;
  timelineLabel: string;
}) {
  const name = input.contactName || 'there';
  const target = input.venue || input.company || 'your activation';
  const cityLine = input.city ? ` in ${input.city}` : '';

  return [
    `Hi ${name}, thanks for sending the BaseDare activation brief.`,
    '',
    `The clean next step is to qualify ${target}${cityLine}: story angle, proof target, creator fit, and budget (${input.budgetLabel}).`,
    `If the timeline is still ${input.timelineLabel}, I can send the first activation route and creator shortlist next.`,
    '',
    'BaseDare keeps the actual funding/proof workflow inside the app, but we can run the early setup concierge-style so it stays simple.',
  ].join('\n');
}

function getMissionIdeas(metadata: MetadataRecord) {
  const activationBrief = asRecord(metadata.activationBrief);
  const ideas = Array.isArray(activationBrief.missionIdeas) ? activationBrief.missionIdeas : [];

  return ideas.slice(0, 5).map((idea) => {
    const record = asRecord(idea);
    return {
      title: stringValue(record.title),
      detail: stringValue(record.detail),
      proofMetric: stringValue(record.proofMetric),
    };
  }).filter((idea) => idea.title || idea.detail);
}

function mapIntakeEvent(event: {
  id: string;
  title: string | null;
  amount: number | null;
  status: string | null;
  actor: string | null;
  href: string | null;
  metadataJson: Prisma.JsonValue | null;
  occurredAt: Date;
  updatedAt: Date;
}) {
  const metadata = asRecord(event.metadataJson);
  const operator = asRecord(metadata.operator);
  const status = normalizeStatus(event.status);
  const company = stringValue(metadata.company);
  const contactName = stringValue(metadata.contactName);
  const email = stringValue(metadata.email || event.actor);
  const city = stringValue(metadata.city);
  const venue = stringValue(metadata.venue);
  const buyerType = stringValue(metadata.buyerType);
  const budgetRange = stringValue(metadata.budgetRange);
  const timeline = stringValue(metadata.timeline);
  const goal = stringValue(metadata.goal);
  const packageId = stringValue(metadata.packageId);
  const website = stringValue(metadata.website);
  const notes = stringValue(metadata.notes);
  const assignedCreator = stringValue(operator.assignedCreator);
  const assignedVenue = stringValue(operator.assignedVenue) || venue;
  const operatorNote = stringValue(operator.operatorNote);
  const nextActionAt = stringValue(operator.nextActionAt);
  const amount = event.amount ?? numberValue(metadata.amount);
  const ageHours = hoursSince(event.occurredAt);
  const budgetLabel = BUDGET_LABELS[budgetRange] || (amount ? `$${amount.toLocaleString()}` : 'budget TBD');
  const timelineLabel = TIMELINE_LABELS[timeline] || timeline || 'timeline TBD';
  const createHref = buildCreateHref({
    id: event.id,
    company,
    venue: assignedVenue,
    city,
    amount,
    assignedCreator,
  });
  const scoutHref = buildScoutHref({
    id: event.id,
    venue: assignedVenue,
    city,
  });

  return {
    id: event.id,
    title: event.title || `${company || 'Activation'} intake`,
    status,
    statusLabel: STATUS_LABELS[status],
    company,
    contactName,
    email,
    buyerType,
    city,
    venue,
    budgetRange,
    budgetLabel,
    timeline,
    timelineLabel,
    goal,
    packageId,
    website,
    notes,
    amount,
    ageHours,
    occurredAt: event.occurredAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    assignedCreator,
    assignedVenue,
    operatorNote,
    nextActionAt,
    missionIdeas: getMissionIdeas(metadata),
    positioningLine: stringValue(asRecord(metadata.activationBrief).positioningLine),
    proofLogic: stringValue(asRecord(metadata.activationBrief).proofLogic),
    repeatMetric: stringValue(asRecord(metadata.activationBrief).repeatMetric),
    replyDraft: buildReplyDraft({
      contactName,
      company,
      venue: assignedVenue,
      city,
      budgetLabel,
      timelineLabel,
    }),
    links: {
      createHref,
      scoutHref,
      mailtoHref: email
        ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`BaseDare activation: ${company || assignedVenue || 'next steps'}`)}`
        : null,
    },
  };
}

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const events = await prisma.founderEvent.findMany({
      where: {
        eventType: 'ACTIVATION_INTAKE',
      },
      orderBy: {
        occurredAt: 'desc',
      },
      take: 80,
      select: {
        id: true,
        title: true,
        amount: true,
        status: true,
        actor: true,
        href: true,
        metadataJson: true,
        occurredAt: true,
        updatedAt: true,
      },
    });

    const intakes = events.map(mapIntakeEvent);
    const summary = INTAKE_STATUSES.reduce(
      (acc, status) => ({
        ...acc,
        [status]: intakes.filter((intake) => intake.status === status).length,
      }),
      {} as Record<IntakeStatus, number>
    );

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total: intakes.length,
          active: intakes.filter((intake) => !['LAUNCHED', 'REJECTED'].includes(intake.status)).length,
          readyToInvoice: summary.READY_TO_INVOICE,
          needsInfo: summary.NEEDS_INFO,
          launched: summary.LAUNCHED,
          byStatus: summary,
        },
        intakes,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_ACTIVATION_INTAKES] Fetch failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load activation intakes' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const body = await request.json();
    const validation = IntakeUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const input = validation.data;
    const event = await prisma.founderEvent.findFirst({
      where: {
        id: input.id,
        eventType: 'ACTIVATION_INTAKE',
      },
      select: {
        id: true,
        status: true,
        metadataJson: true,
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: 'Activation intake not found' }, { status: 404 });
    }

    const metadata = asRecord(event.metadataJson);
    const existingOperator = asRecord(metadata.operator);
    const nextOperator: MetadataRecord = {
      ...existingOperator,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.walletAddress,
    };

    if (input.assignedCreator !== undefined) nextOperator.assignedCreator = cleanOptional(input.assignedCreator);
    if (input.assignedVenue !== undefined) nextOperator.assignedVenue = cleanOptional(input.assignedVenue);
    if (input.operatorNote !== undefined) nextOperator.operatorNote = cleanOptional(input.operatorNote);
    if (input.nextActionAt !== undefined) nextOperator.nextActionAt = input.nextActionAt;

    const statusHistory = Array.isArray(metadata.statusHistory) ? metadata.statusHistory : [];
    const nextStatus = input.status ?? normalizeStatus(event.status);
    const nextMetadata = JSON.parse(
      JSON.stringify({
        ...metadata,
        operator: nextOperator,
        statusHistory:
          input.status && input.status !== event.status
            ? [
                ...statusHistory.slice(-12),
                {
                  from: normalizeStatus(event.status),
                  to: input.status,
                  at: new Date().toISOString(),
                  by: auth.walletAddress,
                },
              ]
            : statusHistory,
      })
    ) as Prisma.InputJsonValue;

    const updated = await prisma.founderEvent.update({
      where: { id: event.id },
      data: {
        status: nextStatus,
        href: '/admin/activation-intakes',
        metadataJson: nextMetadata,
      },
      select: {
        id: true,
        title: true,
        amount: true,
        status: true,
        actor: true,
        href: true,
        metadataJson: true,
        occurredAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: mapIntakeEvent(updated),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_ACTIVATION_INTAKES] Update failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to update activation intake' }, { status: 500 });
  }
}
