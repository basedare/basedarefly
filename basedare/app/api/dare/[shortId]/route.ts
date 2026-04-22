import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { reconcileFundingDare } from '@/lib/bounty-reconciliation';
import { getStakerAvatarMap, resolveDareImageUrl } from '@/lib/dare-images';

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
    const reconciledDare = await reconcileFundingDare(dare);
    const stakerAvatarMap = await getStakerAvatarMap([reconciledDare.stakerAddress]);
    const imageUrl = resolveDareImageUrl(reconciledDare, stakerAvatarMap);

    return NextResponse.json({
      id: reconciledDare.id,
      shortId: reconciledDare.shortId || reconciledDare.id.slice(0, 8),
      title: reconciledDare.title,
      bounty: reconciledDare.bounty,
      upvoteCount: reconciledDare.upvoteCount ?? 0,
      streamerHandle: reconciledDare.streamerHandle,
      status: reconciledDare.status,
      expiresAt: reconciledDare.expiresAt?.toISOString() || null,
      videoUrl: reconciledDare.videoUrl,
      imageUrl,
      inviteToken: reconciledDare.inviteToken,
      createdAt: reconciledDare.createdAt.toISOString(),
      updatedAt: reconciledDare.updatedAt.toISOString(),
      claimedBy: reconciledDare.claimedBy,
      claimedAt: reconciledDare.claimedAt?.toISOString() || null,
      verifiedAt: reconciledDare.verifiedAt?.toISOString() || null,
      moderatedAt: reconciledDare.moderatedAt?.toISOString() || null,
      claimDeadline: reconciledDare.claimDeadline?.toISOString() || null,
      targetWalletAddress: reconciledDare.targetWalletAddress,
      claimRequestWallet: reconciledDare.claimRequestWallet,
      claimRequestTag: reconciledDare.claimRequestTag,
      claimRequestedAt: reconciledDare.claimRequestedAt?.toISOString() || null,
      claimRequestStatus: reconciledDare.claimRequestStatus,
      stakerAddress: reconciledDare.stakerAddress,
      requireSentinel: reconciledDare.requireSentinel,
      sentinelVerified: reconciledDare.sentinelVerified,
      awaitingClaim:
        reconciledDare.status === 'AWAITING_CLAIM' ||
        (!reconciledDare.streamerHandle && reconciledDare.status === 'PENDING' && !reconciledDare.targetWalletAddress),
    });
  } catch (error) {
    console.error('[API] Error fetching dare:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bounty' },
      { status: 500 }
    );
  }
}
