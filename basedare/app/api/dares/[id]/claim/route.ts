import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isAddress } from 'viem';

// ============================================================================
// CLAIM DARE API - For @everyone open dares
// POST /api/dares/[id]/claim - Claim a dare to attempt it
// DELETE /api/dares/[id]/claim - Release a claim (give up)
// ============================================================================

const CLAIM_DURATION_HOURS = 24;

const ClaimSchema = z.object({
  walletAddress: z.string().refine(isAddress, 'Invalid wallet address'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dareId } = await params;
    const body = await request.json();
    const validation = ClaimSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { walletAddress } = validation.data;
    const lowerWallet = walletAddress.toLowerCase();

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

    // Check if it's an open dare (no streamerHandle = @everyone)
    if (dare.streamerHandle) {
      return NextResponse.json(
        { success: false, error: 'This dare is targeted at a specific creator, not open for claiming' },
        { status: 400 }
      );
    }

    // Check if dare is in a claimable status
    if (dare.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Dare is not available for claiming (status: ${dare.status})` },
        { status: 400 }
      );
    }

    // Check if already claimed by someone else (and claim hasn't expired)
    if (dare.claimedBy && dare.claimExpiresAt) {
      const now = new Date();
      if (dare.claimExpiresAt > now) {
        if (dare.claimedBy.toLowerCase() === lowerWallet) {
          // Already claimed by this user
          return NextResponse.json({
            success: true,
            data: {
              message: 'You have already claimed this dare',
              dareId: dare.id,
              claimedBy: dare.claimedBy,
              claimedAt: dare.claimedAt,
              claimExpiresAt: dare.claimExpiresAt,
              alreadyClaimed: true,
            },
          });
        }
        // Claimed by someone else
        return NextResponse.json(
          {
            success: false,
            error: 'This dare is already claimed by another user',
            claimExpiresAt: dare.claimExpiresAt,
          },
          { status: 400 }
        );
      }
      // Claim has expired, we can allow a new claim
    }

    // Calculate claim expiry (24 hours from now)
    const claimedAt = new Date();
    const claimExpiresAt = new Date(claimedAt.getTime() + CLAIM_DURATION_HOURS * 60 * 60 * 1000);

    // Claim the dare
    const updatedDare = await prisma.dare.update({
      where: { id: dareId },
      data: {
        claimedBy: lowerWallet,
        claimedAt,
        claimExpiresAt,
        targetWalletAddress: lowerWallet, // Set target wallet for payout
      },
    });

    console.log(`[CLAIM] Dare ${dareId} claimed by ${lowerWallet} until ${claimExpiresAt.toISOString()}`);

    return NextResponse.json({
      success: true,
      data: {
        message: `Dare claimed! You have ${CLAIM_DURATION_HOURS} hours to submit proof.`,
        dareId: updatedDare.id,
        title: updatedDare.title,
        bounty: updatedDare.bounty,
        claimedBy: updatedDare.claimedBy,
        claimedAt: updatedDare.claimedAt,
        claimExpiresAt: updatedDare.claimExpiresAt,
        hoursRemaining: CLAIM_DURATION_HOURS,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CLAIM] Failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Release a claim (give up on the dare)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dareId } = await params;
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress || !isAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Valid wallet address required' },
        { status: 400 }
      );
    }

    const lowerWallet = walletAddress.toLowerCase();

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

    // Check if claimed by this user
    if (!dare.claimedBy || dare.claimedBy.toLowerCase() !== lowerWallet) {
      return NextResponse.json(
        { success: false, error: 'You have not claimed this dare' },
        { status: 400 }
      );
    }

    // Can only release if no proof submitted yet
    if (dare.videoUrl) {
      return NextResponse.json(
        { success: false, error: 'Cannot release claim after submitting proof' },
        { status: 400 }
      );
    }

    // Release the claim
    const updatedDare = await prisma.dare.update({
      where: { id: dareId },
      data: {
        claimedBy: null,
        claimedAt: null,
        claimExpiresAt: null,
        targetWalletAddress: null,
      },
    });

    console.log(`[CLAIM] Dare ${dareId} released by ${lowerWallet}`);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Claim released. The dare is now available for others.',
        dareId: updatedDare.id,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CLAIM] Release failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
