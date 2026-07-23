import type { Prisma, PrismaClient } from '@prisma/client';

import { derivePlaceHealth } from '@/lib/place-health';
import { evaluatePlaceEndorsementEligibility } from '@/lib/place-endorsement-policy';
import { prisma } from '@/lib/prisma';

type Db = PrismaClient | Prisma.TransactionClient;
const SECURE_VISIT_WINDOW_MS = 180 * 24 * 60 * 60_000;

const observationSelect = {
  id: true,
  buyerQuestion: true,
  reportedOutcome: true,
  observedAt: true,
  acceptedAt: true,
  refreshAt: true,
  outcomeContractSnapshot: true,
} as const;

async function getEligibilityWithDb(db: Db, venueId: string, walletAddress: string) {
  const since = new Date(Date.now() - SECURE_VISIT_WINDOW_MS);
  const [observations, targetCheckIn, checkIns, marks, activeEndorsementCount, existing] = await Promise.all([
    db.placeMemoryObservation.findMany({
      where: { venueId },
      orderBy: { acceptedAt: 'desc' },
      take: 8,
      select: observationSelect,
    }),
    db.venueCheckIn.findFirst({
      where: { venueId, walletAddress, status: 'CONFIRMED', proofLevel: 'QR_AND_GPS', scannedAt: { gte: since } },
      orderBy: { scannedAt: 'desc' },
      select: { id: true, tag: true },
    }),
    db.venueCheckIn.findMany({
      where: { walletAddress, status: 'CONFIRMED', proofLevel: 'QR_AND_GPS', scannedAt: { gte: since } },
      select: { id: true, venueId: true },
    }),
    db.placeTag.findMany({
      where: { walletAddress, status: 'APPROVED' },
      select: { id: true, venueId: true },
    }),
    db.placeEndorsement.count({ where: { walletAddress, status: 'ACTIVE' } }),
    db.placeEndorsement.findUnique({
      where: { venueId_walletAddress: { venueId, walletAddress } },
      select: { id: true, status: true, createdAt: true },
    }),
  ]);
  const contributionKeys = new Set([
    ...checkIns.map((item) => `checkin:${item.id}`),
    ...marks.map((item) => `mark:${item.id}`),
  ]);
  const contributionPlaces = new Set([...checkIns.map((item) => item.venueId), ...marks.map((item) => item.venueId)]);
  const health = derivePlaceHealth(observations);
  const decision = evaluatePlaceEndorsementEligibility({
    placeIsFresh: health.state === 'FRESH',
    hasRecentSecureVisit: Boolean(targetCheckIn),
    acceptedContributionCount: contributionKeys.size,
    distinctContributionPlaces: contributionPlaces.size,
    activeEndorsementCount,
    alreadyEndorsed: existing?.status === 'ACTIVE',
    suppressed: existing?.status === 'SUPPRESSED',
  });
  return {
    ...decision,
    health,
    targetCheckIn,
    activeEndorsementCount,
    acceptedContributionCount: contributionKeys.size,
    distinctContributionPlaces: contributionPlaces.size,
    existing,
  };
}

export async function getPlaceEndorsementSnapshot(slug: string, walletAddress?: string | null) {
  const venue = await prisma.venue.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: {
      id: true,
      slug: true,
      name: true,
      placeEndorsements: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, tag: true, createdAt: true },
      },
      _count: { select: { placeEndorsements: { where: { status: 'ACTIVE' } } } },
    },
  });
  if (!venue) return null;
  const eligibility = walletAddress ? await getEligibilityWithDb(prisma, venue.id, walletAddress) : null;
  return {
    venue: { id: venue.id, slug: venue.slug, name: venue.name },
    count: venue._count.placeEndorsements,
    recent: venue.placeEndorsements.map((item) => ({ id: item.id, tag: item.tag, createdAt: item.createdAt })),
    eligibility: eligibility ? {
      eligible: eligibility.eligible,
      reasons: eligibility.reasons,
      alreadyEndorsed: eligibility.alreadyEndorsed,
      activeEndorsementCount: eligibility.activeEndorsementCount,
      acceptedContributionCount: eligibility.acceptedContributionCount,
      distinctContributionPlaces: eligibility.distinctContributionPlaces,
      placeHealth: eligibility.health.state,
    } : null,
  };
}

export async function endorsePlace(slug: string, walletAddress: string) {
  return prisma.$transaction(async (tx) => {
    const venue = await tx.venue.findFirst({ where: { slug, status: 'ACTIVE' }, select: { id: true, name: true } });
    if (!venue) throw new Error('Place not found.');
    const eligibility = await getEligibilityWithDb(tx, venue.id, walletAddress);
    if (!eligibility.eligible || !eligibility.targetCheckIn) throw new Error(eligibility.reasons[0] || 'This endorsement is not available.');
    const endorsement = await tx.placeEndorsement.upsert({
      where: { venueId_walletAddress: { venueId: venue.id, walletAddress } },
      create: {
        venueId: venue.id,
        walletAddress,
        checkInId: eligibility.targetCheckIn.id,
        tag: eligibility.targetCheckIn.tag,
      },
      update: {
        checkInId: eligibility.targetCheckIn.id,
        tag: eligibility.targetCheckIn.tag,
        status: 'ACTIVE',
      },
      select: { id: true, status: true, createdAt: true },
    });
    return { endorsement, venueName: venue.name };
  }, { isolationLevel: 'Serializable' });
}

export async function retractPlaceEndorsement(slug: string, walletAddress: string) {
  const venue = await prisma.venue.findFirst({ where: { slug, status: 'ACTIVE' }, select: { id: true } });
  if (!venue) throw new Error('Place not found.');
  const result = await prisma.placeEndorsement.updateMany({
    where: { venueId: venue.id, walletAddress, status: 'ACTIVE' },
    data: { status: 'RETRACTED' },
  });
  if (!result.count) throw new Error('No active endorsement found.');
  return result;
}
