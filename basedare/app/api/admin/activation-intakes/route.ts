import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { buildActivationCloseRoomAdminState } from '@/lib/activation-close-room';
import {
  activationFunnelEventTypeForStatus,
  buildActivationFunnelSummary,
  recordActivationFunnelEvent,
} from '@/lib/activation-funnel';
import { normalizeCreatorHandle } from '@/lib/creator-stats';
import { deriveCreatorTrustProfile } from '@/lib/creator-trust';
import { prisma } from '@/lib/prisma';
import { alertActivationIntakeStatusUpdate } from '@/lib/telegram';

const INTAKE_STATUSES = [
  'NEW',
  'QUALIFIED',
  'NEEDS_INFO',
  'READY_TO_INVOICE',
  'PAYMENT_SENT',
  'PAID_CONFIRMED',
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
  paymentLink: z.string().max(500).nullable().optional(),
  paymentReference: z.string().max(180).nullable().optional(),
  closeRoomAction: z.enum(['sent']).optional(),
});

type IntakeStatus = (typeof INTAKE_STATUSES)[number];
type MetadataRecord = Record<string, unknown>;
type CreatorCandidate = {
  tag: string;
  normalizedTag: string;
  status: string;
  totalEarned: number;
  completedDares: number;
  tags: string[];
  trust: {
    level: number;
    label: string;
    score: number;
  };
  stats: {
    approved: number;
    payoutQueued: number;
    live: number;
    acceptRate: number;
  };
  businessMetrics: {
    venueReach: number;
    firstMarks: number;
  };
  reviews: {
    count: number;
    averageRating: number | null;
  };
};

type ReceiptMetric = {
  label: string;
  value: string;
  hint: string;
};

const STATUS_LABELS: Record<IntakeStatus, string> = {
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

function parseJsonRecord(value: string | null | undefined): MetadataRecord {
  if (!value) return {};

  try {
    return asRecord(JSON.parse(value));
  } catch {
    return {};
  }
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

function formatUsd(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '$0';
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
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
  params.set('mode', 'venue-activation');
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

function buildMailtoHref(input: { email: string; subject: string; body: string }) {
  if (!input.email) return null;

  const query = new URLSearchParams({
    subject: input.subject,
    body: input.body,
  });

  return `mailto:${encodeURIComponent(input.email)}?${query.toString()}`;
}

function formatPackageLabel(value: string) {
  const labels: Record<string, string> = {
    'pilot-drop': 'Venue Spark Pilot',
    'local-signal': 'Always-On Spark',
    'city-takeover': 'Global Challenge Drop',
  };
  return labels[value] || value || 'Activation package';
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
    'Reply to confirm the payment path. BaseDare can use a manual invoice, Stripe/checkout link, or USDC settlement depending on the buyer.'
  );
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

function buildCreatorScore(input: {
  creator: CreatorCandidate;
  searchText: string;
  venue: string;
  city: string;
  goal: string;
}) {
  const creator = input.creator;
  const reasons: string[] = [];
  let score =
    creator.trust.score +
    creator.businessMetrics.venueReach * 9 +
    creator.businessMetrics.firstMarks * 7 +
    creator.reviews.count * 4 +
    Math.min(creator.completedDares, 20) * 2 +
    Math.min(creator.totalEarned / 50, 20);

  if (creator.status === 'VERIFIED') {
    score += 14;
    reasons.push('verified creator');
  }

  if (creator.businessMetrics.venueReach > 0) {
    reasons.push(`${creator.businessMetrics.venueReach} venue ${creator.businessMetrics.venueReach === 1 ? 'touch' : 'touches'}`);
  }

  if (creator.businessMetrics.firstMarks > 0) {
    reasons.push(`${creator.businessMetrics.firstMarks} first ${creator.businessMetrics.firstMarks === 1 ? 'spark' : 'sparks'}`);
  }

  if (creator.completedDares > 0) {
    reasons.push(`${creator.completedDares} completed ${creator.completedDares === 1 ? 'dare' : 'dares'}`);
  }

  if (creator.reviews.count > 0) {
    reasons.push(`${creator.reviews.count} buyer ${creator.reviews.count === 1 ? 'review' : 'reviews'}`);
  }

  const contextTokens = `${input.searchText} ${input.venue} ${input.city} ${input.goal}`
    .toLowerCase()
    .split(/[^a-z0-9@]+/)
    .filter((token) => token.length >= 3);
  const matchingTags = creator.tags.filter((tag) => contextTokens.includes(tag.toLowerCase()));

  if (matchingTags.length > 0) {
    score += matchingTags.length * 8;
    reasons.push(`context fit: ${matchingTags.slice(0, 2).join(', ')}`);
  }

  if (input.goal === 'foot_traffic' && creator.businessMetrics.venueReach > 0) {
    score += 8;
    reasons.push('venue traffic signal');
  }

  if (input.goal === 'ugc' && (creator.completedDares > 0 || creator.reviews.count > 0)) {
    score += 7;
    reasons.push('proof output signal');
  }

  return {
    score: Math.round(score),
    reasons: reasons.slice(0, 4),
  };
}

function buildCreatorCreateHref(input: {
  creatorTag: string;
  id: string;
  company: string;
  venue: string;
  city: string;
  amount: number | null;
}) {
  const params = new URLSearchParams();
  const venueName = input.venue || input.company;
  params.set('streamer', input.creatorTag.startsWith('@') ? input.creatorTag : `@${input.creatorTag}`);
  params.set('mode', 'venue-activation');
  params.set('source', 'activation-intake-creator-match');
  params.set('activationLeadId', input.id);
  if (venueName) {
    params.set('venueName', venueName);
    params.set('title', `Activate ${venueName}`);
  }
  if (input.city) params.set('city', input.city);
  if (input.amount) params.set('amount', String(input.amount));
  return `/create?${params.toString()}`;
}

function buildCreatorRecommendations(input: {
  candidates: CreatorCandidate[];
  id: string;
  company: string;
  venue: string;
  city: string;
  goal: string;
  notes: string;
  amount: number | null;
}) {
  const searchText = `${input.company} ${input.venue} ${input.city} ${input.goal} ${input.notes}`;

  return input.candidates
    .map((creator) => {
      const fit = buildCreatorScore({
        creator,
        searchText,
        venue: input.venue,
        city: input.city,
        goal: input.goal,
      });

      return {
        tag: creator.tag,
        score: fit.score,
        trustScore: creator.trust.score,
        trustLabel: creator.trust.label,
        status: creator.status,
        totalEarned: creator.totalEarned,
        completedDares: creator.completedDares,
        venueReach: creator.businessMetrics.venueReach,
        firstMarks: creator.businessMetrics.firstMarks,
        reviews: creator.reviews.count,
        reasons: fit.reasons.length ? fit.reasons : ['fresh creator to test'],
        createHref: buildCreatorCreateHref({
          creatorTag: creator.tag,
          id: input.id,
          company: input.company,
          venue: input.venue,
          city: input.city,
          amount: input.amount,
        }),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);
}

type MissionIdea = ReturnType<typeof getMissionIdeas>[number];
type CreatorRecommendation = ReturnType<typeof buildCreatorRecommendations>[number];

function buildSparkRoutePacket(input: {
  company: string;
  contactName: string;
  venue: string;
  city: string;
  budgetLabel: string;
  timelineLabel: string;
  packageId: string;
  positioningLine: string;
  proofLogic: string;
  repeatMetric: string;
  missionIdeas: MissionIdea[];
  creatorRecommendations: CreatorRecommendation[];
}) {
  const target = input.venue || input.company || 'the target venue';
  const cityLine = input.city ? ` in ${input.city}` : '';
  const missionLines = input.missionIdeas.length
    ? input.missionIdeas
        .slice(0, 3)
        .map((mission, index) => `${index + 1}. ${mission.title}: ${mission.detail}`)
    : ['1. Signature ritual proof: film the moment that makes this place non-interchangeable.'];
  const creatorLines = input.creatorRecommendations.length
    ? input.creatorRecommendations.slice(0, 3).map((creator, index) => {
        const reasons = creator.reasons.length ? ` (${creator.reasons.join(', ')})` : '';
        return `${index + 1}. ${creator.tag} - fit ${creator.score}, trust ${creator.trustScore}${reasons}`;
      })
    : ['1. Creator shortlist will be confirmed after route approval.'];

  return [
    `BaseDare Spark Route - ${target}`,
    '',
    `Hi ${input.contactName || 'there'},`,
    '',
    `Here is the clean activation route for ${target}${cityLine}.`,
    input.positioningLine ? `Positioning: ${input.positioningLine}` : null,
    `Package: ${formatPackageLabel(input.packageId)}`,
    `Budget lane: ${input.budgetLabel}`,
    `Timeline: ${input.timelineLabel}`,
    '',
    'What you are buying:',
    '- Creator missions routed to a real place, not generic influencer posting.',
    '- Venue-aware prompts so the content feels like your story.',
    '- Proof receipt: submitted proof, creator output, place signal, and next-step recommendation.',
    '- Human review before money moves or public commitments are made.',
    '',
    'Suggested first missions:',
    ...missionLines,
    '',
    'Creator shortlist:',
    ...creatorLines,
    '',
    'Proof logic:',
    input.proofLogic || 'Creators must show the place, action, story cue, and one timestamp-worthy proof signal.',
    '',
    'Repeat decision:',
    input.repeatMetric || 'Repeat if the proof receipt shows real output worth compounding.',
    '',
    'Next step:',
    'Approve the route, confirm budget, then BaseDare launches the funded mission inside the app so proof, creator routing, and review stay trackable.',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

function buildInvoiceMemo(input: {
  id: string;
  company: string;
  venue: string;
  city: string;
  budgetLabel: string;
  packageId: string;
  creatorRecommendations: CreatorRecommendation[];
  paymentLink: string;
  paymentReference: string;
}) {
  const target = input.venue || input.company || 'activation target';
  const firstCreator = input.creatorRecommendations[0]?.tag || 'creator shortlist pending';

  return [
    'BaseDare activation payment memo',
    '',
    `Lead ID: ${input.id}`,
    `Buyer: ${input.company || 'TBD'}`,
    `Target: ${target}${input.city ? `, ${input.city}` : ''}`,
    `Package: ${formatPackageLabel(input.packageId)}`,
    `Budget lane: ${input.budgetLabel}`,
    `Initial creator route: ${firstCreator}`,
    input.paymentReference ? `Payment reference: ${input.paymentReference}` : null,
    input.paymentLink ? `Payment link: ${input.paymentLink}` : 'Payment link: add Stripe/invoice/USDC link before sending externally.',
    '',
    'Use of funds:',
    '- Creator reward pool for approved proof.',
    '- BaseDare activation setup, route design, review, and proof receipt.',
    '- No autonomous launch: payment and scope are confirmed by a human operator first.',
    '',
    'Internal next step: move to PAYMENT_SENT after the payment packet is sent, then PAID_CONFIRMED only after funds are verified.',
  ].filter((line): line is string => line !== null).join('\n');
}

function buildPaymentPacket(input: {
  id: string;
  company: string;
  contactName: string;
  venue: string;
  city: string;
  budgetLabel: string;
  timelineLabel: string;
  packageId: string;
  paymentLink: string;
  paymentReference: string;
  missionIdeas: MissionIdea[];
  creatorRecommendations: CreatorRecommendation[];
}) {
  const name = input.contactName || 'there';
  const target = input.venue || input.company || 'your activation';
  const firstCreator = input.creatorRecommendations[0]?.tag || 'creator shortlist pending';
  const firstMission = input.missionIdeas[0];
  const paymentLine = input.paymentLink
    ? input.paymentLink
    : '[Insert Stripe/manual invoice/USDC payment link here before sending]';

  return [
    `Hi ${name},`,
    '',
    `Here is the BaseDare payment packet for ${target}${input.city ? ` in ${input.city}` : ''}.`,
    '',
    `Package: ${formatPackageLabel(input.packageId)}`,
    `Budget lane: ${input.budgetLabel}`,
    `Timeline: ${input.timelineLabel}`,
    `Lead ID: ${input.id}`,
    input.paymentReference ? `Payment reference: ${input.paymentReference}` : null,
    '',
    'Activation route:',
    `- Venue: ${target}`,
    `- First creator route: ${firstCreator}`,
    `- First proof mission: ${firstMission ? `${firstMission.title} - ${firstMission.detail}` : 'final mission brief confirmed after payment'}`,
    '',
    'What happens after payment:',
    '1. BaseDare opens the funded venue activation inside the app.',
    '2. Creator proof, place signal, review state, and payout state stay trackable.',
    '3. You receive a proof receipt showing what happened and the recommended next move.',
    '',
    'Payment link:',
    paymentLine,
    '',
    'Payment instructions:',
    defaultPaymentInstructions(),
    '',
    'Important: BaseDare does not launch public commitments until payment and scope are confirmed.',
  ].filter((line): line is string => line !== null).join('\n');
}

async function fetchCreatorCandidates(): Promise<CreatorCandidate[]> {
  const streamers = await prisma.streamerTag.findMany({
    where: {
      status: { in: ['ACTIVE', 'VERIFIED'] },
    },
    orderBy: {
      totalEarned: 'desc',
    },
    take: 60,
    select: {
      tag: true,
      status: true,
      totalEarned: true,
      completedDares: true,
      tags: true,
    },
  });

  const creatorDares = await prisma.dare.findMany({
    where: {
      OR: [{ streamerHandle: { not: null } }, { claimRequestTag: { not: null } }],
    },
    select: {
      streamerHandle: true,
      claimRequestTag: true,
      bounty: true,
      status: true,
    },
  });

  const dareMetrics = new Map<string, {
    totalEarned: number;
    completedDares: number;
    approvedMissions: number;
    payoutQueued: number;
    live: number;
    total: number;
  }>();

  for (const entry of creatorDares) {
    const normalizedHandle = normalizeCreatorHandle(entry.streamerHandle ?? entry.claimRequestTag);
    if (!normalizedHandle) continue;

    const current = dareMetrics.get(normalizedHandle) || {
      totalEarned: 0,
      completedDares: 0,
      approvedMissions: 0,
      payoutQueued: 0,
      live: 0,
      total: 0,
    };
    current.total += 1;
    if (entry.status === 'VERIFIED') {
      current.totalEarned += entry.bounty || 0;
      current.completedDares += 1;
      current.approvedMissions += 1;
    } else if (entry.status === 'PENDING_PAYOUT') {
      current.approvedMissions += 1;
      current.payoutQueued += 1;
    } else if (['PENDING', 'AWAITING_CLAIM', 'PENDING_REVIEW', 'PENDING_ACCEPTANCE'].includes(entry.status)) {
      current.live += 1;
    }
    dareMetrics.set(normalizedHandle, current);
  }

  const contributionMetrics = new Map<string, { uniqueVenues: number; firstMarks: number }>();
  try {
    const approvedMarks = await prisma.placeTag.findMany({
      where: {
        status: 'APPROVED',
        creatorTag: { not: null },
      },
      select: {
        creatorTag: true,
        venueId: true,
        firstMark: true,
      },
    });

    const venueSets = new Map<string, Set<string>>();
    for (const entry of approvedMarks) {
      const normalizedHandle = normalizeCreatorHandle(entry.creatorTag);
      if (!normalizedHandle) continue;

      const venues = venueSets.get(normalizedHandle) || new Set<string>();
      venues.add(entry.venueId);
      venueSets.set(normalizedHandle, venues);

      const current = contributionMetrics.get(normalizedHandle) || { uniqueVenues: 0, firstMarks: 0 };
      if (entry.firstMark) current.firstMarks += 1;
      contributionMetrics.set(normalizedHandle, current);
    }

    for (const [handle, venues] of venueSets.entries()) {
      const current = contributionMetrics.get(handle) || { uniqueVenues: 0, firstMarks: 0 };
      current.uniqueVenues = venues.size;
      contributionMetrics.set(handle, current);
    }
  } catch {
    // Place memory is additive; creator matching should still work if the table is unavailable.
  }

  const reviewMetrics = new Map<string, { count: number; ratingTotal: number }>();
  try {
    const reviews = await prisma.creatorReview.findMany({
      select: {
        creatorTag: true,
        rating: true,
      },
    });

    for (const entry of reviews) {
      const normalizedHandle = normalizeCreatorHandle(entry.creatorTag);
      if (!normalizedHandle) continue;

      const current = reviewMetrics.get(normalizedHandle) || { count: 0, ratingTotal: 0 };
      current.count += 1;
      current.ratingTotal += entry.rating;
      reviewMetrics.set(normalizedHandle, current);
    }
  } catch {
    // Reviews are optional for early operators.
  }

  return streamers
    .map((streamer) => {
      const normalizedTag = normalizeCreatorHandle(streamer.tag) || '';
      const metrics = dareMetrics.get(normalizedTag);
      const contribution = contributionMetrics.get(normalizedTag);
      const review = reviewMetrics.get(normalizedTag);
      const totalEarned = Math.max(streamer.totalEarned, metrics?.totalEarned ?? 0);
      const completedDares = Math.max(streamer.completedDares, metrics?.completedDares ?? 0);
      const approvedMissions = Math.max(completedDares + (metrics?.payoutQueued ?? 0), metrics?.approvedMissions ?? 0);
      const trust = deriveCreatorTrustProfile({
        approvedMissions,
        settledMissions: completedDares,
        totalEarned,
        uniqueVenues: contribution?.uniqueVenues ?? 0,
        firstMarks: contribution?.firstMarks ?? 0,
      });

      return {
        tag: streamer.tag,
        normalizedTag,
        status: streamer.status,
        totalEarned,
        completedDares,
        tags: streamer.tags ?? [],
        trust,
        stats: {
          approved: approvedMissions,
          payoutQueued: metrics?.payoutQueued ?? 0,
          live: metrics?.live ?? 0,
          acceptRate: (metrics?.total ?? 0) > 0 ? Math.round((approvedMissions / (metrics?.total ?? 1)) * 100) : 0,
        },
        businessMetrics: {
          venueReach: contribution?.uniqueVenues ?? 0,
          firstMarks: contribution?.firstMarks ?? 0,
        },
        reviews: {
          count: review?.count ?? 0,
          averageRating:
            review && review.count > 0 ? Math.round((review.ratingTotal / review.count) * 10) / 10 : null,
        },
      };
    })
    .filter((creator) => creator.normalizedTag)
    .sort((left, right) => right.trust.score - left.trust.score);
}

async function fetchActivationReceiptCampaigns() {
  return prisma.campaign.findMany({
    where: {
      type: 'PLACE',
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 220,
    select: {
      id: true,
      shortId: true,
      title: true,
      status: true,
      budgetUsdc: true,
      payoutPerCreator: true,
      creatorCountTarget: true,
      targetingCriteria: true,
      fundedAt: true,
      liveAt: true,
      settledAt: true,
      createdAt: true,
      brand: {
        select: {
          name: true,
        },
      },
      venue: {
        select: {
          id: true,
          slug: true,
          name: true,
          city: true,
          country: true,
        },
      },
      linkedDare: {
        select: {
          id: true,
          shortId: true,
          title: true,
          status: true,
          bounty: true,
          streamerHandle: true,
          claimedBy: true,
          claimRequestTag: true,
          videoUrl: true,
          imageUrl: true,
          proof_media: true,
          proofCid: true,
          verifiedAt: true,
          completed_at: true,
          updatedAt: true,
        },
      },
      slots: {
        orderBy: {
          updatedAt: 'desc',
        },
        select: {
          status: true,
          creatorHandle: true,
          proofUrl: true,
          submittedAt: true,
          paidAt: true,
          totalPayout: true,
          updatedAt: true,
        },
      },
    },
  });
}

type ActivationReceiptCampaign = Awaited<ReturnType<typeof fetchActivationReceiptCampaigns>>[number];

function findActivationReceiptCampaign(eventId: string, campaigns: ActivationReceiptCampaign[]) {
  return campaigns.find((campaign) => {
    const targeting = parseJsonRecord(campaign.targetingCriteria);
    return (
      stringValue(targeting.activationLeadId) === eventId ||
      stringValue(targeting.reportSessionKey) === eventId
    );
  }) ?? null;
}

function buildActivationReceipt(input: {
  eventId: string;
  company: string;
  contactName: string;
  email: string;
  assignedVenue: string;
  city: string;
  budgetLabel: string;
  paymentReference: string;
  campaign: ActivationReceiptCampaign | null;
}) {
  const campaign = input.campaign;
  const buyer = input.company || input.contactName || input.email || 'Buyer';
  const target = campaign?.venue?.name || input.assignedVenue || input.company || 'activation target';
  const cityLine = campaign?.venue?.city || input.city;

  if (!campaign) {
    const receiptText = [
      `BaseDare activation receipt - ${target}`,
      '',
      `Buyer: ${buyer}`,
      `Lead ID: ${input.eventId}`,
      input.paymentReference ? `Payment reference: ${input.paymentReference}` : null,
      '',
      'Launch state: no linked campaign found yet.',
      'Next decision: open Brand Portal launch after payment is confirmed, then the receipt will attach to campaign, proof, and payout state automatically.',
    ].filter((line): line is string => line !== null).join('\n');

    return {
      status: 'AWAITING_LAUNCH',
      label: 'Awaiting launch',
      tone: 'warning',
      campaignId: null,
      campaignTitle: null,
      campaignHref: null,
      venueHref: null,
      dareHref: null,
      proofUrl: null,
      creatorHandle: null,
      nextDecision: 'Launch the paid activation before sending the buyer receipt.',
      metrics: [
        { label: 'Campaign', value: 'Not linked', hint: 'Open Brand launch after paid confirmed.' },
        { label: 'Proof', value: 'Waiting', hint: 'Proof state appears after a funded mission exists.' },
        { label: 'Budget', value: input.budgetLabel, hint: 'Use the paid lane agreed with the buyer.' },
      ] satisfies ReceiptMetric[],
      receiptText,
    };
  }

  const linkedDare = campaign.linkedDare;
  const bestSlot = campaign.slots[0] ?? null;
  const submittedSlot = campaign.slots.find((slot) => Boolean(slot.proofUrl || slot.submittedAt)) ?? null;
  const paidSlot = campaign.slots.find((slot) => Boolean(slot.paidAt || slot.status === 'PAID')) ?? null;
  const proofUrl =
    submittedSlot?.proofUrl ||
    linkedDare?.videoUrl ||
    linkedDare?.imageUrl ||
    linkedDare?.proof_media ||
    null;
  const proofSubmitted = Boolean(proofUrl || linkedDare?.completed_at || submittedSlot);
  const proofVerified = Boolean(linkedDare?.verifiedAt || linkedDare?.status === 'VERIFIED');
  const settled = Boolean(campaign.settledAt || paidSlot || campaign.status === 'SETTLED');
  const creatorHandle =
    bestSlot?.creatorHandle ||
    linkedDare?.streamerHandle ||
    linkedDare?.claimRequestTag ||
    linkedDare?.claimedBy ||
    null;

  let status = 'LIVE';
  let label = 'Live, proof pending';
  let tone = 'info';
  let nextDecision = 'Keep the creator moving until proof is submitted.';

  if (settled) {
    status = 'SETTLED';
    label = 'Receipt settled';
    tone = 'success';
    nextDecision = 'Send the proof receipt, ask for repeat budget, or increase the route.';
  } else if (proofVerified) {
    status = 'VERIFIED';
    label = 'Proof verified';
    tone = 'success';
    nextDecision = 'Send the buyer receipt and confirm payout settlement.';
  } else if (proofSubmitted) {
    status = 'PROOF_SUBMITTED';
    label = 'Proof submitted';
    tone = 'warning';
    nextDecision = 'Review the proof, then approve, reject, or request a cleaner reshoot.';
  }

  const dareHref = linkedDare?.shortId ? `/dare/${linkedDare.shortId}` : null;
  const campaignHref = `/brands/portal?campaign=${encodeURIComponent(campaign.id)}`;
  const venueHref = campaign.venue?.slug ? `/venues/${campaign.venue.slug}` : null;
  const payoutValue = paidSlot?.totalPayout ?? campaign.payoutPerCreator;
  const receiptText = [
    `BaseDare activation receipt - ${target}`,
    '',
    `Buyer: ${buyer}`,
    `Lead ID: ${input.eventId}`,
    input.paymentReference ? `Payment reference: ${input.paymentReference}` : null,
    `Campaign: ${campaign.title} (${campaign.status})`,
    `Venue: ${target}${cityLine ? `, ${cityLine}` : ''}`,
    `Creator route: ${creatorHandle || 'creator pending'}`,
    `Proof state: ${label}`,
    proofUrl ? `Proof link: ${proofUrl}` : null,
    dareHref ? `Dare link: ${dareHref}` : null,
    `Spend tracked: ${formatUsd(campaign.budgetUsdc)}`,
    `Creator payout lane: ${formatUsd(payoutValue)}`,
    '',
    `Next decision: ${nextDecision}`,
  ].filter((line): line is string => line !== null).join('\n');

  return {
    status,
    label,
    tone,
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    campaignHref,
    venueHref,
    dareHref,
    proofUrl,
    creatorHandle,
    nextDecision,
    metrics: [
      { label: 'Campaign', value: campaign.status, hint: campaign.title },
      { label: 'Proof', value: label, hint: proofUrl ? 'Proof link is ready.' : 'No proof URL yet.' },
      { label: 'Creator', value: creatorHandle || 'Pending', hint: bestSlot?.status || linkedDare?.status || 'No slot state.' },
      { label: 'Spend', value: formatUsd(campaign.budgetUsdc), hint: `${campaign.creatorCountTarget} creator target.` },
      { label: 'Payout', value: formatUsd(payoutValue), hint: paidSlot?.paidAt ? 'Payout marked paid.' : 'Payout lane.' },
    ] satisfies ReceiptMetric[],
    receiptText,
  };
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
}, candidates: CreatorCandidate[] = [], campaigns: ActivationReceiptCampaign[] = []) {
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
  const routedCreator = stringValue(metadata.routedCreator);
  const routedVenueId = stringValue(metadata.routedVenueId);
  const routedVenueSlug = stringValue(metadata.routedVenueSlug);
  const routedSource = stringValue(metadata.routedSource);
  const assignedCreator = stringValue(operator.assignedCreator);
  const assignedVenue = stringValue(operator.assignedVenue) || venue;
  const operatorNote = stringValue(operator.operatorNote);
  const nextActionAt = stringValue(operator.nextActionAt);
  const paymentLink = stringValue(operator.paymentLink) || defaultPaymentLink();
  const paymentReference = stringValue(operator.paymentReference) || `BD-${event.id.slice(0, 8).toUpperCase()}`;
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
  const missionIdeas = getMissionIdeas(metadata);
  const activationBrief = asRecord(metadata.activationBrief);
  const positioningLine = stringValue(activationBrief.positioningLine);
  const proofLogic = stringValue(activationBrief.proofLogic);
  const repeatMetric = stringValue(activationBrief.repeatMetric);
  const routeContext = {
    source: routedSource,
    creator: routedCreator,
    venueId: routedVenueId,
    venueSlug: routedVenueSlug,
    venueHref: routedVenueSlug ? `/venues/${routedVenueSlug}` : null,
    mapHref: routedVenueSlug ? `/map?place=${encodeURIComponent(routedVenueSlug)}` : null,
  };
  const creatorRecommendations = buildCreatorRecommendations({
    candidates,
    id: event.id,
    company,
    venue: assignedVenue,
    city,
    goal,
    notes,
    amount,
  });
  const replyDraft = buildReplyDraft({
    contactName,
    company,
    venue: assignedVenue,
    city,
    budgetLabel,
    timelineLabel,
  });
  const sparkRoutePacket = buildSparkRoutePacket({
    company,
    contactName,
    venue: assignedVenue,
    city,
    budgetLabel,
    timelineLabel,
    packageId,
    positioningLine,
    proofLogic,
    repeatMetric,
    missionIdeas,
    creatorRecommendations,
  });
  const invoiceMemo = buildInvoiceMemo({
    id: event.id,
    company,
    venue: assignedVenue,
    city,
    budgetLabel,
    packageId,
    creatorRecommendations,
    paymentLink,
    paymentReference,
  });
  const paymentPacket = buildPaymentPacket({
    id: event.id,
    company,
    contactName,
    venue: assignedVenue,
    city,
    budgetLabel,
    timelineLabel,
    packageId,
    paymentLink,
    paymentReference,
    missionIdeas,
    creatorRecommendations,
  });
  const activationReceipt = buildActivationReceipt({
    eventId: event.id,
    company,
    contactName,
    email,
    assignedVenue,
    city,
    budgetLabel,
    paymentReference,
    campaign: findActivationReceiptCampaign(event.id, campaigns),
  });
  const closeRoom = buildActivationCloseRoomAdminState({
    id: event.id,
    metadata,
    company,
    contactName,
    email,
    assignedVenue,
    paymentReference,
  });
  const subjectTarget = company || assignedVenue || 'activation';

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
    routeContext,
    amount,
    ageHours,
    occurredAt: event.occurredAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    assignedCreator,
    assignedVenue,
    operatorNote,
    nextActionAt,
    paymentLink,
    paymentReference,
    missionIdeas,
    positioningLine,
    proofLogic,
    repeatMetric,
    creatorRecommendations,
    replyDraft,
    sparkRoutePacket,
    invoiceMemo,
    paymentPacket,
    activationReceipt,
    closeRoom,
    links: {
      createHref,
      scoutHref,
      replyMailtoHref: buildMailtoHref({
        email,
        subject: `BaseDare activation: ${subjectTarget} next steps`,
        body: replyDraft,
      }),
      packetMailtoHref: buildMailtoHref({
        email,
        subject: `BaseDare Spark Route: ${subjectTarget}`,
        body: sparkRoutePacket,
      }),
      invoiceMailtoHref: buildMailtoHref({
        email,
        subject: `BaseDare activation payment memo: ${subjectTarget}`,
        body: invoiceMemo,
      }),
      paymentMailtoHref: buildMailtoHref({
        email,
        subject: `BaseDare activation payment packet: ${subjectTarget}`,
        body: paymentPacket,
      }),
      receiptMailtoHref: buildMailtoHref({
        email,
        subject: `BaseDare activation proof receipt: ${subjectTarget}`,
        body: activationReceipt.receiptText,
      }),
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

    const [creatorCandidates, activationCampaigns] = await Promise.all([
      fetchCreatorCandidates(),
      fetchActivationReceiptCampaigns(),
    ]);
    const intakes = events.map((event) => mapIntakeEvent(event, creatorCandidates, activationCampaigns));
    const funnel = await buildActivationFunnelSummary();
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
          paymentSent: summary.PAYMENT_SENT,
          paidConfirmed: summary.PAID_CONFIRMED,
          needsInfo: summary.NEEDS_INFO,
          launched: summary.LAUNCHED,
          byStatus: summary,
          funnel,
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

    const currentStatus = normalizeStatus(event.status);
    if (input.status === 'LAUNCHED' && currentStatus !== 'PAID_CONFIRMED' && currentStatus !== 'LAUNCHED') {
      return NextResponse.json(
        { success: false, error: 'Confirm payment before marking an activation launched.' },
        { status: 400 }
      );
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
    if (input.paymentLink !== undefined) nextOperator.paymentLink = cleanOptional(input.paymentLink);
    if (input.paymentReference !== undefined) nextOperator.paymentReference = cleanOptional(input.paymentReference);
    if (input.closeRoomAction === 'sent') {
      const now = new Date().toISOString();
      nextOperator.closeRoomSentAt = now;
      nextOperator.closeRoomLastSentAt = now;
      nextOperator.closeRoomSendCount =
        typeof existingOperator.closeRoomSendCount === 'number'
          ? existingOperator.closeRoomSendCount + 1
          : 1;
    }

    const statusHistory = Array.isArray(metadata.statusHistory) ? metadata.statusHistory : [];
    const closeRoomStatus =
      ['PAID_CONFIRMED', 'LAUNCHED', 'REJECTED'].includes(currentStatus)
        ? currentStatus
        : 'PAYMENT_SENT';
    const nextStatus = input.status ?? (input.closeRoomAction === 'sent' ? closeRoomStatus : currentStatus);
    const nextMetadata = JSON.parse(
      JSON.stringify({
        ...metadata,
        operator: nextOperator,
        statusHistory:
          nextStatus !== currentStatus
            ? [
                ...statusHistory.slice(-12),
                {
                  from: currentStatus,
                  to: nextStatus,
                  at: new Date().toISOString(),
                  by: auth.walletAddress,
                  closeRoomAction: input.closeRoomAction ?? null,
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

    const [creatorCandidates, activationCampaigns] = await Promise.all([
      fetchCreatorCandidates(),
      fetchActivationReceiptCampaigns(),
    ]);
    const mappedIntake = mapIntakeEvent(updated, creatorCandidates, activationCampaigns);

    if (nextStatus !== currentStatus) {
      const funnelEventType = activationFunnelEventTypeForStatus(nextStatus);
      if (funnelEventType) {
        await recordActivationFunnelEvent({
          eventType: funnelEventType,
          source: 'activation-intake-admin',
          subjectType: 'activation_lead',
          subjectId: mappedIntake.id,
          dedupeKey: `activation-status:${mappedIntake.id}:${input.status}`,
          title: `${mappedIntake.company || 'Activation lead'} moved to ${mappedIntake.statusLabel}`,
          amount: mappedIntake.amount,
          status: mappedIntake.status,
          actor: auth.walletAddress,
          href: `/admin/activation-intakes?leadId=${encodeURIComponent(mappedIntake.id)}`,
          venueSlug: mappedIntake.routeContext.venueSlug || null,
          metadata: {
            previousStatus: currentStatus,
            assignedVenue: mappedIntake.assignedVenue || null,
            assignedCreator: mappedIntake.assignedCreator || null,
            closeRoomAction: input.closeRoomAction ?? null,
            closeRoomHref: mappedIntake.closeRoom.href,
          },
        });
      }

      void alertActivationIntakeStatusUpdate({
        leadId: mappedIntake.id,
        company: mappedIntake.company,
        status: mappedIntake.statusLabel,
        assignedVenue: mappedIntake.assignedVenue,
        assignedCreator: mappedIntake.assignedCreator,
        operatorNote: mappedIntake.operatorNote,
        updatedBy: auth.walletAddress,
      }).catch((error) => {
        console.error('[ADMIN_ACTIVATION_INTAKES] Status Telegram alert failed:', error);
      });
    }

    return NextResponse.json({
      success: true,
      data: mappedIntake,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_ACTIVATION_INTAKES] Update failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to update activation intake' }, { status: 500 });
  }
}
