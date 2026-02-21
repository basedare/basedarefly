import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/creators
 * Returns a list of active streamers for the /streamers page.
 */
export async function GET(request: NextRequest) {
    try {
        const streamers = await prisma.streamerTag.findMany({
            where: {
                status: 'ACTIVE',
            },
            orderBy: {
                totalEarned: 'desc',
            },
            select: {
                tag: true,
                twitterHandle: true,
                twitchHandle: true,
                status: true,
                totalEarned: true,
                completedDares: true,
                walletAddress: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: streamers,
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to fetch creators';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
