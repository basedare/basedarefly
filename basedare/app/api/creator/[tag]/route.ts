import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deriveIdentityHandle, deriveIdentityPlatform, selectPrimaryTag } from '@/lib/creator-identity';
import { isPlaceTagTableMissingError } from '@/lib/place-tags';

/**
 * GET /api/creator/[tag]
 * Returns profile stats + recent dares for a streamer handle.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ tag: string }> }
) {
    try {
        const { tag } = await params;
        const rawTag = decodeURIComponent(tag).trim();
        const handlePlain = rawTag.replace(/^@/, '');
        const handle = `@${handlePlain}`;

        const matchingTags = await prisma.streamerTag.findMany({
            where: {
                OR: [
                    { tag: { equals: handle, mode: 'insensitive' } },
                    { tag: { equals: handlePlain, mode: 'insensitive' } },
                    { twitterHandle: { equals: handlePlain, mode: 'insensitive' } },
                    { twitchHandle: { equals: handlePlain, mode: 'insensitive' } },
                    { youtubeHandle: { equals: handlePlain, mode: 'insensitive' } },
                    { kickHandle: { equals: handlePlain, mode: 'insensitive' } },
                ],
                status: { in: ['ACTIVE', 'VERIFIED'] },
            },
            select: {
                tag: true,
                bio: true,
                pfpUrl: true,
                pfpScale: true,
                pfpOffsetX: true,
                pfpOffsetY: true,
                followerCount: true,
                verificationMethod: true,
                twitterHandle: true,
                twitterVerified: true,
                twitchHandle: true,
                twitchVerified: true,
                youtubeHandle: true,
                youtubeVerified: true,
                kickHandle: true,
                kickVerified: true,
                status: true,
                totalEarned: true,
                completedDares: true,
                tags: true,
                verifiedAt: true,
                updatedAt: true,
                createdAt: true,
            },
            orderBy: [{ verifiedAt: 'desc' }, { updatedAt: 'desc' }, { createdAt: 'desc' }],
        }).catch(() => []);

        const streamTag = selectPrimaryTag(matchingTags);

        const canonicalHandle = streamTag?.tag || handle;
        const canonicalPlain = canonicalHandle.replace(/^@/, '');
        const handleVariants = Array.from(
            new Set([canonicalHandle, canonicalPlain, `@${canonicalPlain}`, handle, handlePlain])
        );

        // Fetch all dares targeting this creator (case-insensitive)
        const allDares = await prisma.dare.findMany({
            where: {
                OR: handleVariants.map((value) => ({
                    streamerHandle: { equals: value, mode: 'insensitive' },
                })),
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true, shortId: true, title: true, bounty: true,
                status: true, expiresAt: true, createdAt: true,
                streamerHandle: true,
            },
        });

        if (!streamTag && allDares.length === 0) {
            return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 });
        }

        const total = allDares.length;
        const completed = allDares.filter(d => d.status === 'VERIFIED').length;
        const live = allDares.filter(d => ['PENDING', 'AWAITING_CLAIM', 'PENDING_REVIEW'].includes(d.status)).length;
        const earnedFromDares = allDares
            .filter(d => d.status === 'VERIFIED')
            .reduce((sum, d) => sum + d.bounty, 0);
        const totalPool = allDares.reduce((sum, d) => sum + d.bounty, 0);
        const acceptRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const minBounty = allDares.length > 0 ? Math.min(...allDares.map(d => d.bounty)) : 0;
        const totalEarned = streamTag?.totalEarned ?? earnedFromDares;
        const completedCount = streamTag?.completedDares ?? completed;

        const recent = allDares.slice(0, 12).map(d => ({
            id: d.id,
            shortId: d.shortId || d.id.slice(0, 8),
            title: d.title,
            bounty: d.bounty,
            status: d.status,
            expiresAt: d.expiresAt?.toISOString() || null,
            createdAt: d.createdAt.toISOString(),
        }));

        let contribution = {
            totalMarks: 0,
            firstMarks: 0,
            uniqueVenues: 0,
            lastMarkedAt: null as string | null,
            topVenue: null as {
                id: string;
                slug: string;
                name: string;
                city: string | null;
                country: string | null;
                count: number;
            } | null,
        };

        try {
            const approvedMarks = await prisma.placeTag.findMany({
                where: {
                    status: 'APPROVED',
                    creatorTag: { in: handleVariants },
                },
                orderBy: { submittedAt: 'asc' },
                select: {
                    firstMark: true,
                    submittedAt: true,
                    venueId: true,
                    venue: {
                        select: {
                            id: true,
                            slug: true,
                            name: true,
                            city: true,
                            country: true,
                        },
                    },
                },
            });

            const uniqueVenueIds = new Set(approvedMarks.map((mark) => mark.venueId));
            const topVenue = Array.from(
                approvedMarks.reduce((accumulator, mark) => {
                    const current = accumulator.get(mark.venueId);
                    if (current) {
                        current.count += 1;
                    } else {
                        accumulator.set(mark.venueId, {
                            id: mark.venue.id,
                            slug: mark.venue.slug,
                            name: mark.venue.name,
                            city: mark.venue.city,
                            country: mark.venue.country,
                            count: 1,
                        });
                    }

                    return accumulator;
                }, new Map<string, { id: string; slug: string; name: string; city: string | null; country: string | null; count: number }>())
            )
                .map(([, value]) => value)
                .sort((left, right) => right.count - left.count)[0] ?? null;

            contribution = {
                totalMarks: approvedMarks.length,
                firstMarks: approvedMarks.filter((mark) => mark.firstMark).length,
                uniqueVenues: uniqueVenueIds.size,
                lastMarkedAt: approvedMarks.at(-1)?.submittedAt.toISOString() ?? null,
                topVenue,
            };
        } catch (error) {
            if (!isPlaceTagTableMissingError(error)) {
                throw error;
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                handle: canonicalHandle,
                displayHandle: canonicalHandle.startsWith('@') ? canonicalHandle : `@${canonicalPlain}`,
                verified: streamTag?.status === 'ACTIVE' || streamTag?.status === 'VERIFIED',
                identityPlatform: streamTag ? deriveIdentityPlatform(streamTag) : null,
                identityHandle: streamTag ? deriveIdentityHandle(streamTag) : null,
                identityStatus: streamTag?.status || null,
                twitterHandle: streamTag?.twitterHandle || null,
                twitchHandle: streamTag?.twitchHandle || null,
                youtubeHandle: streamTag?.youtubeHandle || null,
                kickHandle: streamTag?.kickHandle || null,
                bio: streamTag?.bio || null,
                pfpUrl: streamTag?.pfpUrl || null,
                pfpScale: streamTag?.pfpScale ?? 1,
                pfpOffsetX: streamTag?.pfpOffsetX ?? 50,
                pfpOffsetY: streamTag?.pfpOffsetY ?? 50,
                followerCount: streamTag?.followerCount ?? null,
                tags: streamTag?.tags || [],
                stats: { total, completed: completedCount, live, acceptRate, totalPool, totalEarned, minBounty },
                contribution,
                recent,
            },
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to fetch creator';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
