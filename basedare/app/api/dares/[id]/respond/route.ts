import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { findPrimaryCreatorTagForWallet } from '@/lib/creator-tag-resolver';
import { getAuthorizedDareResponseWallet } from '@/lib/dare-response-auth-server';
import {
  DARE_STATUS_DECLINED,
  DARE_STATUS_PENDING_ACCEPTANCE,
} from '@/lib/dare-status';
import { notifyTargetedDareResponse } from '@/lib/dare-notifications';

const RespondSchema = z.object({
  action: z.enum(['ACCEPT', 'DECLINE']),
  walletAddress: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dareId } = await params;
    const body = await request.json();
    const validation = RespondSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const dare = await prisma.dare.findUnique({
      where: { id: dareId },
      select: {
        id: true,
        shortId: true,
        title: true,
        status: true,
        targetWalletAddress: true,
        claimedBy: true,
        claimedAt: true,
        stakerAddress: true,
        streamerHandle: true,
      },
    });

    if (!dare) {
      return NextResponse.json({ success: false, error: 'Dare not found' }, { status: 404 });
    }

    const authorizedWallet = await getAuthorizedDareResponseWallet(request, {
      dareId,
      authorizedWallets: [dare.targetWalletAddress, dare.claimedBy],
    });

    if (!authorizedWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = validation.data;
    const responderTag = await findPrimaryCreatorTagForWallet(authorizedWallet);

    if (action === 'ACCEPT' && dare.status === 'PENDING' && dare.claimedBy?.toLowerCase() === authorizedWallet) {
      return NextResponse.json({
        success: true,
        data: {
          dareId: dare.id,
          status: dare.status,
          message: 'Dare already accepted.',
        },
      });
    }

    if (action === 'DECLINE' && dare.status === DARE_STATUS_DECLINED) {
      return NextResponse.json({
        success: true,
        data: {
          dareId: dare.id,
          status: dare.status,
          message: 'Dare already declined.',
        },
      });
    }

    if (dare.status !== DARE_STATUS_PENDING_ACCEPTANCE) {
      return NextResponse.json(
        {
          success: false,
          error: `Dare cannot be responded to in status ${dare.status}`,
        },
        { status: 400 }
      );
    }

    const accepted = action === 'ACCEPT';
    const updatedDare = await prisma.dare.update({
      where: { id: dareId },
      data: accepted
        ? {
            status: 'PENDING',
            claimedBy: authorizedWallet,
            claimedAt: new Date(),
          }
        : {
            status: DARE_STATUS_DECLINED,
            claimedBy: null,
            claimedAt: null,
          },
      select: {
        id: true,
        shortId: true,
        status: true,
        claimedBy: true,
        claimedAt: true,
      },
    });

    await notifyTargetedDareResponse({
      walletAddress: dare.stakerAddress,
      title: dare.title,
      shortId: dare.shortId || dare.id,
      action,
      responderTag: responderTag?.tag || dare.streamerHandle,
    });

    return NextResponse.json({
      success: true,
      data: {
        dareId: updatedDare.id,
        status: updatedDare.status,
        claimedBy: updatedDare.claimedBy,
        claimedAt: updatedDare.claimedAt?.toISOString() || null,
        message: accepted ? 'Dare accepted. Proof is now unlocked.' : 'Dare declined.',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DARE RESPONSE] Failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
