import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { isAddress } from 'viem';
import { authOptions } from '@/lib/auth-options';
import { alertClaimRequestSubmission } from '@/lib/telegram';
import { findPrimaryCreatorTagForWallet } from '@/lib/creator-tag-resolver';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';

// ============================================================================
// CLAIM DARE API - For @open dares (moderated claim request flow)
// POST /api/dares/[id]/claim - Request to claim an open dare (requires mod approval)
// DELETE /api/dares/[id]/claim - Withdraw a pending claim request
// ============================================================================

type WalletSession = {
  token?: string;
  walletAddress?: string;
  user?: {
    walletAddress?: string | null;
  } | null;
};

const ClaimSchema = z.object({
  walletAddress: z.string().optional(),
});

function normalizeWallet(value: string | null | undefined): string | null {
  if (!value || !isAddress(value)) return null;
  return value.toLowerCase();
}

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
    const normalizedBodyWallet = normalizeWallet(walletAddress);
    const lowerWallet = await getAuthorizedWalletForRequest(request, {
      walletAddress: normalizedBodyWallet,
      action: 'dare:claim',
      resource: dareId,
    });

    if (!lowerWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has a verified tag
    const userTag = await findPrimaryCreatorTagForWallet(lowerWallet);

    if (!userTag) {
      return NextResponse.json(
        { success: false, error: 'You need a verified tag to claim dares. Visit /claim-tag to verify your identity.' },
        { status: 400 }
      );
    }

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

    // Check if it's an open dare (no streamerHandle or streamerHandle is @open)
    const isOpen = !dare.streamerHandle || dare.streamerHandle.toLowerCase() === '@open';
    if (!isOpen) {
      return NextResponse.json(
        { success: false, error: 'This dare is targeted at a specific creator, not open for claiming' },
        { status: 400 }
      );
    }

    // Check if dare is expired
    if (dare.expiresAt && new Date(dare.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This dare has expired' },
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

    // Check if there's already a pending claim request
    if (dare.claimRequestStatus === 'PENDING') {
      if (dare.claimRequestWallet?.toLowerCase() === lowerWallet) {
        return NextResponse.json({
          success: true,
          data: {
            message: 'You have already submitted a claim request for this dare',
            dareId: dare.id,
            claimRequestTag: dare.claimRequestTag,
            claimRequestedAt: dare.claimRequestedAt,
            claimRequestStatus: dare.claimRequestStatus,
            alreadyRequested: true,
          },
        });
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Another user has already requested to claim this dare. Please wait for moderator review.',
        },
        { status: 400 }
      );
    }

    // Submit claim request
    const updatedDare = await prisma.dare.update({
      where: { id: dareId },
      data: {
        claimRequestWallet: lowerWallet,
        claimRequestTag: userTag.tag,
        claimRequestedAt: new Date(),
        claimRequestStatus: 'PENDING',
      },
    });

    console.log(`[CLAIM REQUEST] Dare ${dareId} requested by ${userTag.tag} (${lowerWallet})`);

    void alertClaimRequestSubmission({
      dareId: updatedDare.id,
      shortId: updatedDare.shortId || updatedDare.id,
      title: updatedDare.title,
      bounty: updatedDare.bounty,
      claimTag: userTag.tag,
      walletAddress: lowerWallet,
    }).catch((err) => console.error('[TELEGRAM] Claim request alert failed:', err));

    return NextResponse.json({
      success: true,
      data: {
        message: 'Claim request submitted! A moderator will review and approve your request.',
        dareId: updatedDare.id,
        title: updatedDare.title,
        bounty: updatedDare.bounty,
        claimRequestTag: userTag.tag,
        claimRequestedAt: updatedDare.claimRequestedAt,
        claimRequestStatus: 'PENDING',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CLAIM REQUEST] Failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Withdraw a pending claim request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dareId } = await params;
    const sessionWallet = await getVerifiedSessionWallet(request);
    if (!sessionWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet')?.toLowerCase();

    if (walletAddress) {
      if (!isAddress(walletAddress)) {
        return NextResponse.json(
          { success: false, error: 'Invalid wallet address' },
          { status: 400 }
        );
      }

      if (walletAddress !== sessionWallet) {
        return NextResponse.json(
          { success: false, error: 'Wallet mismatch. Use authenticated session wallet.' },
          { status: 401 }
        );
      }
    }

    const lowerWallet = sessionWallet;

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

    // Check if there's a pending request by this user
    if (dare.claimRequestStatus !== 'PENDING' || dare.claimRequestWallet?.toLowerCase() !== lowerWallet) {
      return NextResponse.json(
        { success: false, error: 'You do not have a pending claim request for this dare' },
        { status: 400 }
      );
    }

    // Withdraw the request
    const updatedDare = await prisma.dare.update({
      where: { id: dareId },
      data: {
        claimRequestWallet: null,
        claimRequestTag: null,
        claimRequestedAt: null,
        claimRequestStatus: null,
      },
    });

    console.log(`[CLAIM REQUEST] Dare ${dareId} request withdrawn by ${lowerWallet}`);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Claim request withdrawn. The dare is now available for others.',
        dareId: updatedDare.id,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CLAIM REQUEST] Withdraw failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
