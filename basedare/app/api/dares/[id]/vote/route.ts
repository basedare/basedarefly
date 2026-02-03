import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isAddress } from 'viem';

// ============================================================================
// COMMUNITY VOTING API
// Cast votes on dares with proof submitted, track voter points
// ============================================================================

const VOTE_THRESHOLD = 10; // Minimum votes before auto-resolution
const CONSENSUS_PERCENT = 60; // >60% one way triggers resolution
const POINTS_PER_VOTE = 5; // Points awarded for casting a vote
const CORRECT_VOTE_BONUS = 15; // Bonus points for being on winning side

// ============================================================================
// POST /api/dares/[id]/vote - Cast or change a vote
// ============================================================================

const VoteSchema = z.object({
  walletAddress: z.string().refine((addr) => isAddress(addr), {
    message: 'Invalid wallet address',
  }),
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

    const { walletAddress, voteType } = validation.data;
    const normalizedAddress = walletAddress.toLowerCase();

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

    // Check if threshold met for auto-resolution
    let resolved = false;
    let resolutionOutcome: 'VERIFIED' | 'FAILED' | null = null;

    if (totalVotes >= VOTE_THRESHOLD) {
      const approvePercent = (approveCount / totalVotes) * 100;
      const rejectPercent = (rejectCount / totalVotes) * 100;

      if (approvePercent > CONSENSUS_PERCENT) {
        // Community approved - mark as VERIFIED
        await prisma.dare.update({
          where: { id: dareId },
          data: {
            status: 'VERIFIED',
            verifiedAt: new Date(),
            verifyConfidence: approvePercent,
          },
        });
        resolved = true;
        resolutionOutcome = 'VERIFIED';
        await awardCorrectVoters(dareId, 'APPROVE');
      } else if (rejectPercent > CONSENSUS_PERCENT) {
        // Community rejected - mark as FAILED
        await prisma.dare.update({
          where: { id: dareId },
          data: {
            status: 'FAILED',
            verifyConfidence: rejectPercent,
          },
        });
        resolved = true;
        resolutionOutcome = 'FAILED';
        await awardCorrectVoters(dareId, 'REJECT');
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
        resolved,
        resolutionOutcome,
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

// Award bonus points to voters who picked the winning side
async function awardCorrectVoters(dareId: string, winningVoteType: 'APPROVE' | 'REJECT') {
  try {
    // Get all voters who voted correctly
    const correctVoters = await prisma.vote.findMany({
      where: {
        dareId,
        voteType: winningVoteType,
      },
      select: { walletAddress: true },
    });

    // Award bonus points and update streaks
    for (const voter of correctVoters) {
      const voterPoints = await prisma.voterPoints.findUnique({
        where: { walletAddress: voter.walletAddress },
      });

      const currentStreak = voterPoints?.streak || 0;
      const streakBonus = Math.min(currentStreak * 2, 50); // Cap streak bonus at 50
      const totalBonus = CORRECT_VOTE_BONUS + streakBonus;

      await prisma.voterPoints.upsert({
        where: { walletAddress: voter.walletAddress },
        create: {
          walletAddress: voter.walletAddress,
          totalPoints: totalBonus,
          correctVotes: 1,
          streak: 1,
        },
        update: {
          totalPoints: { increment: totalBonus },
          correctVotes: { increment: 1 },
          streak: { increment: 1 },
        },
      });
    }

    // Reset streak for incorrect voters
    const incorrectVoters = await prisma.vote.findMany({
      where: {
        dareId,
        voteType: winningVoteType === 'APPROVE' ? 'REJECT' : 'APPROVE',
      },
      select: { walletAddress: true },
    });

    for (const voter of incorrectVoters) {
      await prisma.voterPoints.updateMany({
        where: { walletAddress: voter.walletAddress },
        data: { streak: 0 },
      });
    }

    console.log(`[VOTE] Awarded ${correctVoters.length} correct voters for dare ${dareId}`);
  } catch (error) {
    console.error('[VOTE] Failed to award correct voters:', error);
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

    // Get user's vote if wallet provided
    let userVote: string | null = null;
    if (wallet && isAddress(wallet)) {
      const vote = await prisma.vote.findUnique({
        where: {
          dareId_walletAddress: {
            dareId,
            walletAddress: wallet,
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
