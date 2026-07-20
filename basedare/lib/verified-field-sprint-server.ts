import { randomBytes } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { MANAGED_FIELD_SPRINT } from '@/lib/financial-canon';
import { prisma } from '@/lib/prisma';
import {
  buildFieldSprintReceiptSummary,
  canTransitionVerifiedFieldSprint,
  canonicalMissionSettlement,
  compileFieldSprintContracts,
  inferEvidenceQuality,
  parseAcceptedFieldTruthOutcome,
  validateSprintEscrow,
  validateSprintFunding,
  type FieldSprintEvidenceQuality,
  type FieldTruthResult,
} from '@/lib/verified-field-sprint-policy';

const sprintInclude = {
  stations: {
    include: {
      link: { select: { id: true, slug: true, stationCode: true, contentCode: true, campaignCode: true, active: true } },
    },
  },
  missions: {
    orderBy: { ordinal: 'asc' as const },
    include: {
      venue: { select: { id: true, slug: true, name: true } },
      dare: {
        select: {
          id: true, shortId: true, title: true, status: true, bounty: true,
          isSimulated: true, onChainDareId: true, isNearbyDare: true,
          outcomeContractFamily: true, outcomeContractVersion: true,
          outcomeContractSnapshot: true, reportedOutcome: true, evidenceDecision: true,
          targetWalletAddress: true, claimedBy: true, venueId: true, locationLabel: true,
          verifiedAt: true, verifyTxHash: true, videoUrl: true, proofCid: true,
          proofAttempts: {
            orderBy: { receivedAt: 'desc' as const },
            take: 1,
            select: {
              mediaCid: true, proximityDecision: true, verificationConfidence: true,
              evidenceDecision: true, receivedAt: true, decidedAt: true,
            },
          },
        },
      },
      placeObservation: true,
    },
  },
} satisfies Prisma.VerifiedFieldSprintInclude;

export type SprintWithDetails = Prisma.VerifiedFieldSprintGetPayload<{ include: typeof sprintInclude }>;

export async function listVerifiedFieldSprints() {
  return prisma.verifiedFieldSprint.findMany({ include: sprintInclude, orderBy: { createdAt: 'desc' }, take: 50 });
}

export async function getVerifiedFieldSprint(id: string) {
  return prisma.verifiedFieldSprint.findUnique({ where: { id }, include: sprintInclude });
}

export async function startVerifiedFieldSprint(input: {
  buyerName: string;
  buyerOrganization?: string | null;
  buyerEmail?: string | null;
  buyerQuestion: string;
  areaLabel: string;
  freshnessWindowHours: number;
  campaignCode: string;
  stationLinkIds: string[];
  createdBy: string;
}) {
  const stationLinkIds = Array.from(new Set(input.stationLinkIds));
  if (stationLinkIds.length !== 2) throw new Error('Exactly two distinct active Field Stations are required.');
  const campaignCode = cleanCode(input.campaignCode);
  const links = await prisma.creatorAttributionLink.findMany({
    where: { id: { in: stationLinkIds }, active: true, stationCode: { not: null } },
    select: { id: true, campaignCode: true, stationCode: true },
  });
  if (links.length !== 2) throw new Error('Both Field Station links must exist and be active.');
  if (links.some((link) => link.campaignCode !== campaignCode)) {
    throw new Error('Both Field Stations must use the Sprint campaign code so acquisition remains attributable.');
  }
  const compiled = compileFieldSprintContracts({
    buyerQuestion: input.buyerQuestion,
    areaLabel: input.areaLabel,
    freshnessWindowHours: input.freshnessWindowHours,
  });
  return prisma.verifiedFieldSprint.create({
    data: {
      receiptCode: `vfs_${randomBytes(12).toString('hex')}`,
      buyerName: cleanText(input.buyerName, 120),
      buyerOrganization: cleanOptional(input.buyerOrganization, 191),
      buyerEmail: cleanOptional(input.buyerEmail, 254)?.toLowerCase() ?? null,
      buyerQuestion: input.buyerQuestion.replace(/\s+/g, ' ').trim(),
      areaLabel: input.areaLabel.replace(/\s+/g, ' ').trim(),
      freshnessWindowHours: input.freshnessWindowHours,
      campaignCode,
      createdBy: input.createdBy,
      stations: { create: stationLinkIds.map((linkId) => ({ linkId })) },
      missions: {
        create: compiled.map(({ ordinal, snapshot }) => ({
          ordinal,
          buyerQuestion: snapshot.buyerQuestion,
          areaLabel: input.areaLabel.replace(/\s+/g, ' ').trim(),
          outcomeContractFamily: snapshot.family,
          outcomeContractVersion: snapshot.version,
          outcomeContractSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        })),
      },
    },
    include: sprintInclude,
  });
}

export async function confirmVerifiedFieldSprintFunding(input: {
  sprintId: string;
  serviceFeeConfirmedUsd: number;
  rewardPoolConfirmedUsd: number;
  designPartnerException: boolean;
  fundingReference: string;
  actor: string;
}) {
  const validation = validateSprintFunding({
    serviceRevenueUsd: input.serviceFeeConfirmedUsd,
    rewardPoolUsd: input.rewardPoolConfirmedUsd,
    designPartnerException: input.designPartnerException,
    fundingReference: input.fundingReference,
  });
  if (!validation.ok) throw new Error(validation.reason);
  const result = await prisma.verifiedFieldSprint.updateMany({
    where: { id: input.sprintId, status: 'DRAFT' },
    data: {
      status: 'FUNDED',
      serviceFeeConfirmedUsd: input.serviceFeeConfirmedUsd,
      rewardPoolConfirmedUsd: input.rewardPoolConfirmedUsd,
      designPartnerException: input.designPartnerException,
      fundingReference: input.fundingReference.trim(),
      fundingConfirmedBy: input.actor,
      fundedAt: new Date(),
    },
  });
  if (result.count !== 1) throw new Error('Sprint is no longer an unfunded draft.');
  return getVerifiedFieldSprint(input.sprintId);
}

export async function startVerifiedFieldSprintRouting(sprintId: string) {
  const sprint = await getVerifiedFieldSprint(sprintId);
  if (!sprint) throw new Error('Sprint not found.');
  if (!canTransitionVerifiedFieldSprint(sprint.status, 'ROUTING')) throw new Error('Only a funded Sprint can begin routing.');
  if (sprint.stations.length !== 2 || sprint.stations.some(({ link }) => !link.active)) throw new Error('Two active Field Stations are required.');
  if (sprint.missions.length !== 4) throw new Error('Four compiled mission contracts are required.');
  const result = await prisma.verifiedFieldSprint.updateMany({ where: { id: sprintId, status: 'FUNDED' }, data: { status: 'ROUTING', routingAt: new Date() } });
  if (result.count !== 1) throw new Error('Sprint state changed before routing began.');
  return getVerifiedFieldSprint(sprintId);
}

export async function linkVerifiedFieldSprintMission(input: { sprintId: string; ordinal: number; dareId: string }) {
  return prisma.$transaction(async (tx) => {
    const sprint = await tx.verifiedFieldSprint.findUnique({
      where: { id: input.sprintId },
      include: { missions: { include: { dare: { select: { targetWalletAddress: true, claimedBy: true } } } } },
    });
    if (!sprint) throw new Error('Sprint not found.');
    if (sprint.status !== 'ROUTING') throw new Error('Missions can only be linked while the Sprint is routing.');
    const mission = sprint.missions.find((item) => item.ordinal === input.ordinal);
    if (!mission) throw new Error('Sprint mission not found.');
    if (mission.dareId && mission.dareId !== input.dareId) throw new Error('A compiled mission cannot be relinked to a different escrow.');
    const dare = await tx.dare.findUnique({
      where: { id: input.dareId },
      select: {
        id: true, bounty: true, status: true, isSimulated: true, onChainDareId: true,
        isNearbyDare: true, outcomeContractFamily: true, outcomeContractVersion: true,
        outcomeContractSnapshot: true, targetWalletAddress: true, claimedBy: true,
        venueId: true, locationLabel: true,
      },
    });
    if (!dare) throw new Error('Funded dare not found.');
    const validation = validateSprintEscrow({
      grossRewardUsd: dare.bounty,
      status: dare.status,
      isSimulated: dare.isSimulated,
      onChainDareId: dare.onChainDareId,
      isNearbyDare: dare.isNearbyDare,
      outcomeContractFamily: dare.outcomeContractFamily,
      outcomeContractVersion: dare.outcomeContractVersion,
      outcomeContractSnapshot: dare.outcomeContractSnapshot,
      buyerQuestion: sprint.buyerQuestion,
      freshnessWindowHours: sprint.freshnessWindowHours,
    });
    if (!validation.ok) throw new Error(validation.reason);
    const beneficiary = normalizeWallet(dare.targetWalletAddress ?? dare.claimedBy);
    const existingBeneficiaries = sprint.missions.flatMap((item) => {
      if (item.id === mission.id) return [];
      const wallet = normalizeWallet(item.dare?.targetWalletAddress ?? item.dare?.claimedBy);
      return wallet ? [wallet] : [];
    });
    if (beneficiary && existingBeneficiaries.includes(beneficiary)) throw new Error('Each Sprint mission must route to an independent contributor.');
    await tx.verifiedFieldSprintMission.update({
      where: { id: mission.id },
      data: { dareId: dare.id, venueId: dare.venueId, locationLabel: dare.locationLabel, status: 'ROUTED' },
    });
    return tx.verifiedFieldSprint.findUniqueOrThrow({ where: { id: sprint.id }, include: sprintInclude });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function beginVerifiedFieldSprintCollection(sprintId: string) {
  const sprint = await getVerifiedFieldSprint(sprintId);
  if (!sprint) throw new Error('Sprint not found.');
  if (!canTransitionVerifiedFieldSprint(sprint.status, 'COLLECTING')) throw new Error('Only a routed Sprint can begin collection.');
  if (sprint.missions.length !== 4 || sprint.missions.some((mission) => !mission.dareId)) throw new Error('All four missions must be linked to real escrows.');
  const result = await prisma.verifiedFieldSprint.updateMany({ where: { id: sprintId, status: 'ROUTING' }, data: { status: 'COLLECTING', collectingAt: new Date() } });
  if (result.count !== 1) throw new Error('Sprint state changed before collection began.');
  await prisma.verifiedFieldSprintMission.updateMany({ where: { sprintId, status: 'ROUTED' }, data: { status: 'COLLECTING' } });
  return getVerifiedFieldSprint(sprintId);
}

export async function recordVerifiedFieldSprintReviewCost(input: {
  sprintId: string; ordinal: number; reviewMinutes: number; reviewCostUsd: number;
}) {
  if (!Number.isInteger(input.reviewMinutes) || input.reviewMinutes < 0 || input.reviewMinutes > 600) throw new Error('Review minutes must be 0–600.');
  if (!Number.isFinite(input.reviewCostUsd) || input.reviewCostUsd < 0 || input.reviewCostUsd > MANAGED_FIELD_SPRINT.directDeliveryCostCeilingUsd) throw new Error('Review cost is outside the bounded Sprint cost ceiling.');
  const mission = await prisma.verifiedFieldSprintMission.findUnique({ where: { sprintId_ordinal: { sprintId: input.sprintId, ordinal: input.ordinal } } });
  if (!mission) throw new Error('Sprint mission not found.');
  if (mission.status === 'ACCEPTED') throw new Error('Completed mission costs are immutable.');
  await prisma.verifiedFieldSprintMission.update({ where: { id: mission.id }, data: { reviewMinutes: input.reviewMinutes, reviewCostUsd: input.reviewCostUsd } });
  return syncVerifiedFieldSprint(input.sprintId);
}

export async function syncVerifiedFieldSprint(sprintId: string) {
  const sprint = await getVerifiedFieldSprint(sprintId);
  if (!sprint) throw new Error('Sprint not found.');
  if (!['COLLECTING', 'REVIEW'].includes(sprint.status)) return sprint;
  const settlement = canonicalMissionSettlement();
  await prisma.$transaction(async (tx) => {
    let hasReview = false;
    for (const mission of sprint.missions) {
      const dare = mission.dare;
      if (!dare) continue;
      const attempt = dare.proofAttempts[0] ?? null;
      const outcome = parseAcceptedFieldTruthOutcome(dare.reportedOutcome);
      const observedAt = outcome ? new Date(outcome.observedAt) : null;
      const decisionAt = dare.verifiedAt ?? attempt?.decidedAt ?? attempt?.receivedAt ?? null;
      const freshnessHours = observedAt && decisionAt
        ? Math.max(0, Math.round(((decisionAt.getTime() - observedAt.getTime()) / 3_600_000) * 100) / 100)
        : null;
      const evidenceQuality = inferEvidenceQuality({
        evidenceDecision: dare.evidenceDecision,
        mediaCid: attempt?.mediaCid ?? dare.proofCid,
        proximityDecision: attempt?.proximityDecision ?? null,
        verificationConfidence: attempt?.verificationConfidence ?? null,
      });
      const accepted = dare.status === 'VERIFIED' && dare.evidenceDecision === 'ACCEPTED' && outcome && Boolean(dare.verifyTxHash);
      const rejected = dare.status === 'FAILED' || dare.evidenceDecision === 'REJECTED';
      const hasEvidence = Boolean(dare.videoUrl || dare.proofCid || attempt);
      const status = accepted ? 'ACCEPTED' : rejected ? 'REJECTED' : hasEvidence || dare.evidenceDecision === 'PENDING_REVIEW' ? 'REVIEW' : 'COLLECTING';
      if (status === 'REVIEW' || status === 'ACCEPTED' || status === 'REJECTED') hasReview = true;
      await tx.verifiedFieldSprintMission.update({
        where: { id: mission.id },
        data: {
          status,
          reportedOutcome: outcome ? outcome as unknown as Prisma.InputJsonValue : Prisma.JsonNull,
          evidenceDecision: dare.evidenceDecision,
          evidenceQuality,
          evidenceFreshnessHours: freshnessHours,
          contributorWallet: normalizeWallet(dare.targetWalletAddress ?? dare.claimedBy),
          contributorPayoutUsd: accepted ? settlement.completerPayoutUsd : null,
          platformFeeUsd: accepted ? settlement.platformFeeUsd : null,
          verificationStartedAt: mission.verificationStartedAt ?? attempt?.receivedAt ?? null,
          verificationCompletedAt: accepted ? decisionAt : null,
          verificationTimeMinutes: accepted && decisionAt && (mission.verificationStartedAt ?? attempt?.receivedAt)
            ? Math.max(0, Math.round((decisionAt.getTime() - (mission.verificationStartedAt ?? attempt?.receivedAt)!.getTime()) / 60_000))
            : null,
          observedAt,
          acceptedAt: accepted ? decisionAt : null,
        },
      });
    }
    if (hasReview && sprint.status === 'COLLECTING') {
      await tx.verifiedFieldSprint.updateMany({ where: { id: sprint.id, status: 'COLLECTING' }, data: { status: 'REVIEW', reviewAt: new Date() } });
    }
  });
  return getVerifiedFieldSprint(sprintId);
}

export async function completeVerifiedFieldSprint(sprintId: string) {
  await syncVerifiedFieldSprint(sprintId);
  return prisma.$transaction(async (tx) => {
    const sprint = await tx.verifiedFieldSprint.findUnique({ where: { id: sprintId }, include: { missions: { orderBy: { ordinal: 'asc' } } } });
    if (!sprint) throw new Error('Sprint not found.');
    if (!canTransitionVerifiedFieldSprint(sprint.status, 'COMPLETE')) throw new Error('Sprint must be in review before completion.');
    if (sprint.missions.length !== 4 || sprint.missions.some((mission) => mission.status !== 'ACCEPTED' || !mission.dareId || !mission.reportedOutcome || !mission.acceptedAt || !mission.observedAt || !mission.evidenceQuality || !mission.contributorWallet || mission.contributorPayoutUsd !== 120 || mission.platformFeeUsd !== 5)) {
      throw new Error('All four independent missions need accepted evidence and confirmed payouts before the receipt can close.');
    }
    if (new Set(sprint.missions.map((mission) => mission.contributorWallet)).size !== 4) throw new Error('The four accepted missions must belong to four independent contributors.');
    const totalReviewCost = sprint.missions.reduce((sum, mission) => sum + mission.reviewCostUsd, 0);
    if (totalReviewCost > MANAGED_FIELD_SPRINT.directDeliveryCostCeilingUsd) throw new Error('Recorded review costs exceed the Sprint direct-delivery ceiling.');
    for (const mission of sprint.missions) {
      const outcome = parseAcceptedFieldTruthOutcome(mission.reportedOutcome);
      if (!outcome) throw new Error(`Mission ${mission.ordinal} has no receipt-safe Field Truth outcome.`);
      const refreshAt = new Date(mission.observedAt!.getTime() + sprint.freshnessWindowHours * 3_600_000);
      await tx.placeMemoryObservation.create({
        data: {
          sprintId: sprint.id,
          sprintMissionId: mission.id,
          dareId: mission.dareId!,
          venueId: mission.venueId,
          areaLabel: sprint.areaLabel,
          locationLabel: mission.locationLabel,
          buyerQuestion: sprint.buyerQuestion,
          reportedOutcome: outcome as unknown as Prisma.InputJsonValue,
          evidenceQuality: mission.evidenceQuality!,
          evidenceFreshnessHours: mission.evidenceFreshnessHours,
          observedAt: mission.observedAt!,
          acceptedAt: mission.acceptedAt!,
          refreshAt,
          outcomeContractSnapshot: mission.outcomeContractSnapshot === null
            ? Prisma.JsonNull
            : mission.outcomeContractSnapshot as Prisma.InputJsonValue,
        },
      });
    }
    const changed = await tx.verifiedFieldSprint.updateMany({ where: { id: sprint.id, status: 'REVIEW' }, data: { status: 'COMPLETE', completedAt: new Date() } });
    if (changed.count !== 1) throw new Error('Sprint completion lost a concurrent state race.');
    return tx.verifiedFieldSprint.findUniqueOrThrow({ where: { id: sprint.id }, include: sprintInclude });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function buildVerifiedFieldSprintReceipt(receiptCode: string, includeInternal = false) {
  const sprint = await prisma.verifiedFieldSprint.findUnique({ where: { receiptCode }, include: sprintInclude });
  if (!sprint || (!includeInternal && sprint.status !== 'COMPLETE')) return null;
  const receiptMissions = sprint.missions.flatMap((mission) => {
    const outcome = parseAcceptedFieldTruthOutcome(mission.reportedOutcome);
    if (!outcome || !mission.evidenceQuality || mission.contributorPayoutUsd === null || mission.platformFeeUsd === null) return [];
    return [{
      ordinal: mission.ordinal,
      outcome: outcome.kind as FieldTruthResult,
      evidenceQuality: mission.evidenceQuality as FieldSprintEvidenceQuality,
      evidenceFreshnessHours: mission.evidenceFreshnessHours,
      contributorPayoutUsd: mission.contributorPayoutUsd,
      platformFeeUsd: mission.platformFeeUsd,
      verificationTimeMinutes: mission.verificationTimeMinutes,
      reviewMinutes: mission.reviewMinutes,
      reviewCostUsd: mission.reviewCostUsd,
    }];
  });
  const summary = receiptMissions.length === 4 ? buildFieldSprintReceiptSummary(receiptMissions) : null;
  const stationCodes = sprint.stations.flatMap(({ link }) => link.stationCode ? [link.stationCode] : []);
  const campaignTouches = stationCodes.length ? await prisma.attributionEvent.findMany({
    where: {
      campaignCode: sprint.campaignCode,
      stationCode: { in: stationCodes },
      occurredAt: { gte: sprint.createdAt, lte: sprint.completedAt ?? undefined },
    },
    select: { journeyId: true },
  }) : [];
  const journeyIds = Array.from(new Set(campaignTouches.flatMap((event) => event.journeyId ? [event.journeyId] : [])));
  const acquisitionEvents = journeyIds.length ? await prisma.attributionEvent.findMany({
    where: {
      journeyId: { in: journeyIds },
      stationCode: { in: stationCodes },
      occurredAt: { gte: sprint.createdAt, lte: sprint.completedAt ?? undefined },
    },
    select: { eventType: true, stationCode: true },
  }) : [];
  const acquisition = Object.fromEntries(['STATION_SCAN', 'STATION_ATTENTION_SELECTED', 'STATION_TARGET_OPENED', 'MISSION_PASS_ISSUED'].map((eventType) => [eventType, acquisitionEvents.filter((event) => event.eventType === eventType).length]));
  return {
    receiptCode: sprint.receiptCode,
    status: sprint.status,
    buyer: { name: sprint.buyerName, organization: sprint.buyerOrganization },
    question: sprint.buyerQuestion,
    area: sprint.areaLabel,
    freshnessWindowHours: sprint.freshnessWindowHours,
    completedAt: sprint.completedAt,
    economics: { invoiceTotalUsd: 2500, serviceFeeUsd: sprint.serviceFeeUsd, rewardPoolUsd: sprint.rewardPoolUsd },
    summary,
    missions: sprint.missions.map((mission) => ({
      ordinal: mission.ordinal,
      status: mission.status,
      place: mission.venue?.name ?? mission.locationLabel ?? sprint.areaLabel,
      outcome: parseAcceptedFieldTruthOutcome(mission.reportedOutcome),
      evidenceQuality: mission.evidenceQuality,
      evidenceFreshnessHours: mission.evidenceFreshnessHours,
      contributorPayoutUsd: mission.contributorPayoutUsd,
      verificationTimeMinutes: mission.verificationTimeMinutes,
      reviewCostUsd: mission.reviewCostUsd,
      refreshAt: mission.placeObservation?.refreshAt ?? null,
    })),
    fieldStationAcquisition: {
      stationCodes,
      counts: acquisition,
      meaning: 'Acquisition and intent signals from the two physical Field Stations; these are not verified arrivals or field outcomes.',
    },
  };
}

function cleanText(value: string, max: number) {
  const result = value.replace(/\s+/g, ' ').trim().slice(0, max);
  if (!result) throw new Error('Required text is missing.');
  return result;
}
function cleanOptional(value: string | null | undefined, max: number) {
  const result = value?.replace(/\s+/g, ' ').trim().slice(0, max);
  return result || null;
}
function cleanCode(value: string) {
  const result = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  if (result.length < 3) throw new Error('Campaign code must be at least three URL-safe characters.');
  return result;
}
function normalizeWallet(value: string | null | undefined) {
  const wallet = value?.trim().toLowerCase();
  return wallet || null;
}
