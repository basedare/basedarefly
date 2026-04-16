import 'server-only';

import { type Dare } from '@prisma/client';

import { createWalletNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import { approveDareWithPayout, syncLinkedCampaignForDareState, type DareApprovalResult } from '@/lib/dare-approval';
import { trackServerEvent } from '@/lib/server-analytics';
import { getSentinelReasonForSelection, getSentinelRecommendation } from '@/lib/sentinel';

type ModerationDecision = 'APPROVE' | 'REJECT';

type ModerateDareInput = {
  dareId?: string;
  dareRef?: string;
  decision: ModerationDecision;
  sourceContext: string;
  moderatorAddress?: string | null;
  note?: string | null;
  notificationMessage?: string | null;
  rejectReason?: string | null;
};

export type ModerateDareResult = {
  dare: Dare;
  decision: ModerationDecision;
  newStatus: 'VERIFIED' | 'FAILED' | 'PENDING_PAYOUT';
  moderatedAt: Date | null;
  moderatorAddress?: string | null;
  note?: string | null;
  pendingReason: string | null;
  payout: DareApprovalResult['payout'] | null;
};

export async function findDareForModeration(ref: string): Promise<Dare | null> {
  const trimmedRef = ref.trim();
  if (!trimmedRef) return null;

  return prisma.dare.findFirst({
    where: {
      OR: [
        { shortId: trimmedRef },
        { id: trimmedRef },
        { id: { startsWith: trimmedRef } },
      ],
    },
  });
}

async function loadDare(input: ModerateDareInput): Promise<Dare | null> {
  if (input.dareId) {
    return prisma.dare.findUnique({ where: { id: input.dareId } });
  }

  if (input.dareRef) {
    return findDareForModeration(input.dareRef);
  }

  return null;
}

export async function moderateDareDecision(input: ModerateDareInput): Promise<ModerateDareResult> {
  const dare = await loadDare(input);

  if (!dare) {
    throw new Error('Dare not found');
  }

  if (!dare.videoUrl) {
    throw new Error('Cannot moderate dare without proof submission');
  }

  if (dare.moderatorDecision) {
    throw new Error(`Dare already moderated: ${dare.moderatorDecision}`);
  }

  const moderatedAt = new Date();
  const moderatorAddress = input.moderatorAddress ?? null;
  const note = input.note ?? null;

  if (input.decision === 'APPROVE') {
    const result = await approveDareWithPayout({
      dareId: dare.id,
      sourceContext: input.sourceContext,
      verifiedAt: moderatedAt,
      verifyConfidence: 1.0,
      proofHash: dare.proofHash,
      proofMedia: dare.videoUrl,
      appealStatus: 'APPROVED',
      moderatorDecision: input.decision,
      moderatorAddress,
      moderatedAt,
      moderatorNote: note,
      notificationMessage:
        input.notificationMessage ||
        `Your proof for "${dare.title}" was approved by BaseDare moderation.`,
    });

    return {
      dare: result.dare,
      decision: input.decision,
      newStatus: result.status,
      moderatedAt: result.dare.moderatedAt,
      moderatorAddress,
      note,
      pendingReason: result.status === 'PENDING_PAYOUT' ? result.pendingReason : null,
      payout: result.payout,
    };
  }

  if (dare.requireSentinel) {
    const recommendation = getSentinelRecommendation({
      amount: dare.bounty,
      missionTag: dare.tag,
      venueId: dare.venueId,
    });

    trackServerEvent('sentinel_review_rejected', {
      recommended: recommendation.recommended,
      selected: true,
      reason: getSentinelReasonForSelection({
        recommendedReason: recommendation.reason,
        selected: true,
      }),
      source: 'admin_review',
    });
  }

  const updatedDare = await prisma.dare.update({
    where: { id: dare.id },
    data: {
      status: 'FAILED',
      manualReviewNeeded: false,
      moderatorDecision: input.decision,
      moderatorAddress,
      moderatedAt,
      moderatorNote: note,
      verifiedAt: null,
      appealStatus: 'REJECTED',
      appealReason: input.rejectReason || note || 'Rejected by moderation',
    },
  });

  await syncLinkedCampaignForDareState({
    dareId: dare.id,
    status: 'FAILED',
  });

  if (dare.targetWalletAddress) {
    await createWalletNotification({
      wallet: dare.targetWalletAddress,
      type: 'DARE_FAILED',
      title: 'Dare Rejected by Admin',
      message: `Your proof for "${dare.title}" was rejected by moderators.`,
      link: '/dashboard',
      pushTopic: 'wallet',
    });
  }

  return {
    dare: updatedDare,
    decision: input.decision,
    newStatus: 'FAILED',
    moderatedAt: updatedDare.moderatedAt,
    moderatorAddress,
    note,
    pendingReason: null,
    payout: null,
  };
}
