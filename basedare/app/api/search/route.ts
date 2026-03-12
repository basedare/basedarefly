import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/search - Global Search for Streamers and Dares
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query || query.trim().length === 0) {
            return NextResponse.json({ success: true, results: { streamers: [], dares: [] } });
        }

        const searchTerm = query.trim();

        // 1. Search Streamer Tags (case insensitive exact or partial match)
        const streamers = await prisma.streamerTag.findMany({
            where: {
                status: 'ACTIVE',
                tag: {
                    contains: searchTerm,
                    mode: 'insensitive', // ILIKE equivalent
                },
            },
            take: 5,
            select: {
                tag: true,
                walletAddress: true,
            },
        });

        // 2. Search Dare Titles (case insensitive partial match)
        const dares = await prisma.dare.findMany({
            where: {
                title: {
                    contains: searchTerm,
                    mode: 'insensitive',
                },
            },
            take: 5,
            select: {
                id: true,
                shortId: true,
                title: true,
                bounty: true,
                status: true,
                streamerHandle: true,
            },
        });

        return NextResponse.json({
            success: true,
            results: {
                streamers: streamers.map(s => ({
                    type: 'streamer',
                    title: `@${s.tag}`,
                    subtitle: `${s.walletAddress.substring(0, 6)}...${s.walletAddress.substring(38)}`,
                    url: `/creator/${s.tag.toLowerCase()}`,
                })),
                dares: dares.map(d => ({
                    type: 'dare',
                    title: d.title,
                    subtitle: `$${d.bounty} USDC • ${d.streamerHandle}`,
                    url: `/dare/${d.id}`,
                })),
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[SEARCH] Query failed:', message);
        return NextResponse.json(
            { success: false, error: 'Failed to perform search' },
            { status: 500 }
        );
    }
}
