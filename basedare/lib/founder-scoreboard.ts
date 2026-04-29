import 'server-only';

import { FEE_CONFIG } from '@/lib/fee-splitter';
import {
  founderLedgerDedupeKey,
  isFounderLedgerEventType,
  isMissingFounderEventStorage,
} from '@/lib/founder-events';
import { prisma } from '@/lib/prisma';
import type {
  FounderLedgerEvent,
  FounderLedgerEventType,
  FounderScoreboardCommandSignal,
  FounderScoreboardFunnelStep,
  FounderScoreboardMetric,
  FounderScoreboardReport,
  FounderScoreboardTone,
} from '@/lib/founder-scoreboard-types';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PERIOD_DAYS = 7;
const DEFAULT_LEDGER_LIMIT = 36;

const FUNDED_DARE_STATUSES = [
  'PENDING',
  'AWAITING_CLAIM',
  'PENDING_REVIEW',
  'PENDING_PAYOUT',
  'VERIFIED',
  'PAID',
  'COMPLETED',
];
const LIVE_DARE_STATUSES = ['PENDING', 'AWAITING_CLAIM', 'PENDING_REVIEW', 'PENDING_PAYOUT'];
const SETTLED_DARE_STATUSES = ['VERIFIED', 'PAID', 'COMPLETED'];
const ACTIVE_CAMPAIGN_STATUSES = ['FUNDING', 'RECRUITING', 'LIVE', 'ACTIVE', 'VERIFYING'];
const OPEN_CAMPAIGN_SLOT_STATUSES = ['OPEN', 'CLAIMED', 'SUBMITTED'];
const PAID_CAMPAIGN_SLOT_STATUSES = ['VERIFIED', 'PAID'];
const ACTIVE_VENUE_LEAD_STATUSES = ['NEW', 'FOLLOWING_UP', 'WAITING'];
const ACTIVE_CREATOR_TAG_STATUSES = ['ACTIVE', 'VERIFIED'];

type ScoreboardOptions = {
  periodDays?: number;
  ledgerLimit?: number;
};

type DareLedgerRow = {
  id: string;
  shortId: string | null;
  title: string;
  bounty: number;
  status: string;
  streamerHandle: string | null;
  stakerAddress: string | null;
  txHash: string | null;
  videoUrl: string | null;
  proofCid: string | null;
  proof_media: string | null;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt: Date | null;
  completed_at: Date | null;
  moderatedAt: Date | null;
  venueId: string | null;
  venue: {
    name: string;
    slug: string;
    city: string | null;
  } | null;
  linkedCampaign: {
    id: string;
    title: string;
  } | null;
};

type FounderEventLedgerRow = {
  id: string;
  eventType: string;
  subjectId: string | null;
  dedupeKey: string;
  title: string | null;
  amount: number | null;
  status: string | null;
  actor: string | null;
  href: string | null;
  venueSlug: string | null;
  occurredAt: Date;
  venue: {
    name: string;
    slug: string;
    city: string | null;
  } | null;
};

function sumAmount<T extends { bounty?: number | null; amount?: number | null }>(rows: T[]) {
  return rows.reduce((sum, row) => sum + safeNumber(row.bounty ?? row.amount), 0);
}

function safeNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

function toneForQueue(count: number, warningAt = 1, criticalAt = 5): FounderScoreboardTone {
  if (count >= criticalAt) return 'critical';
  if (count >= warningAt) return 'warning';
  return 'positive';
}

function metric(input: FounderScoreboardMetric): FounderScoreboardMetric {
  return input;
}

function funnel(input: FounderScoreboardFunnelStep): FounderScoreboardFunnelStep {
  return input;
}

function event(input: FounderLedgerEvent): FounderLedgerEvent {
  return input;
}

function dareHref(dare: { shortId: string | null }) {
  return dare.shortId ? `/dare/${dare.shortId}` : '/admin';
}

function eventLabel(type: FounderLedgerEventType) {
  switch (type) {
    case 'dare_created':
      return 'Created';
    case 'dare_funded':
      return 'Funded';
    case 'proof_submitted':
      return 'Proof';
    case 'dare_settled':
      return 'Settled';
    case 'payout_queued':
      return 'Payout queued';
    case 'dare_refunded':
      return 'Refunded';
    case 'dare_failed':
      return 'Failed';
    case 'campaign_slot_paid':
      return 'Campaign paid';
    case 'venue_check_in':
      return 'Check-in';
    case 'place_tag_submitted':
      return 'Place tag';
  }
}

function eventTone(type: FounderLedgerEventType): FounderScoreboardTone {
  if (type === 'dare_failed' || type === 'dare_refunded') return 'warning';
  if (type === 'payout_queued') return 'critical';
  if (type === 'dare_settled' || type === 'campaign_slot_paid' || type === 'venue_check_in') {
    return 'positive';
  }
  if (type === 'proof_submitted' || type === 'dare_funded') return 'active';
  return 'neutral';
}

function durableEventDetail(type: FounderLedgerEventType) {
  switch (type) {
    case 'dare_created':
      return 'Dare creation was captured by the founder event ledger.';
    case 'dare_funded':
      return 'Funding cleared and the dare moved past funding state.';
    case 'proof_submitted':
      return 'Proof submission was captured for review and settlement tracking.';
    case 'dare_settled':
      return 'Dare settlement was captured by the founder event ledger.';
    case 'payout_queued':
      return 'Proof cleared, but settlement is queued for operator follow-up.';
    case 'dare_refunded':
      return 'Refunded volume is not revenue and should be treated as friction.';
    case 'dare_failed':
      return 'Failed proof or funding should be reviewed for avoidable friction.';
    case 'campaign_slot_paid':
      return 'Campaign slot payout was captured by the founder event ledger.';
    case 'venue_check_in':
      return 'Venue check-in was captured as place-utility proof.';
    case 'place_tag_submitted':
      return 'Place-memory submission was captured by the founder event ledger.';
  }
}

function buildDurableLedgerEvent(row: FounderEventLedgerRow): FounderLedgerEvent | null {
  if (!isFounderLedgerEventType(row.eventType)) {
    return null;
  }

  const type = row.eventType;
  const fallbackId = row.subjectId ? founderLedgerDedupeKey(type, row.subjectId) : `founder-event-${row.id}`;
  const venue = row.venue ?? (row.venueSlug
    ? {
        name: row.title ?? row.venueSlug,
        slug: row.venueSlug,
        city: null,
      }
    : null);

  return event({
    id: row.dedupeKey || fallbackId,
    type,
    label: eventLabel(type),
    title: row.title ?? eventLabel(type),
    occurredAt: row.occurredAt.toISOString(),
    amount: row.amount,
    detail: durableEventDetail(type),
    href: row.href ?? (venue ? `/venues/${venue.slug}` : '/admin'),
    status: row.status,
    actor: row.actor,
    venue,
    tone: eventTone(type),
  });
}

function dedupeLedgerEvents(events: FounderLedgerEvent[]) {
  const seen = new Set<string>();
  return events.filter((ledgerEvent) => {
    if (seen.has(ledgerEvent.id)) return false;
    seen.add(ledgerEvent.id);
    return true;
  });
}

async function fetchFounderEventLedgerRows(periodStart: Date, ledgerLimit: number): Promise<FounderEventLedgerRow[]> {
  try {
    return await prisma.founderEvent.findMany({
      where: {
        occurredAt: { gte: periodStart },
      },
      orderBy: [{ occurredAt: 'desc' }],
      take: Math.max(ledgerLimit * 3, 80),
      select: {
        id: true,
        eventType: true,
        subjectId: true,
        dedupeKey: true,
        title: true,
        amount: true,
        status: true,
        actor: true,
        href: true,
        venueSlug: true,
        occurredAt: true,
        venue: {
          select: {
            name: true,
            slug: true,
            city: true,
          },
        },
      },
    });
  } catch (error) {
    if (isMissingFounderEventStorage(error)) {
      console.warn('[FOUNDER_SCOREBOARD] FounderEvent storage unavailable; using synthesized ledger only');
      return [];
    }

    console.warn('[FOUNDER_SCOREBOARD] Durable ledger query failed; using synthesized ledger only:', error);
    return [];
  }
}

function buildDareLedgerEvents(dare: DareLedgerRow, periodStart: Date): FounderLedgerEvent[] {
  const events: FounderLedgerEvent[] = [];
  const actor = dare.streamerHandle ?? dare.stakerAddress;
  const title = dare.linkedCampaign ? `${dare.title} · ${dare.linkedCampaign.title}` : dare.title;

  if (dare.createdAt >= periodStart) {
    events.push(
      event({
        id: `dare-created-${dare.id}`,
        type: 'dare_created',
        label: eventLabel('dare_created'),
        title,
        occurredAt: dare.createdAt.toISOString(),
        amount: dare.bounty,
        detail: dare.linkedCampaign ? 'Campaign-linked dare entered the system.' : 'Consumer dare entered the system.',
        href: dareHref(dare),
        status: dare.status,
        actor,
        venue: dare.venue,
        tone: eventTone('dare_created'),
      })
    );
  }

  if (FUNDED_DARE_STATUSES.includes(dare.status) && dare.updatedAt >= periodStart) {
    events.push(
      event({
        id: `dare-funded-${dare.id}`,
        type: 'dare_funded',
        label: eventLabel('dare_funded'),
        title,
        occurredAt: dare.updatedAt.toISOString(),
        amount: dare.bounty,
        detail: dare.txHash ? 'Funding tx recorded and dare is past funding state.' : 'Dare is registered past funding state.',
        href: dareHref(dare),
        status: dare.status,
        actor,
        venue: dare.venue,
        tone: eventTone('dare_funded'),
      })
    );
  }

  if ((dare.videoUrl || dare.proofCid || dare.proof_media) && dare.updatedAt >= periodStart) {
    events.push(
      event({
        id: `proof-submitted-${dare.id}`,
        type: 'proof_submitted',
        label: eventLabel('proof_submitted'),
        title,
        occurredAt: dare.updatedAt.toISOString(),
        amount: dare.bounty,
        detail: 'Proof media exists and needs either community, referee, or admin resolution.',
        href: dareHref(dare),
        status: dare.status,
        actor,
        venue: dare.venue,
        tone: eventTone('proof_submitted'),
      })
    );
  }

  const settledAt = dare.verifiedAt ?? dare.completed_at ?? dare.updatedAt;
  if (SETTLED_DARE_STATUSES.includes(dare.status) && settledAt >= periodStart) {
    events.push(
      event({
        id: `dare-settled-${dare.id}`,
        type: 'dare_settled',
        label: eventLabel('dare_settled'),
        title,
        occurredAt: settledAt.toISOString(),
        amount: dare.bounty,
        detail: 'Dare reached a completed/paid state and counts toward settled GMV.',
        href: dareHref(dare),
        status: dare.status,
        actor,
        venue: dare.venue,
        tone: eventTone('dare_settled'),
      })
    );
  }

  if (dare.status === 'PENDING_PAYOUT') {
    const queuedAt = dare.moderatedAt ?? dare.updatedAt;
    events.push(
      event({
        id: `payout-queued-${dare.id}`,
        type: 'payout_queued',
        label: eventLabel('payout_queued'),
        title,
        occurredAt: queuedAt.toISOString(),
        amount: dare.bounty,
        detail: 'Proof cleared but settlement still needs payout retry.',
        href: dareHref(dare),
        status: dare.status,
        actor,
        venue: dare.venue,
        tone: eventTone('payout_queued'),
      })
    );
  }

  if (dare.status === 'REFUNDED' && dare.updatedAt >= periodStart) {
    events.push(
      event({
        id: `dare-refunded-${dare.id}`,
        type: 'dare_refunded',
        label: eventLabel('dare_refunded'),
        title,
        occurredAt: dare.updatedAt.toISOString(),
        amount: dare.bounty,
        detail: 'Refunded volume is not revenue and should be treated as friction.',
        href: dareHref(dare),
        status: dare.status,
        actor,
        venue: dare.venue,
        tone: eventTone('dare_refunded'),
      })
    );
  }

  if (dare.status === 'FAILED' && dare.updatedAt >= periodStart) {
    events.push(
      event({
        id: `dare-failed-${dare.id}`,
        type: 'dare_failed',
        label: eventLabel('dare_failed'),
        title,
        occurredAt: dare.updatedAt.toISOString(),
        amount: dare.bounty,
        detail: 'Failed proof or funding should be reviewed for avoidable friction.',
        href: dareHref(dare),
        status: dare.status,
        actor,
        venue: dare.venue,
        tone: eventTone('dare_failed'),
      })
    );
  }

  return events;
}

function buildCommandSignal(input: {
  liveGmv: number;
  settledGmv: number;
  realizedRevenue: number;
  completionRate: number;
  refundRate: number;
  reviewQueue: number;
  payoutBacklog: number;
  activeVenueLeads: number;
  checkIns: number;
  activeVenues: number;
  openCampaignSlots: number;
}): FounderScoreboardCommandSignal {
  const cashPriority =
    input.payoutBacklog * 24 +
    (input.liveGmv > 0 && input.settledGmv === 0 ? 28 : 0) +
    (input.realizedRevenue === 0 && input.settledGmv > 0 ? 16 : 0);
  const trustPriority = input.reviewQueue * 10 + input.payoutBacklog * 18 + Math.round(input.refundRate * 100);
  const placePriority = input.checkIns > 0 ? 42 + input.activeVenues * 4 : 12;
  const growthPriority = input.activeVenueLeads * 4 + input.openCampaignSlots * 7 + (input.liveGmv === 0 ? 14 : 0);

  if (input.payoutBacklog > 0) {
    return {
      tone: 'critical',
      cashPriority,
      trustPriority,
      placePriority,
      growthPriority,
      suggestedCommand: 'Clear payout backlog before pushing new external promises',
      evidence: [
        plural(input.payoutBacklog, 'payout queued'),
        `${formatMoney(input.liveGmv)} live GMV`,
        `${formatPercent(input.refundRate)} refund rate`,
      ],
    };
  }

  if (input.liveGmv > 0 && input.settledGmv === 0) {
    return {
      tone: 'warning',
      cashPriority,
      trustPriority,
      placePriority,
      growthPriority,
      suggestedCommand: 'Convert live funded GMV into completed outcomes',
      evidence: [
        `${formatMoney(input.liveGmv)} live GMV`,
        `${input.reviewQueue} proofs in review`,
        'No settled GMV in period',
      ],
    };
  }

  if (input.checkIns > 0) {
    return {
      tone: 'positive',
      cashPriority,
      trustPriority,
      placePriority,
      growthPriority,
      suggestedCommand: 'Package venue check-in proof into the next sales follow-up',
      evidence: [
        plural(input.checkIns, 'check-in'),
        plural(input.activeVenues, 'active venue'),
        `${formatMoney(input.settledGmv)} settled GMV`,
      ],
    };
  }

  if (input.activeVenueLeads > 0 || input.openCampaignSlots > 0) {
    return {
      tone: 'active',
      cashPriority,
      trustPriority,
      placePriority,
      growthPriority,
      suggestedCommand: 'Turn existing demand into replies and campaign supply',
      evidence: [
        plural(input.activeVenueLeads, 'active lead'),
        plural(input.openCampaignSlots, 'open campaign slot'),
        `${formatPercent(input.completionRate)} completion rate`,
      ],
    };
  }

  return {
    tone: 'neutral',
    cashPriority,
    trustPriority,
    placePriority,
    growthPriority,
    suggestedCommand: 'Create the next small funded-demand batch',
    evidence: ['No urgent money queue', 'No fresh venue utility signal', 'Scouting can stay auto-safe'],
  };
}

export async function buildFounderScoreboardPulse(periodDays = DEFAULT_PERIOD_DAYS) {
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * DAY_MS);

  const [dareRows, campaignSlotRows, venueCheckIns, venueLeadRows] = await Promise.all([
    prisma.dare.findMany({
      where: {
        OR: [
          { createdAt: { gte: periodStart } },
          { updatedAt: { gte: periodStart } },
          { verifiedAt: { gte: periodStart } },
          { completed_at: { gte: periodStart } },
          { status: { in: LIVE_DARE_STATUSES } },
        ],
      },
      select: {
        bounty: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        verifiedAt: true,
        completed_at: true,
        venueId: true,
        linkedCampaign: {
          select: {
            id: true,
          },
        },
      },
    }),
    prisma.campaignSlot.findMany({
      where: {
        OR: [
          { status: { in: OPEN_CAMPAIGN_SLOT_STATUSES } },
          {
            status: { in: PAID_CAMPAIGN_SLOT_STATUSES },
            OR: [{ paidAt: { gte: periodStart } }, { updatedAt: { gte: periodStart } }],
          },
        ],
      },
      select: {
        status: true,
        paidAt: true,
        updatedAt: true,
        totalPayout: true,
        discoveryRake: true,
        activeRake: true,
        campaign: {
          select: {
            rakePercent: true,
          },
        },
      },
    }),
    prisma.venueCheckIn.findMany({
      where: { scannedAt: { gte: periodStart }, status: 'CONFIRMED' },
      select: { venueId: true },
    }),
    prisma.venueReportLead.findMany({
      where: { followUpStatus: { in: ACTIVE_VENUE_LEAD_STATUSES } },
      select: { id: true },
    }),
  ]);

  const createdDares = dareRows.filter((dare) => dare.createdAt >= periodStart);
  const fundedDares = createdDares.filter((dare) => FUNDED_DARE_STATUSES.includes(dare.status));
  const settledDares = dareRows.filter((dare) => {
    const settledAt = dare.verifiedAt ?? dare.completed_at ?? dare.updatedAt;
    return SETTLED_DARE_STATUSES.includes(dare.status) && settledAt >= periodStart;
  });
  const liveDares = dareRows.filter((dare) => LIVE_DARE_STATUSES.includes(dare.status));
  const pendingPayoutDares = dareRows.filter((dare) => dare.status === 'PENDING_PAYOUT');
  const refundedDares = dareRows.filter((dare) => dare.status === 'REFUNDED' && dare.updatedAt >= periodStart);
  const reviewQueue = dareRows.filter((dare) => dare.status === 'PENDING_REVIEW').length;
  const paidCampaignSlots = campaignSlotRows.filter((slot) => {
    const paidAt = slot.paidAt ?? slot.updatedAt;
    return PAID_CAMPAIGN_SLOT_STATUSES.includes(slot.status) && paidAt >= periodStart;
  });
  const openCampaignSlots = campaignSlotRows.filter((slot) => OPEN_CAMPAIGN_SLOT_STATUSES.includes(slot.status)).length;
  const settledGmv = sumAmount(settledDares);
  const liveGmv = sumAmount(liveDares);
  const consumerSettledGmv = sumAmount(settledDares.filter((dare) => !dare.linkedCampaign));
  const consumerRevenue = consumerSettledGmv * (FEE_CONFIG.P2P.devWalletPercent / 100);
  const campaignRevenue = paidCampaignSlots.reduce((sum, slot) => {
    const totalPayout = safeNumber(slot.totalPayout);
    const scoutRakes = safeNumber(slot.discoveryRake) + safeNumber(slot.activeRake);
    const platformBase = totalPayout + scoutRakes;
    return sum + platformBase * (safeNumber(slot.campaign.rakePercent) / 100);
  }, 0);
  const realizedRevenue = consumerRevenue + campaignRevenue;
  const completionRate = fundedDares.length > 0 ? settledDares.length / fundedDares.length : 0;
  const refundRate = fundedDares.length + refundedDares.length > 0
    ? refundedDares.length / (fundedDares.length + refundedDares.length)
    : 0;
  const activeVenueIds = new Set(venueCheckIns.map((checkIn) => checkIn.venueId));
  const venueLinkedDares = createdDares.filter((dare) => dare.venueId).length;
  const commandSignal = buildCommandSignal({
    liveGmv,
    settledGmv,
    realizedRevenue,
    completionRate,
    refundRate,
    reviewQueue,
    payoutBacklog: pendingPayoutDares.length,
    activeVenueLeads: venueLeadRows.length,
    checkIns: venueCheckIns.length,
    activeVenues: activeVenueIds.size,
    openCampaignSlots,
  });

  return {
    period: {
      label: `Last ${periodDays} days`,
      start: periodStart.toISOString(),
      end: now.toISOString(),
    },
    money: {
      settledGmv: roundMoney(settledGmv),
      realizedRevenue: roundMoney(realizedRevenue),
      liveGmv: roundMoney(liveGmv),
      completionRate,
      refundRate,
      refundedGmv: roundMoney(sumAmount(refundedDares)),
    },
    place: {
      checkIns: venueCheckIns.length,
      activeVenues: activeVenueIds.size,
      venueLinkedDares,
    },
    commandSignal,
  };
}

export async function buildFounderScoreboardReport(
  options: ScoreboardOptions = {}
): Promise<FounderScoreboardReport> {
  const now = new Date();
  const periodDays = options.periodDays ?? DEFAULT_PERIOD_DAYS;
  const ledgerLimit = options.ledgerLimit ?? DEFAULT_LEDGER_LIMIT;
  const periodStart = new Date(now.getTime() - periodDays * DAY_MS);

  const [
    dareRows,
    activeCampaigns,
    campaignSlotRows,
    venueCheckIns,
    placeTagRows,
    venueLeadRows,
    creatorTagRows,
    founderEventRows,
  ] = await Promise.all([
    prisma.dare.findMany({
      where: {
        OR: [
          { createdAt: { gte: periodStart } },
          { updatedAt: { gte: periodStart } },
          { verifiedAt: { gte: periodStart } },
          { completed_at: { gte: periodStart } },
          { status: { in: LIVE_DARE_STATUSES } },
        ],
      },
      select: {
        id: true,
        shortId: true,
        title: true,
        bounty: true,
        status: true,
        streamerHandle: true,
        stakerAddress: true,
        txHash: true,
        videoUrl: true,
        proofCid: true,
        proof_media: true,
        createdAt: true,
        updatedAt: true,
        verifiedAt: true,
        completed_at: true,
        moderatedAt: true,
        venueId: true,
        venue: {
          select: {
            name: true,
            slug: true,
            city: true,
          },
        },
        linkedCampaign: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.campaign.findMany({
      where: { status: { in: ACTIVE_CAMPAIGN_STATUSES } },
      select: { budgetUsdc: true },
    }),
    prisma.campaignSlot.findMany({
      where: {
        OR: [
          { status: { in: OPEN_CAMPAIGN_SLOT_STATUSES } },
          {
            status: { in: PAID_CAMPAIGN_SLOT_STATUSES },
            OR: [{ paidAt: { gte: periodStart } }, { updatedAt: { gte: periodStart } }],
          },
        ],
      },
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        creatorHandle: true,
        creatorAddress: true,
        status: true,
        paidAt: true,
        updatedAt: true,
        totalPayout: true,
        discoveryRake: true,
        activeRake: true,
        campaign: {
          select: {
            title: true,
            rakePercent: true,
            brand: {
              select: {
                name: true,
              },
            },
            venue: {
              select: {
                name: true,
                slug: true,
                city: true,
              },
            },
          },
        },
      },
    }),
    prisma.venueCheckIn.findMany({
      where: { scannedAt: { gte: periodStart }, status: 'CONFIRMED' },
      orderBy: [{ scannedAt: 'desc' }],
      select: {
        id: true,
        venueId: true,
        tag: true,
        walletAddress: true,
        scannedAt: true,
        proofLevel: true,
        source: true,
        venue: {
          select: {
            name: true,
            slug: true,
            city: true,
            isPartner: true,
          },
        },
      },
    }),
    prisma.placeTag.findMany({
      where: {
        OR: [
          { submittedAt: { gte: periodStart } },
          {
            status: 'APPROVED',
            reviewedAt: { gte: periodStart },
          },
        ],
      },
      orderBy: [{ submittedAt: 'desc' }],
      select: {
        id: true,
        creatorTag: true,
        walletAddress: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        proofType: true,
        venue: {
          select: {
            name: true,
            slug: true,
            city: true,
          },
        },
      },
    }),
    prisma.venueReportLead.findMany({
      where: {
        OR: [
          { followUpStatus: { in: ACTIVE_VENUE_LEAD_STATUSES } },
          { createdAt: { gte: periodStart } },
        ],
      },
      select: {
        followUpStatus: true,
        createdAt: true,
      },
    }),
    prisma.streamerTag.findMany({
      where: {
        OR: [
          { status: { in: ACTIVE_CREATOR_TAG_STATUSES } },
          { createdAt: { gte: periodStart } },
        ],
      },
      select: {
        status: true,
        createdAt: true,
      },
    }),
    fetchFounderEventLedgerRows(periodStart, ledgerLimit),
  ]);

  const createdDares = dareRows.filter((dare) => dare.createdAt >= periodStart);
  const fundedDares = createdDares.filter((dare) => FUNDED_DARE_STATUSES.includes(dare.status));
  const settledDares = dareRows.filter((dare) => {
    const settledAt = dare.verifiedAt ?? dare.completed_at ?? dare.updatedAt;
    return SETTLED_DARE_STATUSES.includes(dare.status) && settledAt >= periodStart;
  });
  const liveDares = dareRows.filter((dare) => LIVE_DARE_STATUSES.includes(dare.status));
  const pendingPayoutDares = dareRows.filter((dare) => dare.status === 'PENDING_PAYOUT');
  const refundedDares = dareRows.filter((dare) => dare.status === 'REFUNDED' && dare.updatedAt >= periodStart);
  const failedDares = dareRows.filter((dare) => dare.status === 'FAILED' && dare.updatedAt >= periodStart);
  const proofDares = dareRows.filter(
    (dare) =>
      dare.updatedAt >= periodStart &&
      Boolean(dare.videoUrl || dare.proofCid || dare.proof_media)
  );
  const reviewQueue = dareRows.filter((dare) => dare.status === 'PENDING_REVIEW').length;
  const openCampaignSlots = campaignSlotRows.filter((slot) => OPEN_CAMPAIGN_SLOT_STATUSES.includes(slot.status)).length;
  const paidCampaignSlots = campaignSlotRows.filter((slot) => {
    const paidAt = slot.paidAt ?? slot.updatedAt;
    return PAID_CAMPAIGN_SLOT_STATUSES.includes(slot.status) && paidAt >= periodStart;
  });
  const placeTags = placeTagRows.filter((placeTag) => placeTag.submittedAt >= periodStart).length;
  const approvedPlaceTags = placeTagRows.filter((placeTag) => {
    const approvedAt = placeTag.reviewedAt ?? placeTag.submittedAt;
    return placeTag.status === 'APPROVED' && approvedAt >= periodStart;
  }).length;
  const venueLinkedDares = createdDares.filter((dare) => dare.venueId).length;
  const activeVenueLeads = venueLeadRows.filter((lead) =>
    ACTIVE_VENUE_LEAD_STATUSES.includes(lead.followUpStatus)
  ).length;
  const newVenueLeads = venueLeadRows.filter((lead) => lead.createdAt >= periodStart).length;
  const activeCreators = creatorTagRows.filter((tag) => ACTIVE_CREATOR_TAG_STATUSES.includes(tag.status)).length;
  const newCreatorTags = creatorTagRows.filter((tag) => tag.createdAt >= periodStart).length;
  const recentDares = [...dareRows]
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, Math.max(ledgerLimit * 2, 60));
  const recentCheckIns = venueCheckIns.slice(0, ledgerLimit);
  const recentPlaceTags = placeTagRows
    .filter((placeTag) => placeTag.submittedAt >= periodStart)
    .slice(0, ledgerLimit);
  const recentPaidSlots = paidCampaignSlots.slice(0, ledgerLimit);

  const createdGmv = sumAmount(createdDares);
  const fundedGmv = sumAmount(fundedDares);
  const settledGmv = sumAmount(settledDares);
  const liveGmv = sumAmount(liveDares);
  const pendingPayoutGmv = sumAmount(pendingPayoutDares);
  const refundedGmv = sumAmount(refundedDares);
  const failedGmv = sumAmount(failedDares);
  const consumerSettledGmv = sumAmount(settledDares.filter((dare) => !dare.linkedCampaign));
  const consumerRevenue = consumerSettledGmv * (FEE_CONFIG.P2P.devWalletPercent / 100);
  const campaignRevenue = paidCampaignSlots.reduce((sum, slot) => {
    const totalPayout = safeNumber(slot.totalPayout);
    const scoutRakes = safeNumber(slot.discoveryRake) + safeNumber(slot.activeRake);
    const platformBase = totalPayout + scoutRakes;
    return sum + platformBase * (safeNumber(slot.campaign.rakePercent) / 100);
  }, 0);
  const realizedRevenue = consumerRevenue + campaignRevenue;
  const completionRate = fundedDares.length > 0 ? settledDares.length / fundedDares.length : 0;
  const refundRate = fundedDares.length + refundedDares.length > 0
    ? refundedDares.length / (fundedDares.length + refundedDares.length)
    : 0;
  const activeVenueIds = new Set(venueCheckIns.map((checkIn) => checkIn.venueId));
  const partnerVenueCheckIns = venueCheckIns.filter((checkIn) => checkIn.venue.isPartner).length;
  const averageSettledBounty = settledDares.length > 0 ? settledGmv / settledDares.length : 0;

  const commandSignal = buildCommandSignal({
    liveGmv,
    settledGmv,
    realizedRevenue,
    completionRate,
    refundRate,
    reviewQueue,
    payoutBacklog: pendingPayoutDares.length,
    activeVenueLeads,
    checkIns: venueCheckIns.length,
    activeVenues: activeVenueIds.size,
    openCampaignSlots,
  });

  const scorecard = [
    metric({
      id: 'funded-gmv',
      label: 'Funded GMV',
      value: formatMoney(fundedGmv),
      detail: `${plural(fundedDares.length, 'funded dare')} in the period`,
      tone: fundedGmv > 0 ? 'active' : 'neutral',
    }),
    metric({
      id: 'settled-gmv',
      label: 'Settled GMV',
      value: formatMoney(settledGmv),
      detail: `${plural(settledDares.length, 'settled dare')} reached completed/paid`,
      tone: settledGmv > 0 ? 'positive' : liveGmv > 0 ? 'warning' : 'neutral',
    }),
    metric({
      id: 'realized-revenue',
      label: 'Revenue',
      value: formatMoney(realizedRevenue),
      detail: `${formatMoney(consumerRevenue)} consumer fee + ${formatMoney(campaignRevenue)} campaign rake`,
      tone: realizedRevenue > 0 ? 'positive' : settledGmv > 0 ? 'warning' : 'neutral',
    }),
    metric({
      id: 'completion-rate',
      label: 'Completion',
      value: formatPercent(completionRate),
      detail: `${settledDares.length}/${Math.max(fundedDares.length, 1)} funded dares settled in the window`,
      tone: completionRate >= 0.5 ? 'positive' : fundedDares.length > 0 ? 'warning' : 'neutral',
    }),
    metric({
      id: 'place-utility',
      label: 'Place utility',
      value: venueCheckIns.length,
      detail: `${plural(activeVenueIds.size, 'venue')} active, ${plural(venueLinkedDares, 'venue-linked dare')}`,
      tone: venueCheckIns.length > 0 ? 'positive' : 'neutral',
    }),
    metric({
      id: 'trust-drag',
      label: 'Trust drag',
      value: reviewQueue + pendingPayoutDares.length,
      detail: `${reviewQueue} in review, ${pendingPayoutDares.length} payout queued`,
      tone: pendingPayoutDares.length > 0 ? 'critical' : toneForQueue(reviewQueue, 1, 8),
    }),
  ];

  const funnelSteps = [
    funnel({
      id: 'created',
      label: 'Created',
      count: createdDares.length,
      amount: roundMoney(createdGmv),
      detail: 'Dares entering the system',
      tone: createdDares.length > 0 ? 'active' : 'neutral',
    }),
    funnel({
      id: 'funded',
      label: 'Funded',
      count: fundedDares.length,
      amount: roundMoney(fundedGmv),
      detail: 'Past funding state',
      tone: fundedDares.length > 0 ? 'active' : 'neutral',
    }),
    funnel({
      id: 'proof',
      label: 'Proof',
      count: proofDares.length,
      amount: roundMoney(sumAmount(proofDares)),
      detail: 'Proof media submitted',
      tone: proofDares.length > 0 ? 'active' : 'neutral',
    }),
    funnel({
      id: 'settled',
      label: 'Settled',
      count: settledDares.length,
      amount: roundMoney(settledGmv),
      detail: 'Completed or paid',
      tone: settledDares.length > 0 ? 'positive' : fundedDares.length > 0 ? 'warning' : 'neutral',
    }),
    funnel({
      id: 'revenue',
      label: 'Revenue',
      count: settledDares.length + paidCampaignSlots.length,
      amount: roundMoney(realizedRevenue),
      detail: 'Estimated company revenue only',
      tone: realizedRevenue > 0 ? 'positive' : 'neutral',
    }),
  ];

  const ledger = dedupeLedgerEvents([
    ...founderEventRows
      .map(buildDurableLedgerEvent)
      .filter((ledgerEvent): ledgerEvent is FounderLedgerEvent => Boolean(ledgerEvent)),
    ...recentDares.flatMap((dare) => buildDareLedgerEvents(dare, periodStart)),
    ...recentCheckIns.map((checkIn) =>
      event({
        id: `venue-check-in-${checkIn.id}`,
        type: 'venue_check_in',
        label: eventLabel('venue_check_in'),
        title: checkIn.venue.name,
        occurredAt: checkIn.scannedAt.toISOString(),
        amount: null,
        detail: `${checkIn.proofLevel} via ${checkIn.source}`,
        href: `/venues/${checkIn.venue.slug}`,
        status: 'CONFIRMED',
        actor: checkIn.tag ?? checkIn.walletAddress,
        venue: checkIn.venue,
        tone: eventTone('venue_check_in'),
      })
    ),
    ...recentPlaceTags.map((placeTag) =>
      event({
        id: `place-tag-${placeTag.id}`,
        type: 'place_tag_submitted',
        label: eventLabel('place_tag_submitted'),
        title: placeTag.venue.name,
        occurredAt: placeTag.submittedAt.toISOString(),
        amount: null,
        detail: `${placeTag.proofType} place-memory submission`,
        href: `/venues/${placeTag.venue.slug}`,
        status: placeTag.status,
        actor: placeTag.creatorTag ?? placeTag.walletAddress,
        venue: placeTag.venue,
        tone: placeTag.status === 'APPROVED' ? 'positive' : 'active',
      })
    ),
    ...recentPaidSlots.map((slot) =>
      event({
        id: `campaign-slot-paid-${slot.id}`,
        type: 'campaign_slot_paid',
        label: eventLabel('campaign_slot_paid'),
        title: slot.campaign.title,
        occurredAt: (slot.paidAt ?? slot.updatedAt).toISOString(),
        amount: safeNumber(slot.totalPayout),
        detail: slot.campaign.brand?.name ? `${slot.campaign.brand.name} campaign payout` : 'Campaign slot payout',
        href: '/brands/portal',
        status: slot.status,
        actor: slot.creatorHandle ?? slot.creatorAddress,
        venue: slot.campaign.venue,
        tone: eventTone('campaign_slot_paid'),
      })
    ),
  ])
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, ledgerLimit);

  const headline =
    commandSignal.tone === 'critical'
      ? {
          title: 'Money trust needs founder attention',
          detail: commandSignal.suggestedCommand,
          tone: commandSignal.tone,
        }
      : settledGmv > 0
        ? {
            title: 'Settled outcomes are visible',
            detail: `${formatMoney(settledGmv)} settled GMV and ${formatMoney(realizedRevenue)} estimated company revenue in the last ${periodDays} days.`,
            tone: 'positive' as FounderScoreboardTone,
          }
        : liveGmv > 0
          ? {
              title: 'Funded demand exists; settlement is the constraint',
              detail: `${formatMoney(liveGmv)} is live, but the period has not produced settled GMV yet.`,
              tone: 'warning' as FounderScoreboardTone,
            }
          : {
              title: 'No strong money signal in the current window',
              detail: 'Use the command loop to create a small, qualified funded-demand batch.',
              tone: 'neutral' as FounderScoreboardTone,
            };

  const insights = [
    settledGmv > 0
      ? `${formatMoney(settledGmv)} settled GMV proves the loop can produce completed outcomes; keep measuring revenue separately from GMV.`
      : 'No settled GMV in the current window; the next loop should identify whether demand, proof, or payout is the bottleneck.',
    activeCampaigns.length > 0 || openCampaignSlots > 0
      ? `${plural(activeCampaigns.length, 'active campaign')} and ${plural(openCampaignSlots, 'open slot')} make creator supply a direct revenue lever.`
      : 'No active campaign pressure surfaced; consumer and venue signals should drive the next batch.',
    venueCheckIns.length > 0
      ? `${plural(venueCheckIns.length, 'confirmed check-in')} across ${plural(activeVenueIds.size, 'venue')} can be reused as venue-sales proof.`
      : 'Venue utility is quiet; do not pitch venue economics without fresh check-in or place-memory evidence.',
  ];

  const watchouts = [
    pendingPayoutDares.length > 0
      ? `${plural(pendingPayoutDares.length, 'payout')} queued; this is human-owned money trust, not autonomous-agent territory.`
      : null,
    refundedDares.length > 0
      ? `${formatMoney(refundedGmv)} refunded GMV should not be counted as revenue or success.`
      : null,
    failedDares.length > 0
      ? `${plural(failedDares.length, 'failed dare')} in the period; inspect whether failures are fraud, unclear briefs, or verification friction.`
      : null,
    reviewQueue > 0
      ? `${plural(reviewQueue, 'proof')} currently in admin review; settlement throughput depends on clearing this queue.`
      : null,
  ].filter((item): item is string => Boolean(item));

  return {
    generatedAt: now.toISOString(),
    period: {
      label: `Last ${periodDays} days`,
      start: periodStart.toISOString(),
      end: now.toISOString(),
    },
    headline,
    money: {
      createdGmv: roundMoney(createdGmv),
      fundedGmv: roundMoney(fundedGmv),
      settledGmv: roundMoney(settledGmv),
      liveGmv: roundMoney(liveGmv),
      pendingPayoutGmv: roundMoney(pendingPayoutGmv),
      refundedGmv: roundMoney(refundedGmv),
      failedGmv: roundMoney(failedGmv),
      realizedRevenue: roundMoney(realizedRevenue),
      consumerRevenue: roundMoney(consumerRevenue),
      campaignRevenue: roundMoney(campaignRevenue),
      averageSettledBounty: roundMoney(averageSettledBounty),
      completionRate,
      refundRate,
    },
    trust: {
      proofSubmissions: proofDares.length,
      reviewQueue,
      payoutBacklog: pendingPayoutDares.length,
      failedDares: failedDares.length,
      refundedDares: refundedDares.length,
    },
    growth: {
      createdDares: createdDares.length,
      fundedDares: fundedDares.length,
      settledDares: settledDares.length,
      activeCampaigns: activeCampaigns.length,
      openCampaignSlots,
      activeVenueLeads,
      newVenueLeads,
      activeCreators,
      newCreatorTags,
    },
    place: {
      checkIns: venueCheckIns.length,
      activeVenues: activeVenueIds.size,
      placeTags,
      approvedPlaceTags,
      venueLinkedDares,
      partnerVenueCheckIns,
    },
    scorecard,
    funnel: funnelSteps,
    ledger,
    insights,
    watchouts,
    commandSignal,
  };
}
