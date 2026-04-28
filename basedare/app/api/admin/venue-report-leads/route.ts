import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

type PipelineStageKey =
  | 'CONTACTED'
  | 'CLAIM_STARTED'
  | 'ACTIVATION_LAUNCHED'
  | 'REPEAT_LAUNCHED';

const STAGE_PRIORITY: PipelineStageKey[] = [
  'REPEAT_LAUNCHED',
  'ACTIVATION_LAUNCHED',
  'CLAIM_STARTED',
  'CONTACTED',
];

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function hoursSince(value: Date) {
  return Math.max(0, Math.round((Date.now() - value.getTime()) / (1000 * 60 * 60)));
}

function buildLeadPriority(input: {
  audience: 'venue' | 'sponsor';
  intent: string | null;
  followUpStatus: string;
  ownerWallet: string | null;
  nextActionAt: Date | null;
  contactedAt: Date;
  stage: PipelineStageKey;
}) {
  let score = 0;
  const reasons: string[] = [];
  const staleHours = hoursSince(input.contactedAt);
  const isOverdue = Boolean(input.nextActionAt && input.nextActionAt.getTime() < Date.now());

  if (!input.ownerWallet && ['NEW', 'FOLLOWING_UP'].includes(input.followUpStatus)) {
    score += 35;
    reasons.push('unowned');
  }

  if (isOverdue) {
    score += 30;
    reasons.push('overdue');
  }

  if (input.audience === 'sponsor') {
    score += 18;
    reasons.push('sponsor');
  }

  if (input.intent === 'repeat') {
    score += 16;
    reasons.push('repeat-spend');
  } else if (input.intent === 'activation') {
    score += 12;
    reasons.push('activation');
  } else if (input.intent === 'claim') {
    score += 8;
    reasons.push('claim');
  }

  if (input.stage === 'CONTACTED') {
    score += 14;
    reasons.push('fresh');
  } else if (input.stage === 'CLAIM_STARTED') {
    score += 10;
    reasons.push('claim-live');
  }

  if (staleHours >= 72) {
    score += 14;
    reasons.push('stale');
  } else if (staleHours >= 24) {
    score += 8;
    reasons.push('aging');
  }

  const label =
    score >= 75 ? 'Immediate' : score >= 50 ? 'High' : score >= 28 ? 'Active' : 'Monitor';

  return {
    score,
    label,
    reasons,
    staleHours,
    isOverdue,
  };
}

const VenueReportLeadUpdateSchema = z.object({
  leadId: z.string().min(1),
  followUpStatus: z.enum(['NEW', 'FOLLOWING_UP', 'WAITING', 'CONVERTED', 'ARCHIVED']).optional(),
  ownerWallet: z.string().min(6).max(120).nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
});

const VenueReportLeadCreateSchema = z.object({
  venueId: z.string().min(1).optional(),
  venueSlug: z.string().min(1).optional(),
  audience: z.enum(['venue', 'sponsor']).default('venue'),
  intent: z.enum(['claim', 'activation', 'repeat']).nullable().optional(),
  email: z.string().email(),
  name: z.string().max(120).nullable().optional(),
  organization: z.string().max(160).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  ownerWallet: z.string().min(6).max(120).nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
}).refine((value) => Boolean(value.venueId || value.venueSlug), {
  message: 'venueId or venueSlug is required',
});

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const leads = await prisma.venueReportLead.findMany({
      orderBy: { contactedAt: 'desc' },
      take: 40,
      select: {
        id: true,
        audience: true,
        source: true,
        intent: true,
        sessionKey: true,
        email: true,
        name: true,
        organization: true,
        notes: true,
        followUpStatus: true,
        ownerWallet: true,
        nextActionAt: true,
        contactedAt: true,
        createdAt: true,
        venueId: true,
        venue: {
          select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            country: true,
            claimedBy: true,
            claimRequestStatus: true,
          },
        },
        reportEvents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            eventType: true,
            channel: true,
            sessionKey: true,
            createdAt: true,
          },
        },
      },
    });

    const sessionPairs = leads
      .filter((lead) => lead.sessionKey)
      .map((lead) => ({ venueId: lead.venueId, sessionKey: lead.sessionKey as string }));

    const sessionEvents = sessionPairs.length
      ? await prisma.venueReportEvent.findMany({
          where: {
            OR: sessionPairs.map((pair) => ({
              venueId: pair.venueId,
              sessionKey: pair.sessionKey,
            })),
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            venueId: true,
            leadId: true,
            eventType: true,
            channel: true,
            sessionKey: true,
            createdAt: true,
          },
        })
      : [];

    const eventsBySession = new Map<string, typeof sessionEvents>();
    for (const event of sessionEvents) {
      if (!event.sessionKey) continue;
      const key = `${event.venueId}:${event.sessionKey}`;
      const existing = eventsBySession.get(key);
      if (existing) {
        existing.push(event);
      } else {
        eventsBySession.set(key, [event]);
      }
    }

    const leadEntries = leads.map((lead) => {
      const key = lead.sessionKey ? `${lead.venueId}:${lead.sessionKey}` : null;
      const combinedEvents = [
        ...lead.reportEvents.map((event) => ({
          ...event,
          venueId: lead.venueId,
          leadId: lead.id,
        })),
        ...(key ? eventsBySession.get(key) ?? [] : []),
      ]
        .filter((event, index, array) => array.findIndex((item) => item.id === event.id) === index)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const reachedStage =
        STAGE_PRIORITY.find((stage) => combinedEvents.some((event) => event.eventType === stage)) ?? 'CONTACTED';
      const stageEvent = combinedEvents.find((event) => event.eventType === reachedStage) ?? null;
      const latestEvent = combinedEvents[0] ?? null;
      const priority = buildLeadPriority({
        audience: lead.audience as 'venue' | 'sponsor',
        intent: lead.intent,
        followUpStatus: lead.followUpStatus,
        ownerWallet: lead.ownerWallet,
        nextActionAt: lead.nextActionAt,
        contactedAt: lead.contactedAt,
        stage: reachedStage,
      });

      return {
        id: lead.id,
        audience: lead.audience,
        source: lead.source,
        intent: lead.intent,
        sessionKey: lead.sessionKey,
        email: lead.email,
        name: lead.name,
        organization: lead.organization,
        notes: lead.notes,
        followUpStatus: lead.followUpStatus,
        ownerWallet: lead.ownerWallet,
        nextActionAt: toIso(lead.nextActionAt),
        contactedAt: lead.contactedAt.toISOString(),
        createdAt: lead.createdAt.toISOString(),
        venue: {
          ...lead.venue,
        },
        pipeline: {
          stage: reachedStage,
          stageLabel:
            reachedStage === 'REPEAT_LAUNCHED'
              ? 'Repeat launched'
              : reachedStage === 'ACTIVATION_LAUNCHED'
                ? 'Activation launched'
                : reachedStage === 'CLAIM_STARTED'
                  ? 'Claim started'
                  : 'Contacted',
          stageAt: toIso(stageEvent?.createdAt),
          latestEventLabel:
            latestEvent?.eventType
              ?.toLowerCase()
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (char) => char.toUpperCase()) ?? 'Contacted',
          latestEventAt: toIso(latestEvent?.createdAt),
        },
        priority,
        events: combinedEvents.slice(0, 6).map((event) => ({
          id: event.id,
          eventType: event.eventType,
          channel: event.channel,
          createdAt: event.createdAt.toISOString(),
        })),
      };
    });

    const sortedLeads = [...leadEntries].sort((a, b) => {
      if (b.priority.score !== a.priority.score) return b.priority.score - a.priority.score;
      return new Date(b.contactedAt).getTime() - new Date(a.contactedAt).getTime();
    });

    const summary = {
      totalLeads: sortedLeads.length,
      newLeads: leadEntries.filter((lead) => lead.followUpStatus === 'NEW').length,
      activeFollowUps: leadEntries.filter((lead) =>
        ['FOLLOWING_UP', 'WAITING'].includes(lead.followUpStatus)
      ).length,
      overdue: leadEntries.filter((lead) => lead.priority.isOverdue).length,
      unowned: leadEntries.filter((lead) => !lead.ownerWallet).length,
      venueAudience: leadEntries.filter((lead) => lead.audience === 'venue').length,
      sponsorAudience: leadEntries.filter((lead) => lead.audience === 'sponsor').length,
      claimStarted: leadEntries.filter((lead) => lead.pipeline.stage === 'CLAIM_STARTED').length,
      activationsLaunched: leadEntries.filter((lead) => lead.pipeline.stage === 'ACTIVATION_LAUNCHED').length,
      repeatsLaunched: leadEntries.filter((lead) => lead.pipeline.stage === 'REPEAT_LAUNCHED').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        leads: sortedLeads,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_VENUE_REPORT_LEADS] Fetch failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load report leads' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const body = await request.json();
    const validation = VenueReportLeadCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const input = validation.data;
    const venue = await prisma.venue.findFirst({
      where: input.venueId ? { id: input.venueId } : { slug: input.venueSlug },
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        country: true,
      },
    });

    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    const existingLead = await prisma.venueReportLead.findFirst({
      where: {
        venueId: venue.id,
        email: {
          equals: input.email,
          mode: 'insensitive',
        },
        followUpStatus: {
          in: ['NEW', 'FOLLOWING_UP', 'WAITING'],
        },
      },
      select: {
        id: true,
        followUpStatus: true,
        ownerWallet: true,
        nextActionAt: true,
      },
    });

    if (existingLead) {
      return NextResponse.json(
        {
          success: false,
          error: 'An active lead already exists for this venue and email.',
          data: {
            ...existingLead,
            nextActionAt: toIso(existingLead.nextActionAt),
          },
        },
        { status: 409 }
      );
    }

    const lead = await prisma.venueReportLead.create({
      data: {
        venueId: venue.id,
        audience: input.audience,
        source: 'ADMIN_SCOUT_COMMAND',
        intent: input.intent ?? null,
        email: input.email,
        name: input.name ?? null,
        organization: input.organization ?? null,
        notes: input.notes ?? null,
        ownerWallet: input.ownerWallet ?? null,
        nextActionAt: input.nextActionAt ? new Date(input.nextActionAt) : null,
        followUpStatus: input.ownerWallet ? 'FOLLOWING_UP' : 'NEW',
      },
      select: {
        id: true,
        audience: true,
        intent: true,
        email: true,
        name: true,
        organization: true,
        notes: true,
        followUpStatus: true,
        ownerWallet: true,
        nextActionAt: true,
        contactedAt: true,
      },
    });

    await prisma.venueReportEvent.create({
      data: {
        venueId: venue.id,
        leadId: lead.id,
        audience: input.audience,
        eventType: 'CONTACTED',
        channel: 'admin-scout-command',
        metadataJson: {
          intent: input.intent ?? null,
          source: 'admin-scout-command',
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...lead,
        nextActionAt: toIso(lead.nextActionAt),
        contactedAt: lead.contactedAt.toISOString(),
        venue,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_VENUE_REPORT_LEADS] Create failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to create report lead' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const body = await request.json();
    const validation = VenueReportLeadUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const { leadId, followUpStatus, ownerWallet, nextActionAt } = validation.data;

    const updatedLead = await prisma.venueReportLead.update({
      where: { id: leadId },
      data: {
        followUpStatus: followUpStatus ?? undefined,
        ownerWallet: ownerWallet === undefined ? undefined : ownerWallet,
        nextActionAt: nextActionAt === undefined ? undefined : nextActionAt ? new Date(nextActionAt) : null,
      },
      select: {
        id: true,
        followUpStatus: true,
        ownerWallet: true,
        nextActionAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedLead,
        nextActionAt: toIso(updatedLead.nextActionAt),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_VENUE_REPORT_LEADS] Update failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to update report lead' }, { status: 500 });
  }
}
