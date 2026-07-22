import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { derivePlaceHealth, type PlaceHealthSnapshot } from '@/lib/place-health';

const COMPLETED_DARE_STATUSES = ['VERIFIED', 'PAID', 'COMPLETED', 'PENDING_PAYOUT'];
const VAULT_CHECK_IN_PROOF_LEVELS = ['QR_AND_GPS', 'QR_ONLY'];
const ACTIVE_VENUE_REVIEW_STATUS = 'ACTIVE';

export type SpotVaultTimelineKind = 'FIRST_PROOF' | 'PROOF' | 'DARE' | 'MEMORY';
export type SpotVaultTone = 'gold' | 'cyan' | 'emerald' | 'violet';
export type SpotVaultReviewVerdict = 'worth_it' | 'skip';

export type SpotVaultTimelineItem = {
  id: string;
  kind: SpotVaultTimelineKind;
  title: string;
  body: string;
  actorLabel: string | null;
  sourceLabel: string;
  occurredAt: string;
  mediaUrl: string | null;
  href: string | null;
  badges: string[];
  tone: SpotVaultTone;
};

export type SpotVaultReviewSummary = {
  id: string;
  walletLabel: string;
  tag: string | null;
  verdict: SpotVaultReviewVerdict;
  note: string | null;
  confirmations: number;
  createdAt: string;
  updatedAt: string;
  mine: boolean;
};

export type SpotVaultSnapshot = {
  venue: {
    id: string;
    slug: string;
    name: string;
  };
  viewer: {
    canLeaveSignal: boolean;
    proofLevel: string | null;
    lastCheckInAt: string | null;
    reason: string;
  };
  stats: {
    checkIns: number;
    qrGpsCheckIns: number;
    uniqueVisitors: number;
    proofs: number;
    firstProofs: number;
    completedDares: number;
  };
  reviews: {
    count: number;
    worthItCount: number;
    skipCount: number;
    worthItRatio: number;
    recent: SpotVaultReviewSummary[];
    mine: SpotVaultReviewSummary | null;
  };
  placeHealth: PlaceHealthSnapshot;
  timeline: SpotVaultTimelineItem[];
};

function normalizeWallet(walletAddress?: string | null) {
  return walletAddress?.trim().toLowerCase() || null;
}

export function normalizeSpotVaultWallet(walletAddress?: string | null) {
  return normalizeWallet(walletAddress);
}

function compactWallet(walletAddress: string) {
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

export function isVenueReviewTableMissingError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }

  const message = error instanceof Error ? error.message : String(error);
  return /VenueReview|venue_reviews|venue review/i.test(message) && /does not exist|not found|missing/i.test(message);
}

function creatorLabel(input: { creatorTag?: string | null; walletAddress?: string | null }) {
  if (input.creatorTag?.trim()) {
    return `@${input.creatorTag.trim()}`;
  }

  return input.walletAddress ? compactWallet(input.walletAddress) : null;
}

function proofBody(caption: string | null, firstMark: boolean) {
  if (caption?.trim()) {
    return caption.trim();
  }

  return firstMark
    ? 'First approved mark turned this pin into a readable spot.'
    : 'Verified place proof was added to the vault.';
}

function buildMemoryBody(memory: {
  checkInCount: number;
  uniqueVisitorCount: number;
  completedDareCount: number;
  proofCount: number;
}) {
  const parts = [
    `${memory.uniqueVisitorCount} verified visitor${memory.uniqueVisitorCount === 1 ? '' : 's'}`,
    `${memory.checkInCount} check-in${memory.checkInCount === 1 ? '' : 's'}`,
  ];

  if (memory.proofCount > 0) {
    parts.push(`${memory.proofCount} proof${memory.proofCount === 1 ? '' : 's'}`);
  }

  if (memory.completedDareCount > 0) {
    parts.push(`${memory.completedDareCount} completed dare${memory.completedDareCount === 1 ? '' : 's'}`);
  }

  return parts.join(' · ');
}

export async function getVenueReviewEligibility(input: {
  venueId: string;
  walletAddress?: string | null;
}) {
  const walletAddress = normalizeWallet(input.walletAddress);
  if (!walletAddress) {
    return null;
  }

  return prisma.venueCheckIn.findFirst({
    where: {
      venueId: input.venueId,
      walletAddress,
      status: 'CONFIRMED',
      proofLevel: { in: VAULT_CHECK_IN_PROOF_LEVELS },
      source: 'VENUE_QR',
    },
    orderBy: { scannedAt: 'desc' },
    select: {
      id: true,
      proofLevel: true,
      scannedAt: true,
      tag: true,
    },
  });
}

function toReviewVerdict(verdict: string): SpotVaultReviewVerdict {
  return verdict === 'skip' ? 'skip' : 'worth_it';
}

function buildReviewSummary(
  review: {
    id: string;
    walletAddress: string;
    tag: string | null;
    verdict: string;
    note: string | null;
    confirmations: number;
    createdAt: Date;
    updatedAt: Date;
  },
  viewerWallet: string | null
): SpotVaultReviewSummary {
  return {
    id: review.id,
    walletLabel: review.tag?.trim() ? `@${review.tag.trim().replace(/^@/, '')}` : compactWallet(review.walletAddress),
    tag: review.tag?.trim() ? review.tag.trim().replace(/^@/, '') : null,
    verdict: toReviewVerdict(review.verdict),
    note: review.note,
    confirmations: review.confirmations,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    mine: Boolean(viewerWallet && review.walletAddress.toLowerCase() === viewerWallet),
  };
}

async function getVenueReviewSnapshot(input: {
  venueId: string;
  viewerWallet: string | null;
  limit: number;
}): Promise<SpotVaultSnapshot['reviews']> {
  try {
    const reviewSelect = {
      id: true,
      walletAddress: true,
      tag: true,
      verdict: true,
      note: true,
      confirmations: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.VenueReviewSelect;

    const [recentReviews, verdictCounts, mineReview] = await Promise.all([
      prisma.venueReview.findMany({
        where: {
          venueId: input.venueId,
          status: ACTIVE_VENUE_REVIEW_STATUS,
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(input.limit, 8),
        select: reviewSelect,
      }),
      prisma.venueReview.groupBy({
        by: ['verdict'],
        where: {
          venueId: input.venueId,
          status: ACTIVE_VENUE_REVIEW_STATUS,
        },
        _count: { _all: true },
      }),
      input.viewerWallet
        ? prisma.venueReview.findUnique({
            where: {
              venueId_walletAddress: {
                venueId: input.venueId,
                walletAddress: input.viewerWallet,
              },
            },
            select: reviewSelect,
          })
        : Promise.resolve(null),
    ]);

    const worthItCount = verdictCounts.find((item) => item.verdict === 'worth_it')?._count._all ?? 0;
    const skipCount = verdictCounts.find((item) => item.verdict === 'skip')?._count._all ?? 0;
    const count = worthItCount + skipCount;
    const activeMineReview = mineReview?.status === ACTIVE_VENUE_REVIEW_STATUS ? mineReview : null;

    return {
      count,
      worthItCount,
      skipCount,
      worthItRatio: count > 0 ? worthItCount / count : 0,
      recent: recentReviews.map((review) => buildReviewSummary(review, input.viewerWallet)),
      mine: activeMineReview ? buildReviewSummary(activeMineReview, input.viewerWallet) : null,
    };
  } catch (error) {
    if (isVenueReviewTableMissingError(error)) {
      return {
        count: 0,
        worthItCount: 0,
        skipCount: 0,
        worthItRatio: 0,
        recent: [],
        mine: null,
      };
    }

    throw error;
  }
}

export async function getSpotVaultSnapshot(input: {
  slug: string;
  walletAddress?: string | null;
  limit?: number;
}): Promise<SpotVaultSnapshot | null> {
  const limit = Math.min(Math.max(input.limit ?? 14, 4), 24);
  const walletAddress = normalizeWallet(input.walletAddress);

  const venue = await prisma.venue.findUnique({
    where: { slug: input.slug },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
    },
  });

  if (!venue || venue.status !== 'ACTIVE') {
    return null;
  }

  const [
    viewerCheckIn,
    checkIns,
    qrGpsCheckIns,
    uniqueVisitors,
    proofs,
    firstProofs,
    completedDaresCount,
    recentProofs,
    completedDares,
    memories,
    reviews,
    placeObservations,
  ] = await Promise.all([
    getVenueReviewEligibility({ venueId: venue.id, walletAddress }),
    prisma.venueCheckIn.count({
      where: {
        venueId: venue.id,
        status: 'CONFIRMED',
      },
    }),
    prisma.venueCheckIn.count({
      where: {
        venueId: venue.id,
        status: 'CONFIRMED',
        proofLevel: 'QR_AND_GPS',
      },
    }),
    prisma.venueCheckIn.findMany({
      where: {
        venueId: venue.id,
        status: 'CONFIRMED',
      },
      distinct: ['walletAddress'],
      select: { walletAddress: true },
    }),
    prisma.placeTag.count({
      where: {
        venueId: venue.id,
        status: 'APPROVED',
      },
    }),
    prisma.placeTag.count({
      where: {
        venueId: venue.id,
        status: 'APPROVED',
        firstMark: true,
      },
    }),
    prisma.dare.count({
      where: {
        venueId: venue.id,
        status: { in: COMPLETED_DARE_STATUSES },
      },
    }),
    prisma.placeTag.findMany({
      where: {
        venueId: venue.id,
        status: 'APPROVED',
      },
      orderBy: { submittedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        creatorTag: true,
        walletAddress: true,
        caption: true,
        vibeTags: true,
        proofMediaUrl: true,
        proofType: true,
        source: true,
        firstMark: true,
        submittedAt: true,
      },
    }),
    prisma.dare.findMany({
      where: {
        venueId: venue.id,
        status: { in: COMPLETED_DARE_STATUSES },
      },
      orderBy: [{ verifiedAt: 'desc' }, { completed_at: 'desc' }, { updatedAt: 'desc' }],
      take: 6,
      select: {
        id: true,
        shortId: true,
        title: true,
        missionMode: true,
        bounty: true,
        status: true,
        streamerHandle: true,
        tag: true,
        videoUrl: true,
        imageUrl: true,
        proof_media: true,
        verifiedAt: true,
        completed_at: true,
        updatedAt: true,
        linkedCampaign: {
          select: {
            brand: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.venueMemory.findMany({
      where: { venueId: venue.id },
      orderBy: { bucketStartAt: 'desc' },
      take: 4,
      select: {
        id: true,
        bucketType: true,
        bucketStartAt: true,
        checkInCount: true,
        uniqueVisitorCount: true,
        completedDareCount: true,
        proofCount: true,
        topCreatorTag: true,
      },
    }),
    getVenueReviewSnapshot({
      venueId: venue.id,
      viewerWallet: walletAddress,
      limit: 5,
    }),
    prisma.placeMemoryObservation.findMany({
      where: { venueId: venue.id },
      orderBy: { acceptedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        buyerQuestion: true,
        reportedOutcome: true,
        observedAt: true,
        acceptedAt: true,
        refreshAt: true,
        outcomeContractSnapshot: true,
      },
    }),
  ]);

  const proofItems: SpotVaultTimelineItem[] = recentProofs.map((proof) => ({
    id: `proof:${proof.id}`,
    kind: proof.firstMark ? 'FIRST_PROOF' : 'PROOF',
    title: proof.firstMark ? 'First proof landed' : 'Proof added',
    body: proofBody(proof.caption, proof.firstMark),
    actorLabel: creatorLabel(proof),
    sourceLabel: proof.source === 'DARE_COMPLETION' ? 'dare proof' : 'place mark',
    occurredAt: proof.submittedAt.toISOString(),
    mediaUrl: proof.proofMediaUrl,
    href: `/venues/${venue.slug}`,
    badges: [
      proof.firstMark ? 'first proof' : null,
      proof.proofType.toLowerCase(),
      ...proof.vibeTags.slice(0, 2).map((tag) => `#${tag}`),
    ].filter((badge): badge is string => Boolean(badge)),
    tone: proof.firstMark ? 'gold' : 'cyan',
  }));

  const dareItems: SpotVaultTimelineItem[] = completedDares.map((dare) => {
    const occurredAt = dare.verifiedAt ?? dare.completed_at ?? dare.updatedAt;
    const mediaUrl = dare.videoUrl ?? dare.imageUrl ?? dare.proof_media ?? null;
    const label = dare.streamerHandle ?? dare.tag ?? null;

    return {
      id: `dare:${dare.id}`,
      kind: 'DARE',
      title: dare.title,
      body:
        dare.status === 'PENDING_PAYOUT'
          ? 'Proof cleared; payout is queued into the venue record.'
          : 'A funded BaseDare mission was verified at this spot.',
      actorLabel: label ? `@${label.replace(/^@/, '')}` : 'BaseDare creator',
      sourceLabel: dare.linkedCampaign?.brand.name ? 'paid activation' : 'verified dare',
      occurredAt: occurredAt.toISOString(),
      mediaUrl,
      href: dare.shortId ? `/dare/${dare.shortId}` : `/venues/${venue.slug}`,
      badges: [
        dare.missionMode ?? 'IRL',
        dare.bounty > 0 ? `$${dare.bounty.toFixed(0)}` : null,
        dare.linkedCampaign?.brand.name ?? null,
      ].filter((badge): badge is string => Boolean(badge)),
      tone: dare.linkedCampaign?.brand.name ? 'violet' : 'emerald',
    };
  });

  const memoryItems: SpotVaultTimelineItem[] = memories
    .filter((memory) => memory.checkInCount > 0 || memory.proofCount > 0 || memory.completedDareCount > 0)
    .map((memory) => ({
      id: `memory:${memory.id}`,
      kind: 'MEMORY',
      title: memory.bucketType === 'DAY' ? 'Daily venue memory' : `${memory.bucketType.toLowerCase()} memory`,
      body: buildMemoryBody(memory),
      actorLabel: memory.topCreatorTag ? `@${memory.topCreatorTag}` : null,
      sourceLabel: 'venue memory',
      occurredAt: memory.bucketStartAt.toISOString(),
      mediaUrl: null,
      href: `/venues/${venue.slug}`,
      badges: [
        `${memory.uniqueVisitorCount} visitor${memory.uniqueVisitorCount === 1 ? '' : 's'}`,
        memory.proofCount > 0 ? `${memory.proofCount} proof${memory.proofCount === 1 ? '' : 's'}` : null,
      ].filter((badge): badge is string => Boolean(badge)),
      tone: 'emerald',
    }));

  const timeline = [...proofItems, ...dareItems, ...memoryItems]
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, limit);

  const canLeaveSignal = Boolean(viewerCheckIn);

  return {
    venue: {
      id: venue.id,
      slug: venue.slug,
      name: venue.name,
    },
    viewer: {
      canLeaveSignal,
      proofLevel: viewerCheckIn?.proofLevel ?? null,
      lastCheckInAt: viewerCheckIn?.scannedAt.toISOString() ?? null,
      reason: canLeaveSignal
        ? viewerCheckIn?.proofLevel === 'QR_AND_GPS'
          ? 'Vault write unlocked by QR + GPS proof.'
          : 'Vault write unlocked by QR proof.'
        : 'Check in with the venue pass to leave permanent signal.',
    },
    stats: {
      checkIns,
      qrGpsCheckIns,
      uniqueVisitors: uniqueVisitors.length,
      proofs,
      firstProofs,
      completedDares: completedDaresCount,
    },
    reviews,
    placeHealth: derivePlaceHealth(placeObservations),
    timeline,
  };
}
