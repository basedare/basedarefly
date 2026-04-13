import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeCreatorHandle } from '@/lib/creator-stats';

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
                tags: true,
            },
        });

        const verifiedDareTotals = await prisma.dare.groupBy({
            by: ['streamerHandle'],
            where: {
                status: 'VERIFIED',
                streamerHandle: { not: null },
            },
            _sum: { bounty: true },
            _count: { id: true },
        });

        const dareMetrics = new Map<string, { totalEarned: number; completedDares: number }>();
        verifiedDareTotals.forEach((entry) => {
            const normalizedHandle = normalizeCreatorHandle(entry.streamerHandle);
            if (!normalizedHandle) return;

            const current = dareMetrics.get(normalizedHandle) || { totalEarned: 0, completedDares: 0 };
            current.totalEarned += entry._sum.bounty || 0;
            current.completedDares += entry._count.id;
            dareMetrics.set(normalizedHandle, current);
        });

        const hydratedStreamers = streamers
            .map((streamer) => {
                const metrics = dareMetrics.get(normalizeCreatorHandle(streamer.tag) || '');
                return {
                    ...streamer,
                    totalEarned: Math.max(streamer.totalEarned, metrics?.totalEarned ?? 0),
                    completedDares: Math.max(streamer.completedDares, metrics?.completedDares ?? 0),
                };
            })
            .sort((left, right) => right.totalEarned - left.totalEarned);

        return NextResponse.json({
            success: true,
            data: hydratedStreamers,
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to fetch creators';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
