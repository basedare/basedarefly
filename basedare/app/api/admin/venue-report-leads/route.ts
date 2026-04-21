import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

const MODERATOR_WALLETS =
  process.env.MODERATOR_WALLETS?.split(',').map((wallet) => wallet.trim().toLowerCase()) || [];

function isModerator(request: NextRequest): string | null {
  const walletHeader = request.headers.get('x-moderator-wallet');
  if (!walletHeader) return null;
  const lowerWallet = walletHeader.toLowerCase();
  return MODERATOR_WALLETS.includes(lowerWallet) ? lowerWallet : null;
}

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

export async function GET(request: NextRequest) {
  const moderatorWallet = isModerator(request);
  if (!moderatorWallet) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
        events: combinedEvents.slice(0, 6).map((event) => ({
          id: event.id,
          eventType: event.eventType,
          channel: event.channel,
          createdAt: event.createdAt.toISOString(),
        })),
      };
    });

    const summary = {
      totalLeads: leadEntries.length,
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
        leads: leadEntries,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_VENUE_REPORT_LEADS] Fetch failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load report leads' }, { status: 500 });
  }
}
