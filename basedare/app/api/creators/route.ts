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

        const creatorDares = await prisma.dare.findMany({
            where: {
                OR: [
                    { streamerHandle: { not: null } },
                    { claimRequestTag: { not: null } },
                ],
            },
            select: {
                streamerHandle: true,
                claimRequestTag: true,
                bounty: true,
                status: true,
            },
        });

        const dareMetrics = new Map<string, {
            totalEarned: number;
            completedDares: number;
            approvedMissions: number;
            payoutQueued: number;
            live: number;
            total: number;
        }>();
        creatorDares.forEach((entry) => {
            const normalizedHandle = normalizeCreatorHandle(entry.streamerHandle ?? entry.claimRequestTag);
            if (!normalizedHandle) return;

            const current = dareMetrics.get(normalizedHandle) || {
                totalEarned: 0,
                completedDares: 0,
                approvedMissions: 0,
                payoutQueued: 0,
                live: 0,
                total: 0,
            };
            current.total += 1;
            if (entry.status === 'VERIFIED') {
                current.totalEarned += entry.bounty || 0;
                current.completedDares += 1;
                current.approvedMissions += 1;
            } else if (entry.status === 'PENDING_PAYOUT') {
                current.approvedMissions += 1;
                current.payoutQueued += 1;
            } else if (['PENDING', 'AWAITING_CLAIM', 'PENDING_REVIEW', 'PENDING_ACCEPTANCE'].includes(entry.status)) {
                current.live += 1;
            }
            dareMetrics.set(normalizedHandle, current);
        });

        const contributionMetrics = new Map<string, { uniqueVenues: number; firstMarks: number }>();
        try {
            const approvedMarks = await prisma.placeTag.findMany({
                where: {
                    status: 'APPROVED',
                    creatorTag: { not: null },
                },
                select: {
                    creatorTag: true,
                    venueId: true,
                    firstMark: true,
                },
            });

            const venueSets = new Map<string, Set<string>>();
            approvedMarks.forEach((entry) => {
                const normalizedHandle = normalizeCreatorHandle(entry.creatorTag);
                if (!normalizedHandle) return;

                const venues = venueSets.get(normalizedHandle) || new Set<string>();
                venues.add(entry.venueId);
                venueSets.set(normalizedHandle, venues);

                const current = contributionMetrics.get(normalizedHandle) || { uniqueVenues: 0, firstMarks: 0 };
                if (entry.firstMark) current.firstMarks += 1;
                contributionMetrics.set(normalizedHandle, current);
            });

            venueSets.forEach((venues, handle) => {
                const current = contributionMetrics.get(handle) || { uniqueVenues: 0, firstMarks: 0 };
                current.uniqueVenues = venues.size;
                contributionMetrics.set(handle, current);
            });
        } catch {
            // Safe fallback for environments where place tags are not migrated yet.
        }

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
                const contribution = contributionMetrics.get(normalizedTag);
                const totalEarned = Math.max(streamer.totalEarned, metrics?.totalEarned ?? 0);
                const completedDares = Math.max(streamer.completedDares, metrics?.completedDares ?? 0);
                const approvedMissions = Math.max(completedDares + (metrics?.payoutQueued ?? 0), metrics?.approvedMissions ?? 0);
                const acceptRate = (metrics?.total ?? 0) > 0 ? Math.round((approvedMissions / (metrics?.total ?? 1)) * 100) : 0;
                const review = reviewMetrics.get(normalizedTag);
                return {
                    ...streamer,
                    totalEarned,
                    completedDares,
                    stats: {
                        approved: approvedMissions,
                        payoutQueued: metrics?.payoutQueued ?? 0,
                        live: metrics?.live ?? 0,
                        acceptRate,
                    },
                    businessMetrics: {
                        venueReach: contribution?.uniqueVenues ?? 0,
                        firstMarks: contribution?.firstMarks ?? 0,
                    },
                    reviews: {
                        count: review?.count ?? 0,
                        averageRating:
                            review && review.count > 0
                                ? Math.round((review.ratingTotal / review.count) * 10) / 10
                                : null,
                    },
                    trust: deriveCreatorTrustProfile({
                        approvedMissions,
                        settledMissions: completedDares,
                        totalEarned,
                        uniqueVenues: contribution?.uniqueVenues ?? 0,
                        firstMarks: contribution?.firstMarks ?? 0,
                    }),
                };
            })
            .sort((left, right) => {
                const trustDelta = (right.trust?.score ?? 0) - (left.trust?.score ?? 0);
                if (trustDelta !== 0) return trustDelta;
                return right.totalEarned - left.totalEarned;
            });

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
