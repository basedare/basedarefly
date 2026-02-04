import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    const { shortId } = await params;

    // Try to find by shortId first
    let dare = await prisma.dare.findUnique({
      where: { shortId },
    });

    // Fallback: try to find by id if shortId not found (for legacy/mock data)
    if (!dare) {
      dare = await prisma.dare.findUnique({
        where: { id: shortId },
      });
    }

    if (!dare) {
      return NextResponse.json(
        { error: 'Bounty not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: dare.id,
      shortId: dare.shortId || dare.id.slice(0, 8),
      title: dare.title,
      bounty: dare.bounty,
      streamerHandle: dare.streamerHandle,
      status: dare.status,
      expiresAt: dare.expiresAt?.toISOString() || null,
      videoUrl: dare.videoUrl,
      createdAt: dare.createdAt.toISOString(),
      // Invite flow fields
      inviteToken: dare.inviteToken,
      claimDeadline: dare.claimDeadline?.toISOString() || null,
      targetWalletAddress: dare.targetWalletAddress,
      awaitingClaim: dare.status === 'AWAITING_CLAIM',
      // Claim request fields (for open dares)
      claimRequestWallet: dare.claimRequestWallet,
      claimRequestTag: dare.claimRequestTag,
      claimRequestedAt: dare.claimRequestedAt?.toISOString() || null,
      claimRequestStatus: dare.claimRequestStatus,
    });
  } catch (error) {
    console.error('[API] Error fetching dare:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bounty' },
      { status: 500 }
    );
  }
}
