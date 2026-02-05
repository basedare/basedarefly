import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAddress } from 'viem';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('includeAll') === 'true';
    const includeExpired = searchParams.get('includeExpired') === 'true';
    const onlyExpired = searchParams.get('onlyExpired') === 'true';
    const onlyOpen = searchParams.get('onlyOpen') === 'true';
    const userAddress = searchParams.get('userAddress');
    const role = searchParams.get('role'); // 'staker' | 'creator' | undefined (both)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    const now = new Date();

    // Handle open bounties filter - open dares have null or @open/@everyone streamerHandle
    if (onlyOpen) {
      where.OR = [
        { streamerHandle: null },
        { streamerHandle: { in: ['@open', 'open', '@everyone', 'everyone'], mode: 'insensitive' } },
      ];
    }

    // Handle expired filter modes
    if (onlyExpired) {
      // Show ONLY expired dares
      where.AND = [{
        OR: [
          { status: 'EXPIRED' },
          { expiresAt: { lt: now } },
        ],
      }];
    } else if (!includeExpired && !includeAll) {
      // Default: EXCLUDE expired dares (hide status EXPIRED and past expiresAt)
      where.AND = [{
        NOT: {
          OR: [
            { status: 'EXPIRED' },
            { expiresAt: { lt: now } },
          ],
        },
      }];
      // Also filter to active statuses only
      where.status = { in: ['VERIFIED', 'PENDING', 'AWAITING_CLAIM', 'PENDING_REVIEW'] };
    } else if (!includeAll) {
      // includeExpired but not includeAll - filter by status but allow expired
      where.status = { in: ['VERIFIED', 'PENDING', 'AWAITING_CLAIM', 'PENDING_REVIEW', 'EXPIRED'] };
    }

    // Filter by user address if provided and valid
    if (userAddress && isAddress(userAddress)) {
      const lowerAddress = userAddress.toLowerCase();

      if (role === 'staker') {
        // Only dares I funded
        where.stakerAddress = lowerAddress;
      } else if (role === 'creator') {
        // Only dares targeting me
        where.targetWalletAddress = lowerAddress;
      } else {
        // Both: dares I funded OR dares targeting me
        where.OR = [
          { stakerAddress: lowerAddress },
          { targetWalletAddress: lowerAddress },
        ];
      }
    }

    // Fetch dares from database
    const dares = await prisma.dare.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit results for performance
    });

    // If includeAll (Dashboard mode), return full dare objects
    if (includeAll) {
      return NextResponse.json(dares);
    }

    // Otherwise, format for the public feed (legacy format)
    // Also mark expired dares based on expiresAt for frontend display
    const formattedDares = dares.map(dare => {
      const isExpiredByDate = dare.expiresAt && new Date(dare.expiresAt) < now;
      const effectiveStatus = isExpiredByDate ? 'EXPIRED' : dare.status;

      return {
        id: dare.id,
        description: dare.title,
        stake_amount: dare.bounty,
        streamer_name: dare.streamerHandle,
        status: effectiveStatus,
        video_url: dare.videoUrl,
        expires_at: dare.expiresAt?.toISOString() || null,
        short_id: dare.shortId || dare.id.slice(0, 8),
        image_url: "",
      };
    });

    return NextResponse.json(formattedDares);
  } catch (error) {
    console.error("Database fetch error:", error);
    return NextResponse.json({ error: 'Failed to fetch dares' }, { status: 500 });
  }
}
