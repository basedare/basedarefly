import 'server-only';

import { Prisma, type Dare } from '@prisma/client';
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  isAddress,
  parseEther,
  type Address,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';

import { BOUNTY_ABI } from '@/abis/BaseDareBounty';
import { waitForSuccessfulReceipt } from '@/lib/bounty-chain';
import { prisma } from '@/lib/prisma';
import { isBountySimulationMode } from '@/lib/bounty-mode';
import { buildCreatorHandleVariants } from '@/lib/creator-stats';
import { recordDareFounderEventSafe } from '@/lib/founder-events';
import { isPlaceTagTableMissingError } from '@/lib/place-tags';
import { getRefereeAccount } from '@/lib/referee-wallet';
import { trackServerEvent } from '@/lib/server-analytics';
import { getSentinelAnalyticsSource, getSentinelRecommendation, getSentinelReasonForSelection } from '@/lib/sentinel';
import { alertError, alertPayout, alertVerification } from '@/lib/telegram';
import { sendWalletPush } from '@/lib/web-push';

const IS_MAINNET = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
const activeChain = IS_MAINNET ? base : baseSepolia;
const rpcUrl = IS_MAINNET ? 'https://mainnet.base.org' : 'https://sepolia.base.org';
const BOUNTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as Address;
const FORCE_SIMULATION = isBountySimulationMode();
const isContractDeployed = isAddress(BOUNTY_CONTRACT_ADDRESS);

export const STREAMER_FEE_PERCENT = 96;
export const HOUSE_FEE_PERCENT = 4;
export const REFERRER_FEE_PERCENT = 0;

const REFEREE_MAX_BALANCE_ETH = '0.05';
const REFEREE_MAX_BALANCE_WEI = parseEther(REFEREE_MAX_BALANCE_ETH);
const REFEREE_ALERT_COOLDOWN_MS = 5 * 60 * 1000;

let lastRefereeBalanceAlertAt = 0;

type RefereeBalanceClient = {
  getBalance: (args: { address: Address }) => Promise<bigint>;
};

type FinalizeVerifiedDareInput = {
  dareId: string;
  sourceContext: string;
  verifiedAt?: Date;
  verifyTxHash?: string | null;
  verifyConfidence?: number | null;
  proofHash?: string | null;
  proofMedia?: string | null;
  appealStatus?: string | null;
  moderatorDecision?: string | null;
  moderatorAddress?: string | null;
  moderatedAt?: Date | null;
  moderatorNote?: string | null;
  notificationMessage?: string | null;
};

type ApproveDareWithPayoutInput = Omit<FinalizeVerifiedDareInput, 'verifyTxHash'>;

export type DareApprovalResult =
  | {
      status: 'VERIFIED';
      dare: Dare;
      txHash: string | null;
      payout: {
        streamer: number;
        house: number;
        referrer: number;
      };
    }
  | {
      status: 'PENDING_PAYOUT';
      dare: Dare;
      pendingReason: string;
      payout: {
        streamer: number;
        house: number;
        referrer: number;
      };
    };

export async function syncLinkedCampaignForDareState(input: {
  dareId: string;
  status?: string | null;
  occurredAt?: Date | null;
}) {
  const dare = await prisma.dare.findUnique({
    where: { id: input.dareId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!dare) {
    throw new Error('Dare not found');
  }

  const nextStatus = input.status ?? dare.status ?? null;
  if (!nextStatus) {
    return { updated: false, reason: 'NO_STATUS' as const };
  }

  const campaign = await prisma.campaign.findFirst({
    where: { linkedDareId: dare.id },
    select: {
      id: true,
      status: true,
      settledAt: true,
    },
  });

  if (!campaign) {
    return { updated: false, reason: 'NO_LINKED_CAMPAIGN' as const };
  }

  if (nextStatus === 'VERIFIED') {
    if (campaign.status === 'SETTLED' || campaign.settledAt) {
      return { updated: false, reason: 'ALREADY_SETTLED' as const };
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'SETTLED',
        settledAt: input.occurredAt ?? new Date(),
      },
    });

    return { updated: true, reason: 'SETTLED' as const };
  }

  if (['FAILED', 'REFUNDED', 'EXPIRED'].includes(nextStatus)) {
    if (campaign.status === 'SETTLED' || campaign.settledAt) {
      return { updated: false, reason: 'SETTLED_WINS' as const };
    }

    if (campaign.status === 'CANCELLED') {
      return { updated: false, reason: 'ALREADY_CANCELLED' as const };
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'CANCELLED',
      },
    });

    return { updated: true, reason: 'CANCELLED' as const };
  }

  return { updated: false, reason: 'NON_TERMINAL_STATUS' as const };
}

function getRefereeClient() {
  const account = getRefereeAccount(process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS);

  const publicClient = createPublicClient({
    chain: activeChain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: activeChain,
    transport: http(rpcUrl),
  });

  return { publicClient, walletClient, account };
}

async function enforceRefereeBalanceCap(
  publicClient: RefereeBalanceClient,
  refereeAddress: Address,
  context: string
): Promise<{ allowed: boolean; balanceEth: string }> {
  const balanceWei = await publicClient.getBalance({ address: refereeAddress });
  const balanceEth = formatEther(balanceWei);

  if (balanceWei <= REFEREE_MAX_BALANCE_WEI) {
    return { allowed: true, balanceEth };
  }

  console.warn(
    `[SECURITY] Referee hot wallet balance cap exceeded: ${balanceEth} ETH > ${REFEREE_MAX_BALANCE_ETH} ETH`
  );

  const now = Date.now();
  if (now - lastRefereeBalanceAlertAt > REFEREE_ALERT_COOLDOWN_MS) {
    lastRefereeBalanceAlertAt = now;
    alertError({
      type: 'CONTRACT_ERROR',
      error: `Referee hot wallet balance ${balanceEth} ETH exceeds ${REFEREE_MAX_BALANCE_ETH} ETH cap`,
      context: `${context} paused. Wallet: ${refereeAddress}`,
    }).catch((err) => console.error('[TELEGRAM] Referee balance alert failed:', err));
  }

  return { allowed: false, balanceEth };
}

function toGeoBucket(geohash: string | null | undefined): string | null {
  if (!geohash) return null;
  return geohash.length <= 5 ? geohash : geohash.slice(0, 5);
}

function inferProofType(url: string | null): string {
  if (!url) return 'VIDEO';
  const lower = url.toLowerCase();
  if (
    lower.endsWith('.mp4') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.webm') ||
    lower.includes('.m3u8')
  ) {
    return 'VIDEO';
  }
  return 'IMAGE';
}

function calculatePayouts(dare: Dare) {
  const totalBounty = dare.bounty;
  const streamer = (totalBounty * STREAMER_FEE_PERCENT) / 100;
  const house = (totalBounty * HOUSE_FEE_PERCENT) / 100;
  const referrer = dare.referrerAddress ? (totalBounty * REFERRER_FEE_PERCENT) / 100 : 0;

  return { totalBounty, streamer, house, referrer };
}

function getCompletionWalletAddress(dare: Dare): string | null {
  return (
    dare.claimedBy?.toLowerCase() ||
    dare.targetWalletAddress?.toLowerCase() ||
    dare.stakerAddress?.toLowerCase() ||
    null
  );
}

async function syncStreamerTagAggregatesForDare(
  tx: Prisma.TransactionClient,
  dare: Dare
) {
  const handleVariants = buildCreatorHandleVariants(dare.streamerHandle ?? dare.claimRequestTag);
  if (handleVariants.length === 0) {
    return;
  }

  const aggregate = await tx.dare.aggregate({
    where: {
      status: 'VERIFIED',
      OR: [
        { streamerHandle: { in: handleVariants, mode: 'insensitive' } },
        { claimRequestTag: { in: handleVariants, mode: 'insensitive' } },
      ],
    },
    _sum: { bounty: true },
    _count: { id: true },
  });

  const normalizedHandle = handleVariants[0].replace(/^@/, '');

  await tx.streamerTag.updateMany({
    where: {
      OR: [
        { tag: { in: handleVariants, mode: 'insensitive' } },
        { twitterHandle: { equals: normalizedHandle, mode: 'insensitive' } },
        { twitchHandle: { equals: normalizedHandle, mode: 'insensitive' } },
        { youtubeHandle: { equals: normalizedHandle, mode: 'insensitive' } },
        { kickHandle: { equals: normalizedHandle, mode: 'insensitive' } },
      ],
      status: { in: ['ACTIVE', 'VERIFIED'] },
    },
    data: {
      totalEarned: aggregate._sum.bounty ?? 0,
      completedDares: aggregate._count.id,
    },
  });
}

async function ensureApprovedPlaceTagForVerifiedDare(
  tx: Prisma.TransactionClient,
  dare: Dare,
  sourceContext: string,
  verifiedAt: Date,
  proofMedia: string | null,
  proofHash: string | null,
  reviewerWallet: string | null
) {
  if (!dare.venueId) {
    return;
  }

  const walletAddress = getCompletionWalletAddress(dare);
  if (!walletAddress || !proofMedia) {
    console.warn(
      `[PLACE_MEMORY] Skipping completion tag for dare ${dare.id} - missing ${!walletAddress ? 'walletAddress' : 'proofMedia'}`
    );
    return;
  }

  try {
    const existingTag = await tx.placeTag.findFirst({
      where: { linkedDareId: dare.id },
      select: { id: true },
    });

    if (existingTag) {
      return;
    }

    const approvedTagCount = await tx.placeTag.count({
      where: {
        venueId: dare.venueId,
        status: 'APPROVED',
      },
    });

    await tx.placeTag.create({
      data: {
        venueId: dare.venueId,
        walletAddress,
        creatorTag: dare.streamerHandle ?? null,
        status: 'APPROVED',
        caption: `Completed: ${dare.title}`,
        vibeTags: [],
        proofMediaUrl: proofMedia,
        proofCid: dare.proofCid,
        proofHash,
        proofType: inferProofType(proofMedia),
        source: 'DARE_COMPLETION',
        linkedDareId: dare.id,
        latitude: dare.latitude,
        longitude: dare.longitude,
        heatContribution: 15,
        firstMark: approvedTagCount === 0,
        submittedAt: verifiedAt,
        reviewedAt: verifiedAt,
        reviewerWallet,
        reviewReason: 'Auto-approved from verified dare completion',
        metadataJson: {
          sourceContext,
          verifyTxHash: dare.verifyTxHash,
          dareShortId: dare.shortId,
        },
      },
    });
  } catch (error) {
    if (isPlaceTagTableMissingError(error)) {
      console.warn('[PLACE_MEMORY] PlaceTag table unavailable, skipping completion tag creation');
      return;
    }

    throw error;
  }
}

async function ensureCampaignWritebackForVerifiedDare(
  tx: Prisma.TransactionClient,
  dare: Dare,
  verifiedAt: Date
) {
  const campaign = await tx.campaign.findFirst({
    where: { linkedDareId: dare.id },
    include: {
      slots: {
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });

  if (!campaign) {
    return;
  }

  const completionWallet = getCompletionWalletAddress(dare);
  const primarySlot = campaign.slots[0] ?? null;
  const alreadySettled = campaign.status === 'SETTLED' || campaign.settledAt !== null;

  if (!alreadySettled) {
    await tx.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'SETTLED',
        settledAt: verifiedAt,
      },
    });

    await tx.brand.update({
      where: { id: campaign.brandId },
      data: {
        totalSpend: {
          increment: dare.bounty,
        },
      },
    });
  }

  if (!primarySlot) {
    return;
  }

  if (!['VERIFIED', 'PAID'].includes(primarySlot.status)) {
    await tx.campaignSlot.update({
      where: { id: primarySlot.id },
      data: {
        status: 'VERIFIED',
        creatorAddress: completionWallet ?? primarySlot.creatorAddress,
        creatorHandle:
          dare.streamerHandle ?? dare.claimRequestTag ?? primarySlot.creatorHandle ?? null,
        submittedAt: primarySlot.submittedAt ?? verifiedAt,
        paidAt: primarySlot.paidAt ?? verifiedAt,
        basePayout: primarySlot.basePayout ?? dare.bounty,
        totalPayout: primarySlot.totalPayout ?? dare.bounty,
      },
    });

    if (primarySlot.scoutId) {
      await tx.scout.update({
        where: { id: primarySlot.scoutId },
        data: {
          successfulSlots: { increment: 1 },
          totalCampaigns: { increment: 1 },
        },
      });
    }
  }
}

async function markDarePendingPayout(
  dareId: string,
  input: {
    verifyConfidence?: number | null;
    proofHash?: string | null;
    appealStatus?: string | null;
  }
) {
  const existingDare = await prisma.dare.findUnique({
    where: { id: dareId },
  });

  const queuedDare = await prisma.dare.update({
    where: { id: dareId },
    data: {
      status: 'PENDING_PAYOUT',
      appealStatus: input.appealStatus ?? 'APPROVED',
      verifyConfidence: input.verifyConfidence ?? undefined,
      proofHash: input.proofHash ?? undefined,
      manualReviewNeeded: false,
      sentinelVerified: existingDare?.requireSentinel ? true : existingDare?.sentinelVerified,
    },
  });

  await recordDareFounderEventSafe({
    eventType: 'payout_queued',
    source: 'dare-approval',
    dare: queuedDare,
    status: 'PENDING_PAYOUT',
    metadata: {
      sourceContext: 'approve-dare-with-payout',
      verifyConfidence: input.verifyConfidence ?? null,
      proofHash: input.proofHash ?? null,
    },
  });
}

export async function finalizeVerifiedDare(
  input: FinalizeVerifiedDareInput
): Promise<{
  dare: Dare;
  payout: { streamer: number; house: number; referrer: number };
}> {
  const existingDare = await prisma.dare.findUnique({
    where: { id: input.dareId },
  });

  if (!existingDare) {
    throw new Error('Dare not found');
  }

  const verifiedAt = input.verifiedAt ?? existingDare.verifiedAt ?? new Date();
  const proofMedia = input.proofMedia ?? existingDare.proof_media ?? existingDare.videoUrl ?? null;
  const proofHash = input.proofHash ?? existingDare.proofHash ?? null;
  const venueKey =
    existingDare.locationLabel?.trim() ||
    existingDare.geohash ||
    (existingDare.isNearbyDare ? 'nearby-unknown' : 'stream');
  const persistedTag = existingDare.tag || (existingDare.isNearbyDare ? 'street' : 'stream');
  const payout = calculatePayouts(existingDare);

  const updatedDare = await prisma.$transaction(async (tx) => {
    const updateData: Prisma.DareUpdateInput = {
      status: 'VERIFIED',
      verifiedAt,
      referrerPayout: payout.referrer > 0 ? payout.referrer : null,
      tag: persistedTag,
      venue_key: venueKey,
      dare_text: existingDare.title,
      proof_media: proofMedia,
      completed_at: verifiedAt,
      reaction_count: existingDare.reaction_count ?? 0,
      geo_bucket: toGeoBucket(existingDare.geohash),
      manualReviewNeeded: false,
      sentinelVerified: existingDare.requireSentinel ? true : existingDare.sentinelVerified,
    };

    if (input.verifyTxHash !== undefined) updateData.verifyTxHash = input.verifyTxHash;
    if (input.verifyConfidence !== undefined) updateData.verifyConfidence = input.verifyConfidence;
    if (input.proofHash !== undefined) updateData.proofHash = input.proofHash;
    if (input.appealStatus !== undefined) updateData.appealStatus = input.appealStatus;
    if (input.moderatorDecision !== undefined) updateData.moderatorDecision = input.moderatorDecision;
    if (input.moderatorAddress !== undefined) updateData.moderatorAddress = input.moderatorAddress;
    if (input.moderatedAt !== undefined) updateData.moderatedAt = input.moderatedAt;
    if (input.moderatorNote !== undefined) updateData.moderatorNote = input.moderatorNote;

    const nextDare = await tx.dare.update({
      where: { id: existingDare.id },
      data: updateData,
    });

    await ensureApprovedPlaceTagForVerifiedDare(
      tx,
      nextDare,
      input.sourceContext,
      verifiedAt,
      proofMedia,
      proofHash,
      input.moderatorAddress ?? null
    );

    await syncStreamerTagAggregatesForDare(tx, nextDare);

    await ensureCampaignWritebackForVerifiedDare(tx, nextDare, verifiedAt);

    if (nextDare.targetWalletAddress) {
      await tx.notification.create({
        data: {
          wallet: nextDare.targetWalletAddress.toLowerCase(),
          type: 'DARE_VERIFIED',
          title: 'Dare Verified & Paid!',
          message:
            input.notificationMessage ??
            `Your proof for "${nextDare.title}" was approved. ${payout.streamer.toFixed(2)} USDC has been sent to your wallet.`,
          link: '/dashboard',
        },
      });
    }

    return nextDare;
  });

  await recordDareFounderEventSafe({
    eventType: 'dare_settled',
    source: input.sourceContext,
    dare: updatedDare,
    status: 'VERIFIED',
    metadata: {
      verifyTxHash: input.verifyTxHash ?? null,
      verifyConfidence: input.verifyConfidence ?? null,
      proofHash,
      sentinel: updatedDare.requireSentinel,
    },
    occurredAt: verifiedAt,
  });

  alertVerification({
    dareId: updatedDare.id,
    shortId: updatedDare.shortId || updatedDare.id,
    title: updatedDare.title,
    streamerTag: updatedDare.streamerHandle,
    result: 'VERIFIED',
    confidence:
      input.verifyConfidence != null ? Math.round(input.verifyConfidence * 100) : undefined,
    payout: payout.streamer,
    txHash: input.verifyTxHash ?? null,
  }).catch((err) => console.error('[TELEGRAM] Verification alert failed:', err));

  if (input.verifyTxHash) {
    alertPayout({
      dareId: updatedDare.id,
      shortId: updatedDare.shortId || updatedDare.id,
      title: updatedDare.title,
      streamerTag: updatedDare.streamerHandle,
      creatorPayout: payout.streamer,
      platformFee: payout.house,
      referrerPayout: payout.referrer > 0 ? payout.referrer : undefined,
      txHash: input.verifyTxHash,
    }).catch((err) => console.error('[TELEGRAM] Payout alert failed:', err));
  }

  if (updatedDare.targetWalletAddress) {
    void sendWalletPush({
      wallet: updatedDare.targetWalletAddress,
      topic: 'wallet',
      title: 'Dare Verified & Paid!',
      body:
        input.notificationMessage ??
        `Your proof for "${updatedDare.title}" was approved. ${payout.streamer.toFixed(2)} USDC has been sent to your wallet.`,
      url: '/dashboard',
    }).catch((err) => {
      const message = err instanceof Error ? err.message : 'Unknown push send error';
      console.error('[WEB_PUSH] Verified dare push failed:', message);
    });
  }

  if (updatedDare.requireSentinel) {
    const recommendation = getSentinelRecommendation({
      amount: updatedDare.bounty,
      missionTag: updatedDare.tag,
      venueId: updatedDare.venueId,
    });

    trackServerEvent('sentinel_review_approved', {
      recommended: recommendation.recommended,
      selected: true,
      reason: getSentinelReasonForSelection({
        recommendedReason: recommendation.reason,
        selected: true,
      }),
      source: getSentinelAnalyticsSource(input.sourceContext),
    });
  }

  return { dare: updatedDare, payout };
}

export async function approveDareWithPayout(
  input: ApproveDareWithPayoutInput
): Promise<DareApprovalResult> {
  const dare = await prisma.dare.findUnique({
    where: { id: input.dareId },
  });

  if (!dare) {
    throw new Error('Dare not found');
  }

  if (dare.status === 'VERIFIED') {
    const finalized = await finalizeVerifiedDare(input);
    return {
      status: 'VERIFIED',
      dare: finalized.dare,
      txHash: dare.verifyTxHash ?? null,
      payout: finalized.payout,
    };
  }

  const payout = calculatePayouts(dare);
  const needsOnChainPayout = isContractDeployed && !dare.isSimulated && !FORCE_SIMULATION;

  if (needsOnChainPayout) {
    if (!dare.onChainDareId) {
      await markDarePendingPayout(dare.id, input);
      return {
        status: 'PENDING_PAYOUT',
        dare: await prisma.dare.findUniqueOrThrow({ where: { id: dare.id } }),
        pendingReason: 'Missing on-chain dare ID. Payout has been queued for retry.',
        payout: {
          streamer: payout.streamer,
          house: payout.house,
          referrer: payout.referrer,
        },
      };
    }

    const { publicClient, walletClient, account } = getRefereeClient();
    const balanceCheck = await enforceRefereeBalanceCap(
      publicClient,
      account.address,
      `${input.sourceContext}:${dare.id}`
    );

    if (!balanceCheck.allowed) {
      await markDarePendingPayout(dare.id, input);
      return {
        status: 'PENDING_PAYOUT',
        dare: await prisma.dare.findUniqueOrThrow({ where: { id: dare.id } }),
        pendingReason: `Referee balance cap exceeded (${balanceCheck.balanceEth} ETH). Payout has been queued for retry.`,
        payout: {
          streamer: payout.streamer,
          house: payout.house,
          referrer: payout.referrer,
        },
      };
    }

    try {
      const hash = await walletClient.writeContract({
        address: BOUNTY_CONTRACT_ADDRESS,
        abi: BOUNTY_ABI,
        functionName: 'verifyAndPayout',
        args: [BigInt(dare.onChainDareId)],
      });

      await waitForSuccessfulReceipt({
        publicClient,
        hash,
        context: `verifyAndPayout:${dare.id}`,
      });

      const finalized = await finalizeVerifiedDare({
        ...input,
        verifyTxHash: hash,
      });

      return {
        status: 'VERIFIED',
        dare: finalized.dare,
        txHash: hash,
        payout: finalized.payout,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Contract call failed';
      console.error(`[DARE_APPROVAL] On-chain payout failed for ${dare.id}: ${message}`);
      await markDarePendingPayout(dare.id, input);
      return {
        status: 'PENDING_PAYOUT',
        dare: await prisma.dare.findUniqueOrThrow({ where: { id: dare.id } }),
        pendingReason: 'Proof approved but on-chain payout failed. It has been queued for retry.',
        payout: {
          streamer: payout.streamer,
          house: payout.house,
          referrer: payout.referrer,
        },
      };
    }
  }

  const finalized = await finalizeVerifiedDare(input);
  return {
    status: 'VERIFIED',
    dare: finalized.dare,
    txHash: null,
    payout: finalized.payout,
  };
}
