import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// ============================================================================
// ADMIN CLAIM REQUESTS API
// GET - List pending claim requests
// PUT - Approve or reject a claim request
// ============================================================================

// Moderator authentication (uses moderator wallet from env)
const MODERATOR_WALLETS = process.env.MODERATOR_WALLETS?.split(',').map((w) => w.trim().toLowerCase()) || [];

// Debug: Log moderator config on startup
console.log(`[CLAIMS] Config: ${MODERATOR_WALLETS.length} moderator wallets configured`);

function isModerator(request: NextRequest): string | null {
  const walletHeader = request.headers.get('x-moderator-wallet');
  if (!walletHeader) {
    console.log('[CLAIMS] Auth failed: no wallet header');
    return null;
  }

  const lowerWallet = walletHeader.toLowerCase();
  const maskedWallet = `${lowerWallet.slice(0, 6)}...${lowerWallet.slice(-4)}`;
  const isInList = MODERATOR_WALLETS.includes(lowerWallet);
  console.log(`[CLAIMS] Auth check: wallet=${maskedWallet}, inList=${isInList}, listSize=${MODERATOR_WALLETS.length}`);

  if (isInList) {
    return lowerWallet;
  }
  return null;
}

// ============================================================================
// GET /api/admin/claims - List pending claim requests
// ============================================================================

export async function GET(request: NextRequest) {
  const moderatorWallet = isModerator(request);
  if (!moderatorWallet) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';

    // Fetch dares with pending claim requests
    const dares = await prisma.dare.findMany({
      where: status === 'ALL'
        ? { claimRequestStatus: { not: null } }
        : { claimRequestStatus: status },
      orderBy: { claimRequestedAt: 'asc' },
      select: {
        id: true,
        shortId: true,
        title: true,
        bounty: true,
        streamerHandle: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        claimRequestWallet: true,
        claimRequestTag: true,
        claimRequestedAt: true,
        claimRequestStatus: true,
      },
    });

    // Get counts
    const counts = await prisma.dare.groupBy({
      by: ['claimRequestStatus'],
      where: { claimRequestStatus: { not: null } },
      _count: true,
    });

    const countMap = counts.reduce(
      (acc, item) => {
        if (item.claimRequestStatus) {
          acc[item.claimRequestStatus] = item._count;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      data: {
        claims: dares,
        counts: {
          pending: countMap['PENDING'] || 0,
          approved: countMap['APPROVED'] || 0,
          rejected: countMap['REJECTED'] || 0,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ============================================================================
// PUT /api/admin/claims - Approve or reject a claim request
// ============================================================================

const ClaimDecisionSchema = z.object({
  dareId: z.string(),
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().max(500).optional(),
});

export async function PUT(request: NextRequest) {
  const moderatorWallet = isModerator(request);
  if (!moderatorWallet) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = ClaimDecisionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { dareId, decision, reason } = validation.data;

    // Fetch the dare
    const dare = await prisma.dare.findUnique({
      where: { id: dareId },
    });

    if (!dare) {
      return NextResponse.json({ success: false, error: 'Dare not found' }, { status: 404 });
    }

    if (dare.claimRequestStatus !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'No pending claim request for this dare' },
        { status: 400 }
      );
    }

    if (!dare.claimRequestWallet || !dare.claimRequestTag) {
      return NextResponse.json(
        { success: false, error: 'Invalid claim request data' },
        { status: 400 }
      );
    }

    if (decision === 'APPROVE') {
      // Approve: Update streamerHandle to claimer's tag, set targetWalletAddress
      const updatedDare = await prisma.dare.update({
        where: { id: dareId },
        data: {
          streamerHandle: dare.claimRequestTag,
          targetWalletAddress: dare.claimRequestWallet,
          claimedBy: dare.claimRequestWallet,
          claimedAt: new Date(),
          claimRequestStatus: 'APPROVED',
          moderatorAddress: moderatorWallet,
          moderatedAt: new Date(),
          moderatorNote: reason || 'Claim approved',
        },
      });

      console.log(`[CLAIM APPROVED] Dare ${dareId} assigned to ${dare.claimRequestTag} by moderator ${moderatorWallet}`);

      // TODO: Send notification to the claimer (email, push, etc.)
      // For now, just log it

      return NextResponse.json({
        success: true,
        message: `Claim approved! Dare assigned to ${dare.claimRequestTag}`,
        data: {
          dareId: updatedDare.id,
          streamerHandle: updatedDare.streamerHandle,
          targetWalletAddress: updatedDare.targetWalletAddress,
        },
      });
    } else {
      // Reject: Clear claim request fields
      await prisma.dare.update({
        where: { id: dareId },
        data: {
          claimRequestWallet: null,
          claimRequestTag: null,
          claimRequestedAt: null,
          claimRequestStatus: 'REJECTED',
          moderatorAddress: moderatorWallet,
          moderatedAt: new Date(),
          moderatorNote: reason || 'Claim rejected',
        },
      });

      console.log(`[CLAIM REJECTED] Dare ${dareId} claim by ${dare.claimRequestTag} rejected by moderator ${moderatorWallet}`);

      return NextResponse.json({
        success: true,
        message: `Claim request rejected`,
        data: { dareId },
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN CLAIMS] Decision failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
