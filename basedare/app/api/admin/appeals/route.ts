import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// ============================================================================
// ADMIN APPEALS API
// For reviewing and resolving appeals submitted by users
// ============================================================================

// Admin authentication - REQUIRES env var, no fallback
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!ADMIN_SECRET || ADMIN_SECRET.length < 32) {
  console.error('[SECURITY] ADMIN_SECRET must be set and at least 32 characters');
}

function isAdmin(request: NextRequest): boolean {
  if (!ADMIN_SECRET || ADMIN_SECRET.length < 32) {
    console.error('[SECURITY] Admin access denied - ADMIN_SECRET not properly configured');
    return false;
  }

  const authHeader = request.headers.get('x-admin-secret');
  if (!authHeader) return false;

  // Constant-time comparison to prevent timing attacks
  if (authHeader.length !== ADMIN_SECRET.length) return false;

  let result = 0;
  for (let i = 0; i < authHeader.length; i++) {
    result |= authHeader.charCodeAt(i) ^ ADMIN_SECRET.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================================
// GET /api/admin/appeals - List all appeals
// ============================================================================

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';

    const appeals = await prisma.dare.findMany({
      where: {
        appealStatus: status === 'ALL' ? { not: null } : status,
      },
      orderBy: { appealedAt: 'desc' },
      select: {
        id: true,
        shortId: true,
        title: true,
        bounty: true,
        streamerHandle: true,
        status: true,
        appealStatus: true,
        appealReason: true,
        appealedAt: true,
        verifyConfidence: true,
        proofHash: true,
        videoUrl: true,
        stakerAddress: true,
        createdAt: true,
        isSimulated: true,
      },
    });

    // Get counts for each status
    const counts = await prisma.dare.groupBy({
      by: ['appealStatus'],
      _count: true,
      where: {
        appealStatus: { not: null },
      },
    });

    const countMap = counts.reduce((acc, item) => {
      if (item.appealStatus) {
        acc[item.appealStatus] = item._count;
      }
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        appeals,
        counts: {
          pending: countMap['PENDING'] || 0,
          approved: countMap['APPROVED'] || 0,
          rejected: countMap['REJECTED'] || 0,
          none: countMap['NONE'] || 0,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN] Failed to fetch appeals:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/admin/appeals - Resolve an appeal
// ============================================================================

const ResolveAppealSchema = z.object({
  dareId: z.string().min(1, 'Dare ID is required'),
  decision: z.enum(['APPROVED', 'REJECTED']),
  adminNote: z.string().max(500).optional(),
  overrideVotes: z.boolean().optional().default(false),
});

export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validation = ResolveAppealSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { dareId, decision, adminNote, overrideVotes } = validation.data;

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

    if (dare.appealStatus !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'This appeal is not pending' },
        { status: 400 }
      );
    }

    // Update the dare based on decision
    if (decision === 'APPROVED') {
      // Approve = Mark as VERIFIED, clear appeal
      await prisma.dare.update({
        where: { id: dareId },
        data: {
          status: 'VERIFIED',
          appealStatus: 'APPROVED',
          verifiedAt: new Date(),
          // Note: In production, you'd trigger on-chain payout here
        },
      });

      // If overriding votes, award points to APPROVE voters
      if (overrideVotes) {
        await awardVotersOnOverride(dareId, 'APPROVE');
        console.log(`[ADMIN] Vote override: awarded APPROVE voters for dare ${dareId}`);
      }

      console.log(`[ADMIN] Appeal APPROVED for dare ${dareId} - "${dare.title}"${overrideVotes ? ' (override)' : ''}`);
      if (adminNote) console.log(`[ADMIN] Note: ${adminNote}`);

      return NextResponse.json({
        success: true,
        data: {
          dareId,
          decision: 'APPROVED',
          overrideVotes,
          message: 'Appeal approved. Dare marked as verified.',
          note: 'Manual payout may be required if on-chain payout failed.',
        },
      });
    } else {
      // Reject = Keep as FAILED, mark appeal rejected
      await prisma.dare.update({
        where: { id: dareId },
        data: {
          appealStatus: 'REJECTED',
        },
      });

      // If overriding votes, award points to REJECT voters
      if (overrideVotes) {
        await awardVotersOnOverride(dareId, 'REJECT');
        console.log(`[ADMIN] Vote override: awarded REJECT voters for dare ${dareId}`);
      }

      console.log(`[ADMIN] Appeal REJECTED for dare ${dareId} - "${dare.title}"${overrideVotes ? ' (override)' : ''}`);
      if (adminNote) console.log(`[ADMIN] Note: ${adminNote}`);

      return NextResponse.json({
        success: true,
        data: {
          dareId,
          decision: 'REJECTED',
          overrideVotes,
          message: 'Appeal rejected. Dare remains failed.',
        },
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN] Failed to resolve appeal:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper: Award voters when admin overrides community decision
// ============================================================================

const CORRECT_VOTE_BONUS = 15;

async function awardVotersOnOverride(dareId: string, winningVoteType: 'APPROVE' | 'REJECT') {
  try {
    // Get all voters who voted correctly (matching admin decision)
    const correctVoters = await prisma.vote.findMany({
      where: {
        dareId,
        voteType: winningVoteType,
      },
      select: { walletAddress: true },
    });

    // Award bonus points and update streaks for correct voters
    for (const voter of correctVoters) {
      const voterPoints = await prisma.voterPoints.findUnique({
        where: { walletAddress: voter.walletAddress },
      });

      const currentStreak = voterPoints?.streak || 0;
      const streakBonus = Math.min(currentStreak * 2, 50);
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

    console.log(`[ADMIN] Override: awarded ${correctVoters.length} correct voters, reset ${incorrectVoters.length} incorrect voters`);
  } catch (error) {
    console.error('[ADMIN] Failed to award voters on override:', error);
  }
}
