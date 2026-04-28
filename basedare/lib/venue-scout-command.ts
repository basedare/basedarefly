import 'server-only';

import { prisma } from '@/lib/prisma';
import type {
  VenueScoutCommandReport,
  VenueScoutLead,
  VenueScoutLeadPriority,
  VenueScoutRouteCluster,
  VenueScoutSeedCandidate,
  VenueScoutSuggestedDare,
} from '@/lib/venue-scout-command-types';

type PipelineStageKey =
  | 'CONTACTED'
  | 'EMAIL_BRIEF'
  | 'CLAIM_STARTED'
  | 'ACTIVATION_LAUNCHED'
  | 'REPEAT_LAUNCHED';

type VenueMetricSource = {
  _count: {
    checkIns: number;
    dares: number;
    campaigns: number;
    placeTags: number;
    reportLeads: number;
  };
  memories: Array<{
    checkInCount: number;
    uniqueVisitorCount: number;
    completedDareCount: number;
  }>;
};

type VenueRow = VenueMetricSource & {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  categories: string[];
  isPartner: boolean;
  partnerTier: string | null;
  claimedBy: string | null;
  claimRequestStatus: string | null;
};

type LeadRow = {
  id: string;
  audience: string;
  intent: string | null;
  email: string;
  name: string | null;
  organization: string | null;
  notes: string | null;
  followUpStatus: string;
  ownerWallet: string | null;
  nextActionAt: Date | null;
  contactedAt: Date;
  createdAt: Date;
  venue: VenueRow;
  reportEvents: Array<{
    id: string;
    eventType: string;
    channel: string | null;
    createdAt: Date;
  }>;
};

const STAGE_PRIORITY: PipelineStageKey[] = [
  'REPEAT_LAUNCHED',
  'ACTIVATION_LAUNCHED',
  'CLAIM_STARTED',
  'EMAIL_BRIEF',
  'CONTACTED',
];

const ACTIVE_LEAD_STATUSES = ['NEW', 'FOLLOWING_UP', 'WAITING'];

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function hoursSince(value: Date) {
  return Math.max(0, Math.round((Date.now() - value.getTime()) / (1000 * 60 * 60)));
}

function routeClusterForVenue(venue: Pick<VenueRow, 'city' | 'country'>) {
  if (venue.city && venue.country) return `${venue.city}, ${venue.country}`;
  if (venue.city) return venue.city;
  if (venue.country) return venue.country;
  return 'Unmapped district';
}

function stageLabel(stage: PipelineStageKey) {
  if (stage === 'REPEAT_LAUNCHED') return 'Repeat launched';
  if (stage === 'ACTIVATION_LAUNCHED') return 'Activation launched';
  if (stage === 'CLAIM_STARTED') return 'Claim started';
  if (stage === 'EMAIL_BRIEF') return 'Email brief';
  return 'Contacted';
}

function eventLabel(eventType: string | null | undefined) {
  if (!eventType) return 'Contacted';
  return eventType
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getVenueMetrics(venue: VenueMetricSource) {
  const memory = venue.memories.reduce(
    (acc, entry) => {
      acc.checkIns += entry.checkInCount;
      acc.uniqueVisitors += entry.uniqueVisitorCount;
      acc.completedDares += entry.completedDareCount;
      return acc;
    },
    { checkIns: 0, uniqueVisitors: 0, completedDares: 0 }
  );

  return {
    checkIns: venue._count.checkIns,
    dares: venue._count.dares,
    campaigns: venue._count.campaigns,
    placeTags: venue._count.placeTags,
    reportLeads: venue._count.reportLeads,
    memoryCheckIns: memory.checkIns,
    memoryUniqueVisitors: memory.uniqueVisitors,
    memoryCompletedDares: memory.completedDares,
  };
}

function buildPipeline(events: LeadRow['reportEvents']) {
  const sortedEvents = [...events].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const reachedStage =
    STAGE_PRIORITY.find((stage) => sortedEvents.some((event) => event.eventType === stage)) ?? 'CONTACTED';
  const stageEvent = sortedEvents.find((event) => event.eventType === reachedStage) ?? null;
  const latestEvent = sortedEvents[0] ?? null;

  return {
    stage: reachedStage,
    stageLabel: stageLabel(reachedStage),
    stageAt: toIso(stageEvent?.createdAt),
    latestEventLabel: eventLabel(latestEvent?.eventType),
    latestEventAt: toIso(latestEvent?.createdAt),
  };
}

function buildLeadPriority(input: {
  audience: string;
  intent: string | null;
  followUpStatus: string;
  ownerWallet: string | null;
  nextActionAt: Date | null;
  contactedAt: Date;
  stage: string;
  venue: VenueRow;
  metrics: ReturnType<typeof getVenueMetrics>;
}): VenueScoutLeadPriority {
  let score = 0;
  const reasons: string[] = [];
  const staleHours = hoursSince(input.contactedAt);
  const isOverdue = Boolean(input.nextActionAt && input.nextActionAt.getTime() < Date.now());

  if (!input.ownerWallet && ['NEW', 'FOLLOWING_UP'].includes(input.followUpStatus)) {
    score += 28;
    reasons.push('unowned');
  }

  if (isOverdue) {
    score += 28;
    reasons.push('overdue');
  }

  if (input.audience === 'sponsor') {
    score += 16;
    reasons.push('sponsor');
  }

  if (input.intent === 'repeat') {
    score += 18;
    reasons.push('repeat-spend');
  } else if (input.intent === 'activation') {
    score += 14;
    reasons.push('activation');
  } else if (input.intent === 'claim') {
    score += 10;
    reasons.push('claim');
  }

  if (input.stage === 'CONTACTED' || input.stage === 'EMAIL_BRIEF') {
    score += 10;
    reasons.push('fresh-pipeline');
  } else if (input.stage === 'CLAIM_STARTED') {
    score += 12;
    reasons.push('claim-live');
  }

  if (input.metrics.campaigns > 0) {
    score += 14;
    reasons.push('campaign-history');
  }
  if (input.metrics.memoryCompletedDares > 0 || input.metrics.dares > 0) {
    score += 12;
    reasons.push('proven-dares');
  }
  if (input.metrics.memoryCheckIns > 0 || input.metrics.checkIns > 0) {
    score += 10;
    reasons.push('presence-signal');
  }
  if (input.metrics.placeTags > 0) {
    score += 8;
    reasons.push('creator-footprint');
  }
  if (input.venue.claimRequestStatus === 'PENDING') {
    score += 12;
    reasons.push('claim-request-open');
  }
  if (input.venue.isPartner) {
    score += 10;
    reasons.push('partner');
  }

  if (staleHours >= 72) {
    score += 12;
    reasons.push('stale');
  } else if (staleHours >= 24) {
    score += 6;
    reasons.push('aging');
  }

  const label =
    score >= 80 ? 'Immediate' : score >= 55 ? 'High' : score >= 30 ? 'Active' : 'Monitor';

  return {
    score,
    label,
    reasons,
    staleHours,
    isOverdue,
  };
}

function buildOpportunity(input: {
  audience: string;
  intent: string | null;
  venue: VenueRow;
  metrics: ReturnType<typeof getVenueMetrics>;
}) {
  if (input.audience === 'sponsor') return 'Sponsor a local activation route';
  if (input.intent === 'repeat') return 'Sell a repeat venue activation';
  if (input.intent === 'claim') return 'Convert venue claim into onboarding';
  if (input.intent === 'activation') return 'Launch first paid venue dare';
  if (input.metrics.memoryCompletedDares > 0 || input.metrics.campaigns > 0) {
    return 'Package proven venue proof into a paid pilot';
  }
  if (input.venue.claimRequestStatus === 'PENDING') return 'Close pending venue claim';
  return 'Open a lightweight venue pilot';
}

function buildNextAction(input: {
  lead: Pick<LeadRow, 'ownerWallet' | 'nextActionAt' | 'followUpStatus' | 'intent' | 'audience'>;
  opportunity: string;
  priority: VenueScoutLeadPriority;
}) {
  if (!input.lead.ownerWallet) return 'Assign an owner, then send the venue proof report with the activation angle.';
  if (input.priority.isOverdue) return 'Follow up today with the prepared pitch and ask for a 12-minute pilot call.';
  if (input.lead.intent === 'claim') return 'Push the venue claim over the line and attach one starter dare.';
  if (input.lead.intent === 'repeat') return 'Offer a repeat activation while the last proof signal is still warm.';
  if (input.lead.audience === 'sponsor') return 'Lead with route coverage, not generic impressions.';
  if (input.lead.followUpStatus === 'WAITING') return 'Wait, then reopen with the concrete activation idea below.';
  return `Use the prepared pitch to move this from ${input.opportunity.toLowerCase()} into a booked next step.`;
}

function buildSuggestedDare(input: {
  venue: VenueRow;
  metrics: ReturnType<typeof getVenueMetrics>;
  intent: string | null;
}): VenueScoutSuggestedDare {
  const category = input.venue.categories[0]?.toLowerCase() ?? 'local venue';
  const hasProof = input.metrics.memoryCompletedDares > 0 || input.metrics.dares > 0;
  const title =
    input.intent === 'repeat'
      ? `Return to ${input.venue.name} and beat the last moment`
      : `Turn ${input.venue.name} into tonight's proof stop`;

  return {
    title,
    bountyRange: hasProof ? '$40-$120' : '$25-$75',
    proofHook: category.includes('bar') || category.includes('night')
      ? 'short nightlife proof clip with venue tag'
      : 'QR check-in plus short creator proof clip',
    why: hasProof
      ? 'There is already venue memory here, so the pitch can be framed as repeating a signal that worked.'
      : `A lightweight ${category} activation creates the first measurable proof point without asking for a big pilot.`,
  };
}

function buildPitch(input: {
  lead: LeadRow;
  opportunity: string;
  metrics: ReturnType<typeof getVenueMetrics>;
  suggestedDare: VenueScoutSuggestedDare;
}) {
  const venue = input.lead.venue;
  const category = venue.categories[0]?.toLowerCase() ?? 'venue';
  const signalCount = input.metrics.memoryCheckIns + input.metrics.checkIns + input.metrics.placeTags;
  const proofLine =
    signalCount > 0
      ? `${venue.name} already has ${signalCount} BaseDare place signal${signalCount === 1 ? '' : 's'} we can turn into a cleaner activation.`
      : `${venue.name} looks like the right kind of ${category} for a small, measurable BaseDare activation.`;
  const subject = `BaseDare pilot idea for ${venue.name}`;
  const bullets = [
    `Run one simple venue dare: "${input.suggestedDare.title}".`,
    `Use ${input.suggestedDare.proofHook} so the venue gets measurable foot-traffic proof, not vague exposure.`,
    `Start at ${input.suggestedDare.bountyRange} and only scale once the proof/report looks strong.`,
  ];
  const cta = 'Worth a 12-minute call this week to see if this fits?';
  const opener =
    input.lead.name
      ? `Hi ${input.lead.name}, ${proofLine}`
      : `Hi, ${proofLine}`;

  return {
    subject,
    opener,
    bullets,
    cta,
    emailBody: [
      opener,
      '',
      `The angle: ${input.opportunity}.`,
      '',
      ...bullets.map((bullet) => `- ${bullet}`),
      '',
      cta,
    ].join('\n'),
  };
}

function mapLead(row: LeadRow): VenueScoutLead {
  const metrics = getVenueMetrics(row.venue);
  const pipeline = buildPipeline(row.reportEvents);
  const priority = buildLeadPriority({
    audience: row.audience,
    intent: row.intent,
    followUpStatus: row.followUpStatus,
    ownerWallet: row.ownerWallet,
    nextActionAt: row.nextActionAt,
    contactedAt: row.contactedAt,
    stage: pipeline.stage,
    venue: row.venue,
    metrics,
  });
  const opportunity = buildOpportunity({
    audience: row.audience,
    intent: row.intent,
    venue: row.venue,
    metrics,
  });
  const suggestedDare = buildSuggestedDare({
    venue: row.venue,
    metrics,
    intent: row.intent,
  });
  const pitch = buildPitch({
    lead: row,
    opportunity,
    metrics,
    suggestedDare,
  });

  return {
    id: row.id,
    audience: row.audience,
    intent: row.intent,
    followUpStatus: row.followUpStatus,
    ownerWallet: row.ownerWallet,
    nextActionAt: toIso(row.nextActionAt),
    contactedAt: row.contactedAt.toISOString(),
    routeCluster: routeClusterForVenue(row.venue),
    opportunity,
    nextAction: buildNextAction({
      lead: row,
      opportunity,
      priority,
    }),
    priority,
    contact: {
      email: row.email,
      name: row.name,
      organization: row.organization,
    },
    venue: {
      id: row.venue.id,
      slug: row.venue.slug,
      name: row.venue.name,
      city: row.venue.city,
      country: row.venue.country,
      categories: row.venue.categories,
      isPartner: row.venue.isPartner,
      partnerTier: row.venue.partnerTier,
      claimedBy: row.venue.claimedBy,
      claimRequestStatus: row.venue.claimRequestStatus,
    },
    metrics,
    pipeline: {
      stage: pipeline.stage,
      stageLabel: pipeline.stageLabel,
      latestEventLabel: pipeline.latestEventLabel,
      latestEventAt: pipeline.latestEventAt,
    },
    pitch,
    suggestedDare,
    links: {
      venue: `/venues/${row.venue.slug}`,
      report: `/venues/${row.venue.slug}/report`,
      map: `/map?place=${encodeURIComponent(row.venue.slug)}&source=scout-command`,
    },
  };
}

function buildRouteClusters(leads: VenueScoutLead[]): VenueScoutRouteCluster[] {
  const groups = leads.reduce((map, lead) => {
    const existing = map.get(lead.routeCluster) ?? [];
    existing.push(lead);
    map.set(lead.routeCluster, existing);
    return map;
  }, new Map<string, VenueScoutLead[]>());

  return Array.from(groups.entries())
    .map(([label, entries]) => {
      const sorted = [...entries].sort((a, b) => b.priority.score - a.priority.score);
      const immediateCount = sorted.filter((lead) => lead.priority.label === 'Immediate').length;
      const totalScore = sorted.reduce((sum, lead) => sum + lead.priority.score, 0);
      const suggestedRoute = sorted.slice(0, 5).map((lead) => lead.venue.name);

      return {
        id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unmapped',
        label,
        leadCount: sorted.length,
        immediateCount,
        topScore: sorted[0]?.priority.score ?? 0,
        totalScore,
        suggestedRoute,
        nextMove:
          immediateCount > 0
            ? `Work ${immediateCount} immediate follow-up${immediateCount === 1 ? '' : 's'} before adding new leads.`
            : `Batch ${Math.min(sorted.length, 5)} stops into one scout route and send the strongest pitch first.`,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 6);
}

function mapSeedCandidate(venue: VenueRow): VenueScoutSeedCandidate {
  const metrics = getVenueMetrics(venue);
  const reasons: string[] = [];
  let score = 0;

  if (metrics.memoryCompletedDares > 0 || metrics.dares > 0) {
    score += 30;
    reasons.push('proven dares');
  }
  if (metrics.memoryCheckIns > 0 || metrics.checkIns > 0) {
    score += 24;
    reasons.push('presence signal');
  }
  if (metrics.placeTags > 0) {
    score += 18;
    reasons.push('creator footprint');
  }
  if (metrics.campaigns > 0) {
    score += 18;
    reasons.push('campaign history');
  }
  if (venue.isPartner) {
    score += 18;
    reasons.push('partner venue');
  }
  if (venue.claimRequestStatus === 'PENDING') {
    score += 16;
    reasons.push('claim pending');
  }

  const category = venue.categories[0]?.toLowerCase() ?? 'local venue';

  return {
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    city: venue.city,
    country: venue.country,
    routeCluster: routeClusterForVenue(venue),
    score,
    reasons: reasons.length ? reasons : ['needs first signal'],
    metrics: {
      checkIns: metrics.checkIns,
      dares: metrics.dares,
      campaigns: metrics.campaigns,
      placeTags: metrics.placeTags,
      memoryCheckIns: metrics.memoryCheckIns,
      memoryCompletedDares: metrics.memoryCompletedDares,
    },
    suggestedAngle:
      score >= 45
        ? `Package ${venue.name}'s existing proof into a venue pilot pitch.`
        : `Seed the first ${category} activation with one small dare and a clear report link.`,
    links: {
      venue: `/venues/${venue.slug}`,
      report: `/venues/${venue.slug}/report`,
      map: `/map?place=${encodeURIComponent(venue.slug)}&source=scout-command`,
    },
  };
}

function buildCurrentCommand(input: {
  leads: VenueScoutLead[];
  routeClusters: VenueScoutRouteCluster[];
  seedCandidates: VenueScoutSeedCandidate[];
}) {
  const immediate = input.leads.filter((lead) => lead.priority.label === 'Immediate');
  const unowned = input.leads.filter((lead) => !lead.ownerWallet);
  const topRoute = input.routeClusters[0] ?? null;

  if (immediate.length > 0) {
    return {
      title: `Close ${immediate.length} hot venue follow-up${immediate.length === 1 ? '' : 's'}`,
      detail: `${topRoute?.label ?? 'The top route'} has the strongest follow-up pressure. Work the highest-score lead before adding new outreach.`,
      nextAction: immediate[0]?.nextAction ?? 'Assign the top lead and send the prepared pitch.',
    };
  }

  if (unowned.length > 0) {
    return {
      title: `Assign ${unowned.length} unowned venue lead${unowned.length === 1 ? '' : 's'}`,
      detail: 'The pipeline has intent, but ownership is the bottleneck. MapiLeads-style value comes from disciplined follow-up.',
      nextAction: 'Assign owners to the top unowned leads, then batch outreach by route cluster.',
    };
  }

  if (input.seedCandidates.length > 0) {
    return {
      title: 'Seed the next venue route',
      detail: 'No urgent follow-up is blocking the venue loop. Add fresh supply from venues with proof signals but no report lead yet.',
      nextAction: `Start with ${input.seedCandidates[0].name} and turn it into one concrete pilot pitch.`,
    };
  }

  return {
    title: 'Venue scout queue is quiet',
    detail: 'No active leads or seed venues surfaced. Use the map to create fresh venue reports before outreach.',
    nextAction: 'Open the map, pick one dense district, and create three venue report leads.',
  };
}

export async function buildVenueScoutCommandReport(): Promise<VenueScoutCommandReport> {
  const [leadRows, seedRows] = await Promise.all([
    prisma.venueReportLead.findMany({
      where: {
        followUpStatus: { in: ACTIVE_LEAD_STATUSES },
      },
      orderBy: { contactedAt: 'desc' },
      take: 60,
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
        createdAt: true,
        venue: {
          select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            country: true,
            categories: true,
            isPartner: true,
            partnerTier: true,
            claimedBy: true,
            claimRequestStatus: true,
            _count: {
              select: {
                checkIns: true,
                dares: true,
                campaigns: true,
                placeTags: true,
                reportLeads: true,
              },
            },
            memories: {
              orderBy: { bucketStartAt: 'desc' },
              take: 6,
              select: {
                checkInCount: true,
                uniqueVisitorCount: true,
                completedDareCount: true,
              },
            },
          },
        },
        reportEvents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            eventType: true,
            channel: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.venue.findMany({
      where: {
        status: 'ACTIVE',
        reportLeads: { none: {} },
        OR: [
          { dares: { some: {} } },
          { checkIns: { some: {} } },
          { placeTags: { some: {} } },
          { campaigns: { some: {} } },
          { isPartner: true },
          { claimRequestStatus: 'PENDING' },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        country: true,
        categories: true,
        isPartner: true,
        partnerTier: true,
        claimedBy: true,
        claimRequestStatus: true,
        _count: {
          select: {
            checkIns: true,
            dares: true,
            campaigns: true,
            placeTags: true,
            reportLeads: true,
          },
        },
        memories: {
          orderBy: { bucketStartAt: 'desc' },
          take: 6,
          select: {
            checkInCount: true,
            uniqueVisitorCount: true,
            completedDareCount: true,
          },
        },
      },
    }),
  ]);

  const leads = (leadRows as LeadRow[])
    .map(mapLead)
    .sort((a, b) => b.priority.score - a.priority.score || new Date(b.contactedAt).getTime() - new Date(a.contactedAt).getTime())
    .slice(0, 24);
  const routeClusters = buildRouteClusters(leads);
  const seedCandidates = (seedRows as VenueRow[])
    .map(mapSeedCandidate)
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const summary = {
    totalLeads: leads.length,
    immediateLeads: leads.filter((lead) => lead.priority.label === 'Immediate').length,
    highLeads: leads.filter((lead) => lead.priority.label === 'High').length,
    unownedLeads: leads.filter((lead) => !lead.ownerWallet).length,
    overdueLeads: leads.filter((lead) => lead.priority.isOverdue).length,
    activeRoutes: routeClusters.length,
    seedCandidates: seedCandidates.length,
    topRoute: routeClusters[0]?.label ?? null,
  };

  return {
    generatedAt: new Date().toISOString(),
    currentCommand: buildCurrentCommand({ leads, routeClusters, seedCandidates }),
    summary,
    routeClusters,
    leads,
    seedCandidates,
  };
}
