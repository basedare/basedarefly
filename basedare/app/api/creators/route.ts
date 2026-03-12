import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/creators
 * Returns a list of active streamers for the /streamers page.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tagFilter = searchParams.get('tag')?.trim().toLowerCase();

        const streamers = await prisma.streamerTag.findMany({
            where: {
                status: { in: ['ACTIVE', 'VERIFIED'] },
                ...(tagFilter ? { tags: { has: tagFilter } } : {}),
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
                bio: true,
                followerCount: true,
                tags: true,
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
