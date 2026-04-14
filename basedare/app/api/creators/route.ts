import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeCreatorHandle } from '@/lib/creator-stats';
import { deriveCreatorTrustProfile } from '@/lib/creator-trust';

/**
 * GET /api/creators
 * Returns a list of active streamers for the /streamers page.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

        const verifiedDareTotals = await prisma.dare.findMany({
            where: {
                status: 'VERIFIED',
                OR: [
                    { streamerHandle: { not: null } },
                    { claimRequestTag: { not: null } },
                ],
            },
            select: {
                streamerHandle: true,
                claimRequestTag: true,
                bounty: true,
            },
        });

        const dareMetrics = new Map<string, { totalEarned: number; completedDares: number }>();
        verifiedDareTotals.forEach((entry) => {
            const normalizedHandle = normalizeCreatorHandle(entry.streamerHandle ?? entry.claimRequestTag);
            if (!normalizedHandle) return;

            const current = dareMetrics.get(normalizedHandle) || { totalEarned: 0, completedDares: 0 };
            current.totalEarned += entry.bounty || 0;
            current.completedDares += 1;
            dareMetrics.set(normalizedHandle, current);
        });

        const reviewMetrics = new Map<string, { count: number; ratingTotal: number }>();
        try {
            const reviews = await prisma.creatorReview.findMany({
                select: {
                    creatorTag: true,
                    rating: true,
                },
            });

            reviews.forEach((entry) => {
                const normalizedHandle = normalizeCreatorHandle(entry.creatorTag);
                if (!normalizedHandle) return;

                const current = reviewMetrics.get(normalizedHandle) || { count: 0, ratingTotal: 0 };
                current.count += 1;
                current.ratingTotal += entry.rating;
                reviewMetrics.set(normalizedHandle, current);
            });
        } catch {
            // Safe fallback for environments where the review table is not migrated yet.
        }

        const hydratedStreamers = streamers
            .map((streamer) => {
                const normalizedTag = normalizeCreatorHandle(streamer.tag) || '';
                const metrics = dareMetrics.get(normalizedTag);
                const totalEarned = Math.max(streamer.totalEarned, metrics?.totalEarned ?? 0);
                const completedDares = Math.max(streamer.completedDares, metrics?.completedDares ?? 0);
                const review = reviewMetrics.get(normalizedTag);
                return {
                    ...streamer,
                    totalEarned,
                    completedDares,
                    reviews: {
                        count: review?.count ?? 0,
                        averageRating:
                            review && review.count > 0
                                ? Math.round((review.ratingTotal / review.count) * 10) / 10
                                : null,
                    },
                    trust: deriveCreatorTrustProfile({
                        approvedMissions: completedDares,
                        settledMissions: completedDares,
                        totalEarned,
                        uniqueVenues: 0,
                        firstMarks: 0,
                    }),
                };
            })
            .sort((left, right) => right.totalEarned - left.totalEarned);

        const response = NextResponse.json({
            success: true,
            data: hydratedStreamers,
        });
        response.headers.set('Cache-Control', 'no-store, max-age=0');
        return response;
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to fetch creators';
        const response = NextResponse.json({ success: false, error: msg }, { status: 500 });
        response.headers.set('Cache-Control', 'no-store, max-age=0');
        return response;
    }
}
