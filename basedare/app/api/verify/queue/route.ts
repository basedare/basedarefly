import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

// ============================================================================
// VERIFY QUEUE API
// Returns dares ready for community voting
// ============================================================================

type QueueSession = {
  token?: string;
  walletAddress?: string;
  user?: {
    walletAddress?: string | null;
  } | null;
};

async function getVerifiedSessionWallet(request: NextRequest): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as QueueSession | null;
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const skip = parseInt(searchParams.get('skip') || '0');
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

    // Fetch dares that are ready for community voting:
    // - Status is PENDING or PENDING_REVIEW
    // - Has proof submitted (videoUrl is not null)
    const dares = await prisma.dare.findMany({
      where: {
        status: { in: ['PENDING', 'PENDING_REVIEW'] },
        videoUrl: { not: null },
      },
      orderBy: [
        { bounty: 'desc' }, // Higher bounties first
        { createdAt: 'asc' }, // Older submissions first within same bounty
      ],
      take: limit,
      skip,
      select: {
        id: true,
        shortId: true,
        title: true,
        bounty: true,
        streamerHandle: true,
        status: true,
        videoUrl: true,
        proofHash: true,
        createdAt: true,
        expiresAt: true,
        _count: {
          select: { votes: true },
        },
      },
    });

    // Get vote counts for each dare
    const daresWithVotes = await Promise.all(
      dares.map(async (dare) => {
        const voteCounts = await prisma.vote.groupBy({
          by: ['voteType'],
          where: { dareId: dare.id },
          _count: true,
        });

        const approveCount = voteCounts.find((v) => v.voteType === 'APPROVE')?._count || 0;
        const rejectCount = voteCounts.find((v) => v.voteType === 'REJECT')?._count || 0;

        // Get user's vote if wallet provided
        let userVote: string | null = null;
        if (wallet) {
          const vote = await prisma.vote.findUnique({
            where: {
              dareId_walletAddress: {
                dareId: dare.id,
                walletAddress: wallet,
              },
            },
            select: { voteType: true },
          });
          userVote = vote?.voteType || null;
        }

        return {
          id: dare.id,
          shortId: dare.shortId,
          title: dare.title,
          bounty: dare.bounty,
          streamerHandle: dare.streamerHandle,
          status: dare.status,
          videoUrl: dare.videoUrl,
          proofHash: dare.proofHash,
          createdAt: dare.createdAt,
          expiresAt: dare.expiresAt,
          votes: {
            approve: approveCount,
            reject: rejectCount,
            total: approveCount + rejectCount,
          },
          userVote,
        };
      })
    );

    // Get total count for pagination
    const totalCount = await prisma.dare.count({
      where: {
        status: { in: ['PENDING', 'PENDING_REVIEW'] },
        videoUrl: { not: null },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        dares: daresWithVotes,
        pagination: {
          total: totalCount,
          limit,
          skip,
          hasMore: skip + dares.length < totalCount,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VERIFY QUEUE] Failed to fetch queue:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
