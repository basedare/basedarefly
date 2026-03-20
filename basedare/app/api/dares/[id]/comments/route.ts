import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

type WalletSession = {
    token?: string;
    walletAddress?: string;
    user?: {
        walletAddress?: string | null;
    } | null;
};

const CommentPostSchema = z.object({
    body: z.string().min(1, 'Comment body is required').max(500, 'Comment too long'),
    displayName: z.string().max(80, 'Display name too long').optional(),
    walletAddress: z.string().optional(),
});

async function getVerifiedSessionWallet(request: NextRequest): Promise<string | null> {
    const session = (await getServerSession(authOptions)) as WalletSession | null;
    if (!session) return null;

    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();

    if (session.token && (!bearerToken || bearerToken !== session.token)) {
        return null;
    }

    const wallet = session.walletAddress ?? session.user?.walletAddress ?? null;
    if (!wallet || !isAddress(wallet)) return null;

    return wallet.toLowerCase();
}

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
        const sessionWallet = await getVerifiedSessionWallet(request);
        if (!sessionWallet) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const rawBody = await request.json();
        const parsed = CommentPostSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const { walletAddress, displayName, body: text } = parsed.data;
        const normalizedBodyWallet = walletAddress?.toLowerCase();

        if (normalizedBodyWallet && normalizedBodyWallet !== sessionWallet) {
            return NextResponse.json(
                { success: false, error: 'Wallet mismatch. Use authenticated session wallet.' },
                { status: 401 }
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
                walletAddress: sessionWallet,
                displayName: displayName?.trim() || `${sessionWallet.slice(0, 6)}...${sessionWallet.slice(-4)}`,
                body: text.trim().slice(0, 500), // cap at 500 chars
            },
        });

        return NextResponse.json({ success: true, data: comment }, { status: 201 });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to post comment';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
