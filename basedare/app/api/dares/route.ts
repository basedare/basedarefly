import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAddress } from 'viem';

function toPublicDare(dare: {
  id: string;
  title: string;
  bounty: number;
  streamerHandle: string | null;
  status: string;
  videoUrl: string | null;
  expiresAt: Date | null;
  shortId: string | null;
  createdAt: Date;
  claimDeadline: Date | null;
}): {
  id: string;
  title: string;
  bounty: number;
  streamerHandle: string | null;
  status: string;
  videoUrl: string | null;
  expiresAt: string | null;
  shortId: string;
  createdAt: string;
  awaitingClaim: boolean;
  claimDeadline: string | null;
} {
  return {
    id: dare.id,
    title: dare.title,
    bounty: dare.bounty,
    streamerHandle: dare.streamerHandle,
    status: dare.status,
    videoUrl: dare.videoUrl,
    expiresAt: dare.expiresAt?.toISOString() || null,
    shortId: dare.shortId || dare.id.slice(0, 8),
    createdAt: dare.createdAt.toISOString(),
    awaitingClaim: dare.status === 'AWAITING_CLAIM',
    claimDeadline: dare.claimDeadline?.toISOString() || null,
  };
}

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
      // Default wall behavior: keep all created dares visible until expiry.
      // We only exclude explicit EXPIRED status or dares past expiresAt.
      where.AND = [{
        NOT: {
          OR: [
            { status: 'EXPIRED' },
            { expiresAt: { lt: now } },
          ],
        },
      }];
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

    // If includeAll (Dashboard mode), return public-safe dare objects
    if (includeAll) {
      return NextResponse.json(dares.map(toPublicDare));
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
