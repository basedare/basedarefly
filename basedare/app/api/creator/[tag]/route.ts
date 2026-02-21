import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        const handle = tag.startsWith('@') ? tag : `@${tag}`;
        const handlePlain = tag.replace('@', '');

        // Fetch all dares targeting this creator (case-insensitive)
        const allDares = await prisma.dare.findMany({
            where: {
                streamerHandle: { in: [handle, handlePlain, `@${handlePlain}`], mode: 'insensitive' },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true, shortId: true, title: true, bounty: true,
                status: true, expiresAt: true, createdAt: true,
                streamerHandle: true,
            },
        });

        const total = allDares.length;
        const completed = allDares.filter(d => d.status === 'VERIFIED').length;
        const live = allDares.filter(d => ['PENDING', 'AWAITING_CLAIM', 'PENDING_REVIEW'].includes(d.status)).length;
        const totalEarned = allDares
            .filter(d => d.status === 'VERIFIED')
            .reduce((sum, d) => sum + d.bounty, 0);
        const totalPool = allDares.reduce((sum, d) => sum + d.bounty, 0);
        const acceptRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const minBounty = allDares.length > 0 ? Math.min(...allDares.map(d => d.bounty)) : 0;

        // Check if streamer tag is verified in our system
        const streamTag = await prisma.streamerTag.findFirst({
            where: { tag: { in: [handle, handlePlain], mode: 'insensitive' } },
            select: {
                tag: true, twitterHandle: true, twitterVerified: true,
                twitchHandle: true, twitchVerified: true,
                status: true, totalEarned: true,
            },
        }).catch(() => null);

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
                handle: handle,
                displayHandle: `@${handlePlain}`,
                verified: streamTag?.status === 'ACTIVE',
                twitterHandle: streamTag?.twitterHandle || null,
                twitchHandle: streamTag?.twitchHandle || null,
                stats: { total, completed, live, acceptRate, totalPool, totalEarned, minBounty },
                recent,
            },
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to fetch creator';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
