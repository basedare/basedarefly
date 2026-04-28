import 'server-only';

import { buildFounderScoreboardPulse } from '@/lib/founder-scoreboard';
import { prisma } from '@/lib/prisma';
import { buildVenueScoutCommandReport } from '@/lib/venue-scout-command';
import type {
  DailyCommandItem,
  DailyCommandLoopReport,
  DailyCommandMetric,
  DailyCommandRiskTier,
  DailyCommandTone,
  DailyReviewItem,
} from '@/lib/daily-command-loop-types';

const ACTIVE_VENUE_LEAD_STATUSES = ['NEW', 'FOLLOWING_UP', 'WAITING'];
const ACTIVE_CAMPAIGN_STATUSES = ['FUNDING', 'RECRUITING', 'LIVE', 'ACTIVE', 'VERIFYING'];
const OPEN_CAMPAIGN_SLOT_STATUSES = ['OPEN', 'CLAIMED', 'SUBMITTED'];
const COMPLETED_DARE_STATUSES = ['VERIFIED', 'PAID', 'COMPLETED'];

const DAY_MS = 24 * 60 * 60 * 1000;

function hoursSince(value: Date | null | undefined) {
  if (!value) return 0;
  return Math.max(0, Math.round((Date.now() - value.getTime()) / (1000 * 60 * 60)));
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

function toneForQueue(count: number, warningAt = 1, criticalAt = 5): DailyCommandTone {
  if (count >= criticalAt) return 'critical';
  if (count >= warningAt) return 'warning';
  return 'positive';
}

function riskLabel(riskTier: DailyCommandRiskTier) {
  if (riskTier === 'human') return 'Human-only';
  if (riskTier === 'review') return 'Needs review';
  return 'Auto-safe';
}

function buildVenueLeadPriority(input: {
  audience: string;
  intent: string | null;
  followUpStatus: string;
  ownerWallet: string | null;
  nextActionAt: Date | null;
  contactedAt: Date;
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

  if (staleHours >= 72) {
    score += 14;
    reasons.push('stale');
  } else if (staleHours >= 24) {
    score += 8;
    reasons.push('aging');
  }

  return {
    score,
    reasons,
    staleHours,
    isOverdue,
  };
}

function buildMetric(
  id: string,
  label: string,
  value: string | number,
  detail: string,
  tone: DailyCommandTone
): DailyCommandMetric {
  return { id, label, value, detail, tone };
}

function command(input: DailyCommandItem): DailyCommandItem {
  return input;
}

function reviewItem(input: DailyReviewItem): DailyReviewItem {
  return input;
}

export async function buildDailyCommandLoopReport(): Promise<DailyCommandLoopReport> {
  const now = new Date();
  const periodStart = new Date(now.getTime() - DAY_MS);

  const [
    moderationDares,
    payoutBacklog,
    venueLeads,
    pendingClaims,
    pendingVenueClaims,
    pendingCreatorTags,
    pendingPlaceTags,
    activeCampaigns,
    openCampaignSlots,
    recentDares,
    recentCompletedDares,
    recentVenueLeads,
    recentPlaceTags,
    recentCheckIns,
    venueScoutReport,
  ] = await Promise.all([
    prisma.dare.findMany({
      where: {
        OR: [
          { status: 'PENDING_REVIEW' },
          {
            status: 'PENDING',
            videoUrl: { not: null },
          },
        ],
      },
      orderBy: [{ updatedAt: 'asc' }],
      take: 60,
      select: {
        id: true,
        shortId: true,
        title: true,
        bounty: true,
        status: true,
        updatedAt: true,
        voteThreshold: true,
        venue: {
          select: {
            name: true,
            slug: true,
          },
        },
        linkedCampaign: {
          select: {
            id: true,
            title: true,
            brand: {
              select: {
                name: true,
              },
            },
          },
        },
        votes: {
          select: {
            voteType: true,
          },
        },
      },
    }),
    prisma.dare.findMany({
      where: { status: 'PENDING_PAYOUT' },
      orderBy: [{ moderatedAt: 'asc' }, { updatedAt: 'asc' }],
      take: 40,
      select: {
        id: true,
        shortId: true,
        title: true,
        bounty: true,
        moderatedAt: true,
        updatedAt: true,
        onChainDareId: true,
        isSimulated: true,
        linkedCampaign: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.venueReportLead.findMany({
      where: {
        followUpStatus: {
          in: ACTIVE_VENUE_LEAD_STATUSES,
        },
      },
      orderBy: [{ contactedAt: 'desc' }],
      take: 80,
      select: {
        id: true,
        audience: true,
        intent: true,
        email: true,
        name: true,
        organization: true,
        followUpStatus: true,
        ownerWallet: true,
        nextActionAt: true,
        contactedAt: true,
        venue: {
          select: {
            name: true,
            slug: true,
            city: true,
            country: true,
          },
        },
      },
    }),
    prisma.dare.count({ where: { claimRequestStatus: 'PENDING' } }),
    prisma.venue.count({ where: { claimRequestStatus: 'PENDING' } }),
    prisma.streamerTag.count({ where: { status: 'PENDING' } }),
    prisma.placeTag.count({ where: { status: 'PENDING' } }),
    prisma.campaign.count({ where: { status: { in: ACTIVE_CAMPAIGN_STATUSES } } }),
    prisma.campaignSlot.count({ where: { status: { in: OPEN_CAMPAIGN_SLOT_STATUSES } } }),
    prisma.dare.count({ where: { createdAt: { gte: periodStart } } }),
    prisma.dare.count({
      where: {
        status: { in: COMPLETED_DARE_STATUSES },
        OR: [
          { verifiedAt: { gte: periodStart } },
          { updatedAt: { gte: periodStart } },
        ],
      },
    }),
    prisma.venueReportLead.count({ where: { createdAt: { gte: periodStart } } }),
    prisma.placeTag.count({ where: { submittedAt: { gte: periodStart } } }),
    prisma.venueCheckIn.count({ where: { scannedAt: { gte: periodStart } } }),
    buildVenueScoutCommandReport(),
  ]);
  const founderScoreboard = await buildFounderScoreboardPulse(7);

  const moderationReady = moderationDares.filter((dare) => {
    const voteCount = dare.votes.length;
    return dare.status === 'PENDING_REVIEW' || voteCount >= dare.voteThreshold;
  });
  const oldestProofHours = moderationDares.reduce(
    (maxAge, dare) => Math.max(maxAge, hoursSince(dare.updatedAt)),
    0
  );
  const campaignBackedReviews = moderationReady.filter((dare) => dare.linkedCampaign).length;

  const payoutBacklogOldestHours = payoutBacklog.reduce(
    (maxAge, dare) => Math.max(maxAge, hoursSince(dare.moderatedAt ?? dare.updatedAt)),
    0
  );
  const payoutMissingOnChainId = payoutBacklog.filter((dare) => !dare.onChainDareId).length;

  const leadPriorities = venueLeads
    .map((lead) => ({
      lead,
      priority: buildVenueLeadPriority({
        audience: lead.audience,
        intent: lead.intent,
        followUpStatus: lead.followUpStatus,
        ownerWallet: lead.ownerWallet,
        nextActionAt: lead.nextActionAt,
        contactedAt: lead.contactedAt,
      }),
    }))
    .sort((left, right) => {
      if (right.priority.score !== left.priority.score) return right.priority.score - left.priority.score;
      return left.lead.contactedAt.getTime() - right.lead.contactedAt.getTime();
    });

  const overdueVenueLeads = leadPriorities.filter(({ priority }) => priority.isOverdue).length;
  const unownedVenueLeads = leadPriorities.filter(({ lead }) => !lead.ownerWallet).length;
  const sponsorLeads = venueLeads.filter((lead) => lead.audience === 'sponsor').length;
  const venueAudienceLeads = venueLeads.filter((lead) => lead.audience === 'venue').length;
  const topLead = leadPriorities[0] ?? null;
  const topScoutRoute = venueScoutReport.routeClusters[0] ?? null;
  const topScoutLead = venueScoutReport.leads[0] ?? null;
  const topSeedCandidate = venueScoutReport.seedCandidates[0] ?? null;

  const pendingTrustItems =
    pendingClaims + pendingVenueClaims + pendingCreatorTags + pendingPlaceTags + moderationReady.length;

  const commands: DailyCommandItem[] = [];
  const founderSignal = founderScoreboard.commandSignal;
  const founderPriority = Math.max(
    founderSignal.cashPriority,
    founderSignal.trustPriority,
    founderSignal.placePriority,
    founderSignal.growthPriority
  );
  const founderWorkstream: DailyCommandItem['workstream'] =
    founderSignal.cashPriority >= founderPriority
      ? 'money'
      : founderSignal.trustPriority >= founderPriority
        ? 'trust'
        : founderSignal.placePriority >= founderPriority
          ? 'market'
          : 'growth';

  if (
    founderSignal.tone !== 'neutral' &&
    !(payoutBacklog.length > 0 && founderSignal.suggestedCommand.startsWith('Clear payout'))
  ) {
    commands.push(
      command({
        id: 'founder-outcome-pulse',
        title: founderSignal.suggestedCommand,
        workstream: founderWorkstream,
        riskTier: founderSignal.tone === 'critical' ? 'human' : founderSignal.tone === 'positive' ? 'auto' : 'review',
        priority: 86 + Math.min(34, Math.round(founderPriority / 4)),
        why: `Founder scoreboard shows ${founderScoreboard.money.settledGmv.toLocaleString()} settled GMV, ${founderScoreboard.money.realizedRevenue.toLocaleString()} estimated revenue, and ${founderScoreboard.place.checkIns} check-ins over ${founderScoreboard.period.label.toLowerCase()}.`,
        nextAction: founderSignal.suggestedCommand,
        href: '/admin/founder-scoreboard',
        evidence: [
          ...founderSignal.evidence,
          `$${founderScoreboard.money.realizedRevenue.toLocaleString()} revenue`,
        ].slice(0, 4),
      })
    );
  }

  if (payoutBacklog.length > 0) {
    commands.push(
      command({
        id: 'payout-backlog',
        title: 'Stabilize payout retry backlog',
        workstream: 'money',
        riskTier: 'human',
        priority: 118 + payoutBacklog.length,
        why: 'Money trust breaks faster than growth compounds. Payouts need a human-owned check before more demand is pushed.',
        nextAction:
          payoutMissingOnChainId > 0
            ? 'Inspect missing on-chain IDs first, then retry settlement only after funding sync is understood.'
            : 'Check retry worker health and confirm the oldest queued payout is moving.',
        href: '/admin',
        evidence: [
          plural(payoutBacklog.length, 'payout queued'),
          `${payoutBacklogOldestHours}h oldest queue age`,
          `${payoutMissingOnChainId} missing on-chain IDs`,
        ],
      })
    );
  }

  if (moderationReady.length > 0 || oldestProofHours >= 24) {
    commands.push(
      command({
        id: 'proof-review',
        title: 'Clear proof review before adding new promises',
        workstream: 'trust',
        riskTier: 'review',
        priority: 108 + moderationReady.length * 4 + campaignBackedReviews * 6,
        why: 'Creator trust improves when proof and payout state moves daily. Campaign-backed reviews should not age silently.',
        nextAction:
          moderationReady.length > 0
            ? 'Review ready proofs in priority order, starting with campaign-backed and oldest proofs.'
            : 'Check aging community proofs and decide whether any should be escalated.',
        href: '/admin',
        evidence: [
          plural(moderationReady.length, 'ready proof'),
          `${campaignBackedReviews} campaign-backed`,
          `${oldestProofHours}h oldest proof`,
        ],
      })
    );
  }

  if (venueLeads.length > 0) {
    commands.push(
      command({
        id: 'venue-lead-follow-up',
        title: 'Convert hot venue and sponsor leads into replies',
        workstream: 'growth',
        riskTier: 'review',
        priority:
          96 +
          overdueVenueLeads * 7 +
          unownedVenueLeads * 4 +
          sponsorLeads * 3 +
          venueScoutReport.summary.immediateLeads * 5,
        why: 'The highest-leverage growth work is turning existing intent into conversations before scouting colder leads.',
        nextAction: topScoutLead
          ? `Open the scout command and work ${topScoutLead.venue.name} in ${topScoutLead.routeCluster}: ${topScoutLead.nextAction}`
          : topLead
            ? `Start with ${topLead.lead.venue.name}; ${topLead.priority.reasons.join(', ') || 'active'} signal needs ownership.`
          : 'Rank active leads, assign owners, then prepare the smallest useful follow-up drafts.',
        href: '/admin/venue-scout-command',
        evidence: [
          plural(venueLeads.length, 'active lead'),
          `${overdueVenueLeads} overdue`,
          `${unownedVenueLeads} unowned`,
          topScoutRoute ? `Top route: ${topScoutRoute.label}` : `${sponsorLeads} sponsor-side`,
        ],
      })
    );
  }

  if (venueScoutReport.summary.seedCandidates > 0) {
    commands.push(
      command({
        id: 'venue-scout-seed-route',
        title: 'Turn warm venue signals into the next lead batch',
        workstream: 'growth',
        riskTier: 'auto',
        priority:
          68 +
          venueScoutReport.summary.seedCandidates * 4 +
          venueScoutReport.summary.activeRoutes * 2 +
          (topSeedCandidate?.score ?? 0) / 3,
        why: 'Venues with place memory, check-ins, dares, campaigns, partner state, or claim intent are warmer than generic scraped lists.',
        nextAction:
          topSeedCandidate
            ? `Create the next lead from ${topSeedCandidate.name}: ${topSeedCandidate.suggestedAngle}`
            : venueScoutReport.currentCommand.nextAction,
        href: '/admin/venue-scout-command',
        evidence: [
          plural(venueScoutReport.summary.seedCandidates, 'seed venue'),
          plural(venueScoutReport.summary.activeRoutes, 'route'),
          topSeedCandidate ? `${topSeedCandidate.score} top seed score` : 'Scout command ready',
        ],
      })
    );
  }

  if (pendingClaims + pendingVenueClaims + pendingCreatorTags + pendingPlaceTags > 0) {
    commands.push(
      command({
        id: 'identity-and-claims',
        title: 'Clear claim and identity gates',
        workstream: 'trust',
        riskTier: 'review',
        priority: 82 + pendingClaims * 5 + pendingVenueClaims * 6 + pendingCreatorTags + pendingPlaceTags,
        why: 'Creators and venues cannot become real operators if claim, tag, and place-memory approvals stall.',
        nextAction: 'Resolve pending claims first, then creator tags, then place-memory tags.',
        href: '/admin',
        evidence: [
          `${pendingClaims} dare claims`,
          `${pendingVenueClaims} venue claims`,
          `${pendingCreatorTags} creator tags`,
          `${pendingPlaceTags} place tags`,
        ],
      })
    );
  }

  if (activeCampaigns > 0 || openCampaignSlots > 0) {
    commands.push(
      command({
        id: 'campaign-supply',
        title: 'Build creator supply against live campaign slots',
        workstream: 'growth',
        riskTier: 'auto',
        priority: 70 + activeCampaigns * 5 + openCampaignSlots,
        why: 'Campaign budget only converts when there are enough credible creators matched to the work.',
        nextAction: 'Prepare a creator shortlist and route each slot to a clear outreach angle for review.',
        href: '/brands/portal',
        evidence: [
          plural(activeCampaigns, 'active campaign'),
          plural(openCampaignSlots, 'open slot'),
          `${recentCompletedDares} completions in the last 24h`,
        ],
      })
    );
  }

  if (recentPlaceTags > 0 || recentCheckIns > 0) {
    commands.push(
      command({
        id: 'place-memory-brief',
        title: 'Turn fresh place memory into today\'s city brief',
        workstream: 'market',
        riskTier: 'auto',
        priority: 58 + recentPlaceTags * 3 + recentCheckIns,
        why: 'Place-memory activity is a cleaner scouting signal than generic venue lists.',
        nextAction: 'Summarize the newest active venues and identify which one deserves an activation follow-up.',
        href: '/map',
        evidence: [
          plural(recentPlaceTags, 'place tag'),
          plural(recentCheckIns, 'check-in'),
          'Last 24h window',
        ],
      })
    );
  }

  commands.push(
    command({
      id: 'default-daily-scouting',
      title: 'Prepare one focused scout batch',
      workstream: 'growth',
      riskTier: 'auto',
      priority: 42,
      why: 'If queues are clear, the loop should create the next batch of qualified conversations.',
      nextAction: venueScoutReport.summary.seedCandidates > 0
        ? venueScoutReport.currentCommand.nextAction
        : 'Build a small ranked list: 5 creators, 3 venues, 2 sponsor prospects, with one outreach angle each.',
      href: venueScoutReport.summary.seedCandidates > 0 ? '/admin/venue-scout-command' : '/admin',
      evidence: ['Safe research only', 'No external send without review', 'Optimized for qualified replies'],
    })
  );

  const commandStack = commands
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 5);

  const safeAutomaticWork = commandStack
    .filter((item) => item.riskTier === 'auto')
    .slice(0, 3);

  if (safeAutomaticWork.length === 0) {
    safeAutomaticWork.push(
      command({
        id: 'safe-memory-hygiene',
        title: 'Rank and dedupe active growth memory',
        workstream: 'ops',
        riskTier: 'auto',
        priority: 35,
        why: 'The loop can safely improve operator clarity without sending anything externally.',
        nextAction: 'Consolidate duplicate leads, stale follow-ups, and missing owners into one review queue.',
        href: '/admin',
        evidence: ['Read-only preparation', riskLabel('auto'), 'Improves tomorrow\'s loop'],
      })
    );
  }

  const needsReview: DailyReviewItem[] = [
    moderationReady.length > 0
      ? reviewItem({
          id: 'proofs',
          title: 'Proof moderation decisions',
          count: moderationReady.length,
          owner: 'Moderator',
          riskTier: 'review',
          nextAction: 'Approve, reject, or hold proofs with campaign-backed items first.',
          href: '/admin',
        })
      : null,
    payoutBacklog.length > 0
      ? reviewItem({
          id: 'payouts',
          title: 'Payout retry review',
          count: payoutBacklog.length,
          owner: 'Founder',
          riskTier: 'human',
          nextAction: 'Check money rails before retrying or promising new settlement timing.',
          href: '/admin',
        })
      : null,
    venueLeads.length > 0
      ? reviewItem({
          id: 'lead-follow-ups',
          title: 'Venue and sponsor follow-up drafts',
          count: venueLeads.length,
          owner: 'Ops',
          riskTier: 'review',
          nextAction: 'Approve the top follow-ups before anything is sent externally.',
          href: '/admin',
        })
      : null,
    pendingClaims + pendingVenueClaims > 0
      ? reviewItem({
          id: 'claim-gates',
          title: 'Dare and venue claim gates',
          count: pendingClaims + pendingVenueClaims,
          owner: 'Moderator',
          riskTier: 'review',
          nextAction: 'Resolve ownership gates so operators can move.',
          href: '/admin',
        })
      : null,
    pendingCreatorTags + pendingPlaceTags > 0
      ? reviewItem({
          id: 'tag-gates',
          title: 'Creator and place-memory tags',
          count: pendingCreatorTags + pendingPlaceTags,
          owner: 'Moderator',
          riskTier: 'review',
          nextAction: 'Approve clean identity/place signals and reject noisy ones.',
          href: '/admin',
        })
      : null,
  ].filter((item): item is DailyReviewItem => item !== null);

  const scorecard = [
    buildMetric(
      'settled-gmv',
      'Settled GMV',
      `$${founderScoreboard.money.settledGmv.toLocaleString()}`,
      `$${founderScoreboard.money.realizedRevenue.toLocaleString()} estimated revenue in ${founderScoreboard.period.label.toLowerCase()}`,
      founderScoreboard.money.settledGmv > 0 ? 'positive' : founderScoreboard.money.liveGmv > 0 ? 'warning' : 'neutral'
    ),
    buildMetric(
      'founder-place',
      'Venue utility',
      founderScoreboard.place.checkIns,
      `${founderScoreboard.place.activeVenues} venues active, ${founderScoreboard.place.venueLinkedDares} venue-linked dares`,
      founderScoreboard.place.checkIns > 0 ? 'positive' : 'neutral'
    ),
    buildMetric(
      'trust-queue',
      'Trust queue',
      pendingTrustItems,
      `${moderationReady.length} ready proofs, ${pendingClaims + pendingVenueClaims} claim gates, ${pendingCreatorTags + pendingPlaceTags} tag gates`,
      toneForQueue(pendingTrustItems, 1, 8)
    ),
    buildMetric(
      'lead-loop',
      'Lead loop',
      venueLeads.length,
      `${overdueVenueLeads} overdue, ${unownedVenueLeads} unowned, ${venueScoutReport.summary.immediateLeads} immediate in scout`,
      toneForQueue(overdueVenueLeads + unownedVenueLeads, 1, 6)
    ),
    buildMetric(
      'venue-scout',
      'Venue scout',
      venueScoutReport.summary.seedCandidates,
      `${venueScoutReport.summary.activeRoutes} routes, ${venueScoutReport.summary.totalLeads} active leads${topScoutRoute ? `, top: ${topScoutRoute.label}` : ''}`,
      venueScoutReport.summary.immediateLeads > 0 || venueScoutReport.summary.seedCandidates > 0 ? 'active' : 'neutral'
    ),
    buildMetric(
      'campaign-supply',
      'Campaign supply',
      openCampaignSlots,
      `${activeCampaigns} active campaigns, ${recentCompletedDares} completions in last 24h`,
      openCampaignSlots > 0 ? 'active' : 'neutral'
    ),
    buildMetric(
      'place-memory',
      'Place memory',
      recentPlaceTags + recentCheckIns,
      `${recentPlaceTags} tags and ${recentCheckIns} check-ins in last 24h`,
      recentPlaceTags + recentCheckIns > 0 ? 'positive' : 'neutral'
    ),
    buildMetric(
      'money-queue',
      'Money queue',
      payoutBacklog.length,
      `${payoutBacklogOldestHours}h oldest payout, ${payoutMissingOnChainId} missing on-chain IDs`,
      payoutBacklog.length > 0 ? 'critical' : 'positive'
    ),
    buildMetric(
      'new-demand',
      'New demand',
      recentDares + recentVenueLeads,
      `${recentDares} dares and ${recentVenueLeads} inbound leads in last 24h`,
      recentDares + recentVenueLeads > 0 ? 'positive' : 'neutral'
    ),
  ];

  const currentSignal =
    payoutBacklog.length > 0
      ? {
          title: 'Money trust is the day-one constraint',
          detail: `${plural(payoutBacklog.length, 'payout')} in retry state. Do not create more external promises until the oldest queue item is understood.`,
          tone: 'critical' as DailyCommandTone,
        }
      : moderationReady.length > 0
        ? {
            title: 'Trust queue should be cleared first',
            detail: `${plural(moderationReady.length, 'proof')} can move today. Fast review improves creator confidence and unlocks payout flow.`,
            tone: 'warning' as DailyCommandTone,
          }
        : founderSignal.tone === 'warning' && founderScoreboard.money.liveGmv > 0
          ? {
              title: 'Funded demand needs outcome conversion',
              detail: `$${founderScoreboard.money.liveGmv.toLocaleString()} live GMV is waiting on proof, review, or payout before it becomes settled GMV.`,
              tone: 'warning' as DailyCommandTone,
            }
        : overdueVenueLeads + unownedVenueLeads > 0
          ? {
              title: 'Follow-up discipline is the highest ROI',
              detail: `${plural(overdueVenueLeads, 'lead')} overdue and ${plural(unownedVenueLeads, 'lead')} unowned. Existing intent beats cold scouting today.`,
              tone: 'active' as DailyCommandTone,
            }
          : venueScoutReport.summary.seedCandidates > 0
            ? {
                title: 'Warm venue route is ready to seed',
                detail: `${plural(venueScoutReport.summary.seedCandidates, 'venue')} has proof signals but no report lead. Convert the top seed before cold list-building.`,
                tone: 'active' as DailyCommandTone,
              }
          : activeCampaigns + openCampaignSlots > 0
            ? {
                title: 'Creator supply is the current leverage point',
                detail: `${plural(activeCampaigns, 'campaign')} and ${plural(openCampaignSlots, 'slot')} need credible creator routing.`,
                tone: 'active' as DailyCommandTone,
              }
            : {
                title: 'Queues are light; create the next conversation batch',
                detail: 'Use the loop to scout a small, ranked batch and prepare drafts for review.',
                tone: 'positive' as DailyCommandTone,
              };

  const learnings = [
    founderScoreboard.money.settledGmv > 0
      ? `$${founderScoreboard.money.settledGmv.toLocaleString()} settled GMV and $${founderScoreboard.money.realizedRevenue.toLocaleString()} estimated revenue surfaced in the Founder Scoreboard.`
      : 'Founder Scoreboard shows no settled GMV in the current 7-day window; today should identify the bottleneck before increasing external promises.',
    recentVenueLeads > 0
      ? `${plural(recentVenueLeads, 'venue/sponsor lead')} arrived in the last 24h, so the loop should prioritize conversion before new sourcing.`
      : venueScoutReport.summary.seedCandidates > 0
        ? `${plural(venueScoutReport.summary.seedCandidates, 'warm venue')} is ready to convert from scout seed into a tracked lead.`
        : 'No new venue lead arrived in the last 24h; today needs either targeted scouting or a stronger inbound prompt.',
    sponsorLeads > venueAudienceLeads
      ? 'Sponsor-side interest is currently heavier than venue-side interest; package activation language around measurable creator movement.'
      : 'Venue-side leads remain the main operating surface; keep follow-ups grounded in foot traffic and creator-proof moments.',
    campaignBackedReviews > 0
      ? `${campaignBackedReviews} campaign-backed proof item needs review; campaign context should raise moderation priority.`
      : 'No campaign-backed proof is currently forcing the review queue.',
    recentPlaceTags + recentCheckIns > 0
      ? 'Fresh place-memory activity exists; use it as evidence for venue follow-up instead of generic marketplace language.'
      : 'Place-memory input is quiet; the city brief needs scouting rather than relying on passive activity.',
    topScoutRoute
      ? `Venue Scout top route is ${topScoutRoute.label}; batch work there before jumping between districts.`
      : 'Venue Scout has no active route cluster yet; create leads from the strongest venue seeds first.',
  ];

  const watchouts = [
    payoutBacklog.length > 0
      ? 'Payout backlog is human-only territory. Do not let the brain imply settlement timing externally.'
      : null,
    overdueVenueLeads > 0
      ? `${plural(overdueVenueLeads, 'lead')} overdue; repeated missed follow-up weakens the memory loop.`
      : null,
    pendingCreatorTags + pendingPlaceTags > 8
      ? 'Tag queues are large enough to pollute identity/place trust if left stale.'
      : null,
    openCampaignSlots > 0 && recentCompletedDares === 0
      ? 'Open campaign slots exist without fresh completions in the last 24h; supply routing may be lagging demand.'
      : null,
    founderScoreboard.money.refundedGmv > 0
      ? `$${founderScoreboard.money.refundedGmv.toLocaleString()} refunded GMV appears in the founder period; do not count it as revenue.`
      : null,
    venueScoutReport.summary.seedCandidates > 0 && venueScoutReport.summary.totalLeads === 0
      ? 'Warm venue seeds exist without active leads; the bottleneck is lead capture, not discovery.'
      : null,
  ].filter((item): item is string => Boolean(item));

  return {
    generatedAt: now.toISOString(),
    period: {
      label: 'Last 24 hours',
      start: periodStart.toISOString(),
      end: now.toISOString(),
    },
    objective: {
      title: 'Daily Command Loop',
      detail:
        'A bounded operator loop: clear trust and money queues, convert existing intent, prepare safe scouting work, and package external actions for review.',
    },
    currentSignal,
    scorecard,
    commandStack,
    needsReview,
    safeAutomaticWork,
    learnings,
    watchouts,
    founderPulse: {
      settledGmv: founderScoreboard.money.settledGmv,
      realizedRevenue: founderScoreboard.money.realizedRevenue,
      liveGmv: founderScoreboard.money.liveGmv,
      completionRate: founderScoreboard.money.completionRate,
      checkIns: founderScoreboard.place.checkIns,
      activeVenues: founderScoreboard.place.activeVenues,
      suggestedCommand: founderSignal.suggestedCommand,
      tone: founderSignal.tone,
      evidence: founderSignal.evidence,
    },
    venueScout: {
      generatedAt: venueScoutReport.generatedAt,
      currentCommand: venueScoutReport.currentCommand,
      summary: venueScoutReport.summary,
      topRoute: topScoutRoute
        ? {
            label: topScoutRoute.label,
            leadCount: topScoutRoute.leadCount,
            immediateCount: topScoutRoute.immediateCount,
            topScore: topScoutRoute.topScore,
            nextMove: topScoutRoute.nextMove,
            suggestedRoute: topScoutRoute.suggestedRoute,
          }
        : null,
      topLead: topScoutLead
        ? {
            venueName: topScoutLead.venue.name,
            routeCluster: topScoutLead.routeCluster,
            priorityLabel: topScoutLead.priority.label,
            score: topScoutLead.priority.score,
            nextAction: topScoutLead.nextAction,
            reasons: topScoutLead.priority.reasons,
            href: '/admin/venue-scout-command',
          }
        : null,
      topSeedCandidate: topSeedCandidate
        ? {
            venueName: topSeedCandidate.name,
            routeCluster: topSeedCandidate.routeCluster,
            score: topSeedCandidate.score,
            suggestedAngle: topSeedCandidate.suggestedAngle,
            reasons: topSeedCandidate.reasons,
            href: '/admin/venue-scout-command',
          }
        : null,
    },
    sourceSignals: {
      moderationReady: moderationReady.length,
      payoutBacklog: payoutBacklog.length,
      activeVenueLeads: venueLeads.length,
      overdueVenueLeads,
      unownedVenueLeads,
      pendingClaims,
      pendingVenueClaims,
      pendingCreatorTags,
      pendingPlaceTags,
      activeCampaigns,
      openCampaignSlots,
      recentDares,
      recentVenueLeads,
      recentPlaceTags,
      recentCheckIns,
      venueScoutRoutes: venueScoutReport.summary.activeRoutes,
      venueScoutSeedCandidates: venueScoutReport.summary.seedCandidates,
    },
  };
}
