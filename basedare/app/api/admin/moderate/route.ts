import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { moderateDareDecision } from '@/lib/dare-moderation';
import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';

// ============================================================================
// ADMIN MODERATE API
// For moderators to make final decisions on dares after community voting
// ============================================================================

function ageInHours(timestamp: Date | null | undefined) {
  if (!timestamp) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60)));
}

function getPayoutQueueReason(dare: {
  onChainDareId: string | null;
  isSimulated: boolean;
  moderatedAt: Date | null;
}) {
  if (!dare.onChainDareId) {
    return 'Missing on-chain dare ID. Retry queue cannot settle until funding sync is repaired.';
  }

  if (dare.isSimulated) {
    return 'Simulated dare is waiting for the retry worker to mark it verified.';
  }

  if (dare.moderatedAt) {
    return 'Approved already. On-chain payout is queued for automatic retry.';
  }

  return 'Payout retry queued. Check referee wallet health and cron execution.';
}

// ============================================================================
// GET /api/admin/moderate - List dares ready for moderation
// ============================================================================

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // Fetch dares ready for moderation
    // - Has proof (videoUrl)
    // - Has enough votes OR is in PENDING_REVIEW status
    const dares = await prisma.dare.findMany({
      where: {
        OR: [
          { status: 'PENDING_REVIEW' },
          {
            status: 'PENDING',
            videoUrl: { not: null },
          },
        ],
      },
      orderBy: [{ bounty: 'desc' }, { createdAt: 'asc' }],
      take: limit,
      include: {
        votes: true,
        venue: {
          select: {
            slug: true,
            name: true,
            city: true,
            country: true,
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
        _count: { select: { votes: true } },
      },
    });

    const payoutBacklog = await prisma.dare.findMany({
      where: {
        status: 'PENDING_PAYOUT',
      },
      orderBy: [{ moderatedAt: 'asc' }, { updatedAt: 'asc' }],
      take: limit,
      select: {
        id: true,
        shortId: true,
        title: true,
        bounty: true,
        streamerHandle: true,
        status: true,
        updatedAt: true,
        moderatedAt: true,
        targetWalletAddress: true,
        onChainDareId: true,
        isSimulated: true,
        venue: {
          select: {
            slug: true,
            name: true,
            city: true,
            country: true,
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
      },
    });

    // Calculate vote summaries
    const daresWithVoteSummary = dares.map((dare) => {
      const approveVotes = dare.votes.filter((v) => v.voteType === 'APPROVE').length;
      const rejectVotes = dare.votes.filter((v) => v.voteType === 'REJECT').length;
      const totalVotes = dare.votes.length;
      const proofAgeHours = Math.max(
        0,
        Math.round((Date.now() - new Date(dare.updatedAt).getTime()) / (1000 * 60 * 60))
      );
      const readyForDecision = totalVotes >= dare.voteThreshold;
      const queueStage = dare.status === 'PENDING_REVIEW' ? 'REFEREE' : 'COMMUNITY';
      const priorityScore =
        (dare.status === 'PENDING_REVIEW' ? 100 : 0) +
        (readyForDecision ? 30 : 0) +
        (dare.linkedCampaign ? 20 : 0) +
        Math.min(proofAgeHours, 48) +
        Math.min(Math.round(dare.bounty / 25), 20);
      const priorityReason =
        dare.status === 'PENDING_REVIEW'
          ? 'Already escalated into referee review.'
          : readyForDecision
            ? 'Community voting reached threshold and needs a moderator decision.'
            : 'Proof is live in the community signal lane and aging toward review.';

      return {
        id: dare.id,
        shortId: dare.shortId,
        title: dare.title,
        bounty: dare.bounty,
        requireSentinel: dare.requireSentinel,
        sentinelVerified: dare.sentinelVerified,
        manualReviewNeeded: dare.manualReviewNeeded,
        streamerHandle: dare.streamerHandle,
        status: dare.status,
        videoUrl: dare.videoUrl,
        claimedBy: dare.claimedBy,
        targetWalletAddress: dare.targetWalletAddress,
        createdAt: dare.createdAt,
        updatedAt: dare.updatedAt,
        venue: dare.venue,
        linkedCampaign: dare.linkedCampaign
          ? {
              id: dare.linkedCampaign.id,
              title: dare.linkedCampaign.title,
              brandName: dare.linkedCampaign.brand?.name ?? null,
            }
          : null,
        votes: {
          approve: approveVotes,
          reject: rejectVotes,
          total: totalVotes,
          approvePercent: totalVotes > 0 ? Math.round((approveVotes / totalVotes) * 100) : 0,
        },
        readyForDecision,
        voteThreshold: dare.voteThreshold,
        proofAgeHours,
        queueStage,
        priorityScore,
        priorityReason,
      };
    });

    const sortedDares = daresWithVoteSummary.sort((left, right) => {
      if (right.priorityScore !== left.priorityScore) return right.priorityScore - left.priorityScore;
      return new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
    });

    const oldestProofHours = sortedDares.reduce((maxHours, dare) => Math.max(maxHours, dare.proofAgeHours), 0);
    const readyNowCount = sortedDares.filter((dare) => dare.status === 'PENDING_REVIEW' || dare.readyForDecision).length;
    const campaignBackedReadyCount = sortedDares.filter(
      (dare) => Boolean(dare.linkedCampaign) && (dare.status === 'PENDING_REVIEW' || dare.readyForDecision)
    ).length;
    const payoutBacklogItems = payoutBacklog.map((dare) => {
      const queuedHours = ageInHours(dare.moderatedAt ?? dare.updatedAt);

      return {
        id: dare.id,
        shortId: dare.shortId,
        title: dare.title,
        bounty: dare.bounty,
        streamerHandle: dare.streamerHandle,
        status: dare.status,
        targetWalletAddress: dare.targetWalletAddress,
        updatedAt: dare.updatedAt,
        moderatedAt: dare.moderatedAt,
        queuedHours,
        queueReason: getPayoutQueueReason(dare),
        onChainDareId: dare.onChainDareId,
        isSimulated: dare.isSimulated,
        venue: dare.venue,
        linkedCampaign: dare.linkedCampaign
          ? {
              id: dare.linkedCampaign.id,
              title: dare.linkedCampaign.title,
              brandName: dare.linkedCampaign.brand?.name ?? null,
            }
          : null,
      };
    });
    const payoutBacklogOldestHours = payoutBacklogItems.reduce(
      (maxHours, dare) => Math.max(maxHours, dare.queuedHours),
      0
    );
    const missingOnChainIdCount = payoutBacklogItems.filter((dare) => !dare.onChainDareId).length;

    return NextResponse.json({
      success: true,
      data: {
        dares: sortedDares,
        payoutBacklog: payoutBacklogItems,
        total: sortedDares.length,
        queueSummary: {
          readyNow: readyNowCount,
          oldestProofHours,
          campaignBackedReady: campaignBackedReadyCount,
        },
        payoutBacklogSummary: {
          total: payoutBacklogItems.length,
          oldestQueuedHours: payoutBacklogOldestHours,
          missingOnChainId: missingOnChainIdCount,
          campaignBacked: payoutBacklogItems.filter((dare) => Boolean(dare.linkedCampaign)).length,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MODERATE] List failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ============================================================================
// POST /api/admin/moderate - Make a moderation decision
// ============================================================================

const ModerateSchema = z.object({
  dareId: z.string().min(1, 'Dare ID required'),
  decision: z.enum(['APPROVE', 'REJECT']),
  note: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const body = await request.json();
    const validation = ModerateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { dareId, decision, note } = validation.data;

    // Fetch the dare
    const dare = await prisma.dare.findUnique({
      where: { id: dareId },
    });

    if (!dare) {
      return NextResponse.json(
        { success: false, error: 'Dare not found' },
        { status: 404 }
      );
    }

    // Check dare has proof
    if (!dare.videoUrl) {
      return NextResponse.json(
        { success: false, error: 'Cannot moderate dare without proof submission' },
        { status: 400 }
      );
    }

    // Check dare isn't already moderated
    if (dare.moderatorDecision) {
      return NextResponse.json(
        { success: false, error: `Dare already moderated: ${dare.moderatorDecision}` },
        { status: 400 }
      );
    }

    const moderationResult = await moderateDareDecision({
      dareId,
      decision,
      sourceContext: 'ADMIN_MODERATE',
      moderatorAddress: auth.walletAddress,
      note: note || null,
      rejectReason: note || null,
    });

    const newStatus = moderationResult.newStatus;
    const updatedDare = moderationResult.dare;
    const pendingReason = moderationResult.pendingReason;

    console.log(
      `[MODERATE] Dare ${dareId} ${decision} by ${auth.walletAddress}${note ? ` - ${note}` : ''}`
    );

    return NextResponse.json({
      success: true,
      data: {
        dareId: updatedDare.id,
        decision,
        newStatus,
        moderatedAt: updatedDare.moderatedAt,
        moderatorAddress: auth.walletAddress,
        note: updatedDare.moderatorNote,
        pendingReason,
        message:
          decision === 'APPROVE'
            ? newStatus === 'PENDING_PAYOUT'
              ? 'Dare approved. On-chain payout has been queued for retry.'
              : 'Dare approved and payout processed.'
            : 'Dare rejected. Funds will be refunded to backers.',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MODERATE] Decision failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
