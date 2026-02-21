import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/dares/[id]/comments
 * Fetch paginated comments for a dare, newest first.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const cursor = searchParams.get('cursor');
        const take = 20;

        const comments = await prisma.comment.findMany({
            where: { dareId: id },
            orderBy: { createdAt: 'desc' },
            take: take + 1,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });

        const hasMore = comments.length > take;
        const items = hasMore ? comments.slice(0, take) : comments;
        const nextCursor = hasMore ? items[items.length - 1].id : null;

        return NextResponse.json({ success: true, data: { comments: items, nextCursor } });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to fetch comments';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

/**
 * POST /api/dares/[id]/comments
 * Post a comment. Body: { walletAddress, displayName?, body }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { walletAddress, displayName, body: text } = body;

        if (!walletAddress || !text?.trim()) {
            return NextResponse.json(
                { success: false, error: 'walletAddress and body are required' },
                { status: 400 }
            );
        }

        // Verify dare exists
        const dare = await prisma.dare.findFirst({
            where: { OR: [{ id }, { shortId: id }] },
            select: { id: true },
        });
        if (!dare) {
            return NextResponse.json({ success: false, error: 'Dare not found' }, { status: 404 });
        }

        const comment = await prisma.comment.create({
            data: {
                dareId: dare.id,
                walletAddress: walletAddress.toLowerCase(),
                displayName: displayName?.trim() || `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
                body: text.trim().slice(0, 500), // cap at 500 chars
            },
        });

        return NextResponse.json({ success: true, data: comment }, { status: 201 });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to post comment';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
