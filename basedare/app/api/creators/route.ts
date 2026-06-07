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

const CREATOR_QUERY_TIMEOUT_MS = 1000;
const CREATOR_FALLBACK_COOLDOWN_MS = 30_000;
const CREATOR_CACHE_HEADER = 'public, max-age=30, stale-while-revalidate=120';
let creatorFallbackUntil = 0;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Creator query timed out')), timeoutMs);
    });

    return Promise.race([promise, timeout]).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
    });
}

function buildFallbackCreators(tagFilter?: string) {
    const seeds = [
        {
            tag: '@basedarebear',
            twitterHandle: 'basedarebear',
            twitchHandle: null,
            status: 'VERIFIED',
            totalEarned: 240,
            completedDares: 8,
            walletAddress: null,
            tags: ['siargao', 'venue scout', 'proof', 'nightlife'],
            pfpUrl: null,
            pfpScale: null,
            pfpOffsetX: null,
            pfpOffsetY: null,
            metrics: { approved: 8, payoutQueued: 0, live: 1, total: 10 },
            contribution: { uniqueVenues: 4, firstMarks: 2 },
            reviews: { count: 2, averageRating: 5 },
        },
        {
            tag: '@venuecaptain',
            twitterHandle: null,
            twitchHandle: null,
            status: 'ACTIVE',
            totalEarned: 120,
            completedDares: 4,
            walletAddress: null,
            tags: ['food', 'beach', 'creator mission'],
            pfpUrl: null,
            pfpScale: null,
            pfpOffsetX: null,
            pfpOffsetY: null,
            metrics: { approved: 4, payoutQueued: 0, live: 0, total: 5 },
            contribution: { uniqueVenues: 2, firstMarks: 1 },
            reviews: { count: 1, averageRating: 5 },
        },
        {
            tag: '@proofscout',
            twitterHandle: null,
            twitchHandle: null,
            status: 'ACTIVE',
            totalEarned: 60,
            completedDares: 2,
            walletAddress: null,
            tags: ['coffee', 'street', 'first spark'],
            pfpUrl: null,
            pfpScale: null,
            pfpOffsetX: null,
            pfpOffsetY: null,
            metrics: { approved: 2, payoutQueued: 0, live: 0, total: 3 },
            contribution: { uniqueVenues: 1, firstMarks: 1 },
            reviews: { count: 0, averageRating: null },
        },
    ];

    return seeds
        .filter((creator) => {
            if (!tagFilter) return true;
            const normalizedTag = normalizeCreatorHandle(creator.tag) ?? '';
            return normalizedTag.includes(tagFilter) || creator.tags.some((tag) => tag.toLowerCase().includes(tagFilter));
        })
        .map(({ metrics, contribution, ...creator }) => ({
            ...creator,
            stats: {
                approved: metrics.approved,
                payoutQueued: metrics.payoutQueued,
                live: metrics.live,
                acceptRate: metrics.total > 0 ? Math.round((metrics.approved / metrics.total) * 100) : 0,
            },
            businessMetrics: {
                venueReach: contribution.uniqueVenues,
                firstMarks: contribution.firstMarks,
            },
            signalPoints: 0,
            routeReady: false,
            trust: deriveCreatorTrustProfile({
                approvedMissions: metrics.approved,
                settledMissions: creator.completedDares,
                totalEarned: creator.totalEarned,
                uniqueVenues: contribution.uniqueVenues,
                firstMarks: contribution.firstMarks,
            }),
        }));
}

function fallbackResponse(tagFilter: string | undefined, warning: string) {
    const response = NextResponse.json({
        success: true,
        data: buildFallbackCreators(tagFilter),
        source: 'fallback',
        warning,
    });
    response.headers.set('Cache-Control', CREATOR_CACHE_HEADER);
    return response;
}

async function fetchHydratedCreators(tagFilter?: string) {
    const [streamers, creatorDares] = await Promise.all([
        prisma.streamerTag.findMany({
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
                pfpUrl: true,
                pfpScale: true,
                pfpOffsetX: true,
                pfpOffsetY: true,
            },
        }),
        prisma.dare.findMany({
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
        }),
    ]);

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

    const passportMetrics = new Map<string, { signalPoints: number; routeReady: boolean }>();
    try {
        const wallets = streamers
            .map((streamer) => streamer.walletAddress?.trim().toLowerCase())
            .filter((wallet): wallet is string => Boolean(wallet));
        if (wallets.length > 0) {
            const passports = await prisma.creatorPassport.findMany({
                where: { walletAddress: { in: wallets } },
                select: { walletAddress: true, signalPoints: true, routeReady: true },
            });
            passports.forEach((passport) => {
                passportMetrics.set(passport.walletAddress.toLowerCase(), {
                    signalPoints: passport.signalPoints,
                    routeReady: passport.routeReady,
                });
            });
        }
    } catch {
        // Safe fallback for environments where the creator passport table is not migrated yet.
    }

    return streamers
        .map((streamer) => {
            const normalizedTag = normalizeCreatorHandle(streamer.tag) || '';
            const metrics = dareMetrics.get(normalizedTag);
            const contribution = contributionMetrics.get(normalizedTag);
            const passport = streamer.walletAddress
                ? passportMetrics.get(streamer.walletAddress.toLowerCase())
                : undefined;
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
                signalPoints: passport?.signalPoints ?? 0,
                routeReady: passport?.routeReady ?? false,
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
            // Route-ready + Signal Points lift creators up (route-ready earns more
            // mission points), without a hard reorder away from trust.
            const leftScore = (left.trust?.score ?? 0) + (left.signalPoints ?? 0);
            const rightScore = (right.trust?.score ?? 0) + (right.signalPoints ?? 0);
            if (rightScore !== leftScore) return rightScore - leftScore;
            return right.totalEarned - left.totalEarned;
        });
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const tagFilter = searchParams.get('tag')?.trim().toLowerCase();

    if (Date.now() < creatorFallbackUntil) {
        return fallbackResponse(tagFilter, 'Creator fallback served while live stats recover.');
    }

    try {
        const hydratedStreamers = await withTimeout(fetchHydratedCreators(tagFilter), CREATOR_QUERY_TIMEOUT_MS);

        const response = NextResponse.json({
            success: true,
            data: hydratedStreamers,
            source: 'database',
        });
        response.headers.set('Cache-Control', CREATOR_CACHE_HEADER);
        return response;
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to fetch creators';
        console.error('[CREATORS] Falling back:', msg);
        creatorFallbackUntil = Date.now() + CREATOR_FALLBACK_COOLDOWN_MS;
        return fallbackResponse(tagFilter, 'Creator data fallback shown while live creator stats warm up.');
    }
}
