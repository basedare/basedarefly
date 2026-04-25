import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { alertVenueReportHighIntentEvent } from '@/lib/telegram';
import type { VenueReportPipelineSummary } from '@/lib/venue-types';

export const SHARE_EVENT_TYPES = ['SHARE', 'COPY_BRIEF', 'COPY_LINK', 'EMAIL_BRIEF'] as const;
export const REPORT_EVENT_TYPES = [
  'OPEN',
  ...SHARE_EVENT_TYPES,
  'CONTACTED',
  'CLAIM_STARTED',
  'ACTIVATION_LAUNCHED',
  'REPEAT_LAUNCHED',
] as const;

type ReportEventType = (typeof REPORT_EVENT_TYPES)[number];
type VenueReportAlertEventType = Exclude<ReportEventType, 'OPEN' | 'SHARE' | 'COPY_BRIEF' | 'COPY_LINK'>;

const TELEGRAM_REPORT_EVENTS = new Set<VenueReportAlertEventType>([
  'EMAIL_BRIEF',
  'CONTACTED',
  'CLAIM_STARTED',
  'ACTIVATION_LAUNCHED',
  'REPEAT_LAUNCHED',
]);

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function latestAt(
  events: Array<{ eventType: string; createdAt: Date }>,
  types: readonly string[]
) {
  return toIso(events.find((event) => types.includes(event.eventType))?.createdAt);
}

function buildSummary(input: VenueReportPipelineSummary['stages']) {
  if (input.repeatLaunched.active) return 'This report has already driven a repeat activation.';
  if (input.activationLaunched.active) return 'This report has already pushed a fresh activation into launch.';
  if (input.claimStarted.active) return 'This report has already triggered a venue claim path.';
  if (input.contacted.active) return 'This report has already turned into an active business conversation.';
  if (input.shared.active) return 'This report is circulating, but it still needs a real handoff.';
  return 'No downstream pipeline movement yet. Share it or route it into a warm intro.';
}

function intentFromEvent(eventType: ReportEventType, metadataJson?: Record<string, unknown> | null) {
  const metadataIntent = metadataJson?.intent;
  if (typeof metadataIntent === 'string') return metadataIntent;
  if (eventType === 'CLAIM_STARTED') return 'claim';
  if (eventType === 'ACTIVATION_LAUNCHED') return 'activation';
  if (eventType === 'REPEAT_LAUNCHED') return 'repeat';
  return null;
}

function shouldAlertVenueReportEvent(input: {
  eventType: ReportEventType;
  audience: 'venue' | 'sponsor';
}) {
  if (!TELEGRAM_REPORT_EVENTS.has(input.eventType as VenueReportAlertEventType)) return false;
  if (input.eventType === 'EMAIL_BRIEF') return input.audience === 'sponsor';
  return true;
}

function queueVenueReportAlert(input: {
  venue: {
    name: string;
    slug: string;
    city: string | null;
    country: string | null;
  };
  audience: 'venue' | 'sponsor';
  eventType: ReportEventType;
  channel?: string | null;
  intent?: string | null;
  email?: string | null;
  name?: string | null;
  organization?: string | null;
  notes?: string | null;
  leadId?: string | null;
}) {
  if (!shouldAlertVenueReportEvent({ eventType: input.eventType, audience: input.audience })) {
    return;
  }

  void alertVenueReportHighIntentEvent({
    venueName: input.venue.name,
    venueSlug: input.venue.slug,
    city: input.venue.city,
    country: input.venue.country,
    audience: input.audience,
    eventType: input.eventType,
    channel: input.channel,
    intent: input.intent,
    email: input.email,
    name: input.name,
    organization: input.organization,
    notes: input.notes,
    leadId: input.leadId,
  }).catch((error) => {
    console.error('[VENUE_REPORT_PIPELINE] Telegram alert failed:', error);
  });
}

export async function getVenueReportPipelineSummary(
  venueId: string
): Promise<VenueReportPipelineSummary> {
  const empty: VenueReportPipelineSummary = {
    summary: 'No downstream pipeline movement yet. Share it or route it into a warm intro.',
    opens: 0,
    shares: 0,
    contacts: 0,
    lastTouchedAt: null,
    stages: {
      shared: { active: false, at: null },
      contacted: { active: false, at: null },
      claimStarted: { active: false, at: null },
      activationLaunched: { active: false, at: null },
      repeatLaunched: { active: false, at: null },
    },
  };

  try {
    const [events, leads] = await Promise.all([
      prisma.venueReportEvent.findMany({
        where: { venueId },
        orderBy: { createdAt: 'desc' },
        take: 64,
        select: {
          eventType: true,
          createdAt: true,
        },
      }),
      prisma.venueReportLead.findMany({
        where: { venueId },
        orderBy: { contactedAt: 'desc' },
        take: 24,
        select: {
          contactedAt: true,
        },
      }),
    ]);

    const shareAt = latestAt(events, SHARE_EVENT_TYPES);
    const contactedAt = toIso(leads[0]?.contactedAt);
    const claimStartedAt = latestAt(events, ['CLAIM_STARTED']);
    const activationLaunchedAt = latestAt(events, ['ACTIVATION_LAUNCHED']);
    const repeatLaunchedAt = latestAt(events, ['REPEAT_LAUNCHED']);
    const lastTouchedAt = toIso(events[0]?.createdAt ?? leads[0]?.contactedAt ?? null);

    const stages = {
      shared: { active: Boolean(shareAt), at: shareAt },
      contacted: { active: Boolean(contactedAt), at: contactedAt },
      claimStarted: { active: Boolean(claimStartedAt), at: claimStartedAt },
      activationLaunched: { active: Boolean(activationLaunchedAt), at: activationLaunchedAt },
      repeatLaunched: { active: Boolean(repeatLaunchedAt), at: repeatLaunchedAt },
    };

    return {
      summary: buildSummary(stages),
      opens: events.filter((event) => event.eventType === 'OPEN').length,
      shares: events.filter((event) => SHARE_EVENT_TYPES.includes(event.eventType as (typeof SHARE_EVENT_TYPES)[number])).length,
      contacts: leads.length,
      lastTouchedAt,
      stages,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('VenueReportEvent') ||
      message.includes('VenueReportLead') ||
      message.includes('does not exist') ||
      message.includes('Unknown field')
    ) {
      return empty;
    }
    throw error;
  }
}

export async function recordVenueReportEvent(input: {
  venueId: string;
  audience: 'venue' | 'sponsor';
  eventType: ReportEventType;
  sessionKey?: string | null;
  channel?: string | null;
  metadataJson?: Record<string, unknown> | null;
}) {
  try {
    if (
      input.eventType === 'OPEN' &&
      input.sessionKey
    ) {
      const existing = await prisma.venueReportEvent.findFirst({
        where: {
          venueId: input.venueId,
          audience: input.audience,
          eventType: input.eventType,
          sessionKey: input.sessionKey,
        },
        select: { id: true },
      });
      if (existing) return;
    }

    const event = await prisma.venueReportEvent.create({
      data: {
        venueId: input.venueId,
        audience: input.audience,
        eventType: input.eventType,
        sessionKey: input.sessionKey ?? null,
        channel: input.channel ?? null,
        metadataJson: (input.metadataJson ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      select: {
        eventType: true,
        audience: true,
        channel: true,
        venue: {
          select: {
            name: true,
            slug: true,
            city: true,
            country: true,
          },
        },
      },
    });

    queueVenueReportAlert({
      venue: event.venue,
      audience: event.audience as 'venue' | 'sponsor',
      eventType: event.eventType as ReportEventType,
      channel: event.channel,
      intent: intentFromEvent(input.eventType, input.metadataJson),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('VenueReportEvent') ||
      message.includes('does not exist') ||
      message.includes('Unknown field')
    ) {
      return;
    }
    throw error;
  }
}

export async function recordVenueReportLead(input: {
  venueId: string;
  audience: 'venue' | 'sponsor';
  sessionKey?: string | null;
  intent?: 'claim' | 'activation' | 'repeat' | null;
  email: string;
  name?: string | null;
  organization?: string | null;
  notes?: string | null;
}) {
  try {
    const lead = await prisma.venueReportLead.create({
      data: {
        venueId: input.venueId,
        audience: input.audience,
        sessionKey: input.sessionKey ?? null,
        intent: input.intent ?? null,
        email: input.email,
        name: input.name ?? null,
        organization: input.organization ?? null,
        notes: input.notes ?? null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        notes: true,
        audience: true,
        intent: true,
        venue: {
          select: {
            name: true,
            slug: true,
            city: true,
            country: true,
          },
        },
      },
    });

    await prisma.venueReportEvent.create({
      data: {
        venueId: input.venueId,
        leadId: lead.id,
        audience: input.audience,
        eventType: 'CONTACTED',
        sessionKey: input.sessionKey ?? null,
        metadataJson: {
          intent: input.intent ?? null,
        },
      },
    });

    queueVenueReportAlert({
      venue: lead.venue,
      audience: lead.audience as 'venue' | 'sponsor',
      eventType: 'CONTACTED',
      channel: 'venue-report-handoff',
      intent: lead.intent,
      email: lead.email,
      name: lead.name,
      organization: lead.organization,
      notes: lead.notes,
      leadId: lead.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('VenueReportLead') ||
      message.includes('VenueReportEvent') ||
      message.includes('does not exist') ||
      message.includes('Unknown field')
    ) {
      return;
    }
    throw error;
  }
}
