import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function deriveIdentityPlatform(tag: {
    verificationMethod?: string | null;
    twitterHandle?: string | null;
    twitchHandle?: string | null;
    youtubeHandle?: string | null;
    kickHandle?: string | null;
}) {
    const method = tag.verificationMethod?.toLowerCase() ?? null;
    if (method === 'twitter' || method === 'x') return 'twitter';
    if (method === 'twitch') return 'twitch';
    if (method === 'youtube' || method === 'google') return 'youtube';
    if (method === 'instagram' || method === 'tiktok' || method === 'other' || method === 'kick') return method;
    if (tag.twitterHandle) return 'twitter';
    if (tag.twitchHandle) return 'twitch';
    if (tag.youtubeHandle) return 'youtube';
    if (tag.kickHandle) return 'other';
    return null;
}

function deriveIdentityHandle(tag: {
    twitterHandle?: string | null;
    twitchHandle?: string | null;
    youtubeHandle?: string | null;
    kickHandle?: string | null;
}) {
    return tag.twitterHandle || tag.twitchHandle || tag.youtubeHandle || tag.kickHandle || null;
}

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

        const streamTag = await prisma.streamerTag.findFirst({
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
            },
        }).catch(() => null);

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
                followerCount: streamTag?.followerCount ?? null,
                tags: streamTag?.tags || [],
                stats: { total, completed: completedCount, live, acceptRate, totalPool, totalEarned, minBounty },
                recent,
            },
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to fetch creator';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
