import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { isAddress } from 'viem';
import { authOptions } from '@/lib/auth-options';

// ============================================================================
// COMMUNITY VOTING API
// Cast votes on dares with proof submitted, track voter points
// ============================================================================

const VOTE_THRESHOLD = 10; // Minimum votes before auto-resolution
const CONSENSUS_PERCENT = 60; // >60% one way triggers resolution
const POINTS_PER_VOTE = 5; // Points awarded for casting a vote

type WalletSession = {
  token?: string;
  walletAddress?: string;
  user?: {
    walletAddress?: string | null;
  } | null;
};

async function getVerifiedSessionWallet(request: NextRequest): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as WalletSession | null;
  if (!session) return null;

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (session.token && (!bearerToken || bearerToken !== session.token)) {
    return null;
  }

  const wallet = session.walletAddress ?? session.user?.walletAddress ?? null;
  if (!wallet || !isAddress(wallet)) return null;

  return wallet.toLowerCase();
}

// ============================================================================
// POST /api/dares/[id]/vote - Cast or change a vote
// ============================================================================

const VoteSchema = z.object({
  walletAddress: z.string().optional(),
  voteType: z.enum(['APPROVE', 'REJECT']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dareId } = await params;

    if (!dareId) {
      return NextResponse.json(
        { success: false, error: 'Dare ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = VoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const sessionWallet = await getVerifiedSessionWallet(request);
    if (!sessionWallet) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { walletAddress, voteType } = validation.data;
    const normalizedBodyWallet = walletAddress?.toLowerCase();

    if (normalizedBodyWallet && normalizedBodyWallet !== sessionWallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet mismatch. Use authenticated session wallet.' },
        { status: 401 }
      );
    }

    const normalizedAddress = sessionWallet;

    // Verify dare exists and is votable
    const dare = await prisma.dare.findUnique({
      where: { id: dareId },
      select: {
        id: true,
        status: true,
        videoUrl: true,
        title: true,
      },
    });

    if (!dare) {
      return NextResponse.json(
        { success: false, error: 'Dare not found' },
        { status: 404 }
      );
    }

    // Only allow voting on dares with proof (videoUrl) that are pending
    const votableStatuses = ['PENDING', 'PENDING_REVIEW'];
    if (!votableStatuses.includes(dare.status) || !dare.videoUrl) {
      return NextResponse.json(
        { success: false, error: 'This dare is not available for voting' },
        { status: 400 }
      );
    }

    // Check if user already voted (to determine if this is a change)
    const existingVote = await prisma.vote.findUnique({
      where: {
        dareId_walletAddress: {
          dareId,
          walletAddress: normalizedAddress,
        },
      },
    });

    const isNewVote = !existingVote;
    const isChangingVote = existingVote && existingVote.voteType !== voteType;

    // Upsert the vote
    const vote = await prisma.vote.upsert({
      where: {
        dareId_walletAddress: {
          dareId,
          walletAddress: normalizedAddress,
        },
      },
      create: {
        dareId,
        walletAddress: normalizedAddress,
        voteType,
      },
      update: {
        voteType,
        updatedAt: new Date(),
      },
    });

    // Award points for new vote
    let pointsAwarded = 0;
    if (isNewVote) {
      pointsAwarded = POINTS_PER_VOTE;
      await prisma.voterPoints.upsert({
        where: { walletAddress: normalizedAddress },
        create: {
          walletAddress: normalizedAddress,
          totalPoints: POINTS_PER_VOTE,
          totalVotes: 1,
        },
        update: {
          totalPoints: { increment: POINTS_PER_VOTE },
          totalVotes: { increment: 1 },
        },
      });
    }

    // Get current vote counts
    const voteCounts = await prisma.vote.groupBy({
      by: ['voteType'],
      where: { dareId },
      _count: true,
    });

    const approveCount = voteCounts.find((v) => v.voteType === 'APPROVE')?._count || 0;
    const rejectCount = voteCounts.find((v) => v.voteType === 'REJECT')?._count || 0;
    const totalVotes = approveCount + rejectCount;

    // Check if threshold met for escalation into manual review
    let escalatedToReview = false;
    let reviewSignal: 'APPROVE' | 'REJECT' | 'MIXED' | null = null;

    if (totalVotes >= VOTE_THRESHOLD) {
      const approvePercent = (approveCount / totalVotes) * 100;
      const rejectPercent = (rejectCount / totalVotes) * 100;
      const strongestSignal = Math.max(approvePercent, rejectPercent);

      if (approvePercent > CONSENSUS_PERCENT) {
        // Community lean should inform manual review, not finalize payout.
        await prisma.dare.update({
          where: { id: dareId },
          data: {
            status: 'PENDING_REVIEW',
            verifyConfidence: strongestSignal,
          },
        });
        escalatedToReview = true;
        reviewSignal = 'APPROVE';
        console.log(`[VOTE] Dare ${dareId} reached community PASS consensus (${approvePercent.toFixed(1)}%) and was escalated to manual review`);
      } else if (rejectPercent > CONSENSUS_PERCENT) {
        // Community reject lean should also inform manual review, not finalize failure.
        await prisma.dare.update({
          where: { id: dareId },
          data: {
            status: 'PENDING_REVIEW',
            verifyConfidence: strongestSignal,
          },
        });
        escalatedToReview = true;
        reviewSignal = 'REJECT';
        console.log(`[VOTE] Dare ${dareId} reached community FAIL consensus (${rejectPercent.toFixed(1)}%) and was escalated to manual review`);
      } else {
        // No clear consensus - still escalate for moderator review once threshold is met
        await prisma.dare.update({
          where: { id: dareId },
          data: {
            status: 'PENDING_REVIEW',
            verifyConfidence: strongestSignal,
          },
        });
        escalatedToReview = true;
        reviewSignal = 'MIXED';
        console.log(`[VOTE] Dare ${dareId} flagged for moderator review (${approvePercent.toFixed(1)}% approve, ${rejectPercent.toFixed(1)}% reject)`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        voteId: vote.id,
        voteType: vote.voteType,
        isNewVote,
        isChangingVote,
        pointsAwarded,
        counts: {
          approve: approveCount,
          reject: rejectCount,
          total: totalVotes,
        },
        escalatedToReview,
        reviewSignal,
        threshold: {
          required: VOTE_THRESHOLD,
          consensusPercent: CONSENSUS_PERCENT,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VOTE] Failed to cast vote:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/dares/[id]/vote - Get vote counts and user's vote
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dareId } = await params;
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet')?.toLowerCase();
    const sessionWallet = await getVerifiedSessionWallet(request);

    if (wallet) {
      if (!isAddress(wallet)) {
        return NextResponse.json(
          { success: false, error: 'Invalid wallet address' },
          { status: 400 }
        );
      }

      if (!sessionWallet || wallet !== sessionWallet) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized wallet query' },
          { status: 401 }
        );
      }
    }

    if (!dareId) {
      return NextResponse.json(
        { success: false, error: 'Dare ID is required' },
        { status: 400 }
      );
    }

    // Verify dare exists
    const dare = await prisma.dare.findUnique({
      where: { id: dareId },
      select: { id: true, status: true },
    });

    if (!dare) {
      return NextResponse.json(
        { success: false, error: 'Dare not found' },
        { status: 404 }
      );
    }

    // Get vote counts
    const voteCounts = await prisma.vote.groupBy({
      by: ['voteType'],
      where: { dareId },
      _count: true,
    });

    const approveCount = voteCounts.find((v) => v.voteType === 'APPROVE')?._count || 0;
    const rejectCount = voteCounts.find((v) => v.voteType === 'REJECT')?._count || 0;
    const totalVotes = approveCount + rejectCount;

    // Get user's vote from authenticated session wallet only
    let userVote: string | null = null;
    const effectiveWallet = sessionWallet;
    if (effectiveWallet) {
      const vote = await prisma.vote.findUnique({
        where: {
          dareId_walletAddress: {
            dareId,
            walletAddress: effectiveWallet,
          },
        },
        select: { voteType: true },
      });
      userVote = vote?.voteType || null;
    }

    return NextResponse.json({
      success: true,
      data: {
        approve: approveCount,
        reject: rejectCount,
        total: totalVotes,
        userVote,
        dareStatus: dare.status,
        threshold: {
          required: VOTE_THRESHOLD,
          consensusPercent: CONSENSUS_PERCENT,
          met: totalVotes >= VOTE_THRESHOLD,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VOTE] Failed to get votes:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
