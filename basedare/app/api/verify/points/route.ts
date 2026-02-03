import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAddress } from 'viem';

// ============================================================================
// VOTER POINTS API
// Returns voter's points, correct votes, streak, and rank
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!isAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    const normalizedAddress = wallet.toLowerCase();

    // Get voter's points
    const voterPoints = await prisma.voterPoints.findUnique({
      where: { walletAddress: normalizedAddress },
    });

    if (!voterPoints) {
      // Return default values for new voters
      return NextResponse.json({
        success: true,
        data: {
          walletAddress: normalizedAddress,
          totalPoints: 0,
          correctVotes: 0,
          totalVotes: 0,
          streak: 0,
          accuracy: 0,
          rank: null,
          isNewVoter: true,
        },
      });
    }

    // Calculate accuracy
    const accuracy =
      voterPoints.totalVotes > 0
        ? Math.round((voterPoints.correctVotes / voterPoints.totalVotes) * 100)
        : 0;

    // Calculate rank (1-indexed position by total points)
    const higherRankedCount = await prisma.voterPoints.count({
      where: {
        totalPoints: { gt: voterPoints.totalPoints },
      },
    });
    const rank = higherRankedCount + 1;

    // Get total number of voters for context
    const totalVoters = await prisma.voterPoints.count();

    return NextResponse.json({
      success: true,
      data: {
        walletAddress: voterPoints.walletAddress,
        totalPoints: voterPoints.totalPoints,
        correctVotes: voterPoints.correctVotes,
        totalVotes: voterPoints.totalVotes,
        streak: voterPoints.streak,
        accuracy,
        rank,
        totalVoters,
        isNewVoter: false,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VOTER POINTS] Failed to fetch points:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/verify/points/leaderboard - Get top voters
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const limit = Math.min(body.limit || 10, 100);

    const topVoters = await prisma.voterPoints.findMany({
      orderBy: { totalPoints: 'desc' },
      take: limit,
      select: {
        walletAddress: true,
        totalPoints: true,
        correctVotes: true,
        totalVotes: true,
        streak: true,
      },
    });

    const leaderboard = topVoters.map((voter, index) => ({
      rank: index + 1,
      walletAddress: voter.walletAddress,
      totalPoints: voter.totalPoints,
      correctVotes: voter.correctVotes,
      totalVotes: voter.totalVotes,
      streak: voter.streak,
      accuracy:
        voter.totalVotes > 0
          ? Math.round((voter.correctVotes / voter.totalVotes) * 100)
          : 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        leaderboard,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VOTER POINTS] Failed to fetch leaderboard:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
