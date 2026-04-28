import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { findPrimaryCreatorTagForWallet } from '@/lib/creator-tag-resolver';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';

const CommentPostSchema = z.object({
    body: z.string().min(1, 'Comment body is required').max(500, 'Comment too long'),
    displayName: z.string().max(80, 'Display name too long').optional(),
    walletAddress: z.string().optional(),
});

function normalizeWalletForComments(walletAddress?: string | null): string | null {
    if (!walletAddress || !isAddress(walletAddress)) return null;
    return walletAddress.toLowerCase();
}

function fallbackCommentName(walletAddress: string): string {
    return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
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
        const uniqueWallets = [...new Set(items.map((comment) => comment.walletAddress.toLowerCase()))];
        const primaryTags = await Promise.all(
            uniqueWallets.map(async (wallet) => [wallet, await findPrimaryCreatorTagForWallet(wallet)] as const)
        );
        const primaryTagMap = new Map(primaryTags);
        const hydratedItems = items.map((comment) => ({
            ...comment,
            displayName:
                primaryTagMap.get(comment.walletAddress.toLowerCase())?.tag ||
                comment.displayName ||
                fallbackCommentName(comment.walletAddress),
        }));
        const nextCursor = hasMore ? items[items.length - 1].id : null;

        return NextResponse.json({ success: true, data: { comments: hydratedItems, nextCursor } });
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
        const rawBody = await request.json();
        const parsed = CommentPostSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const { walletAddress, displayName, body: text } = parsed.data;
        const normalizedBodyWallet = normalizeWalletForComments(walletAddress);
        const actingWallet = await getAuthorizedWalletForRequest(request, {
            walletAddress: normalizedBodyWallet,
            action: 'dare:comment',
            resource: id,
        });

        if (!actingWallet) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized',
                    code: 'COMMENT_AUTH_REQUIRED',
                },
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

        const primaryTag = await findPrimaryCreatorTagForWallet(actingWallet);
        const comment = await prisma.comment.create({
            data: {
                dareId: dare.id,
                walletAddress: actingWallet,
                displayName:
                    primaryTag?.tag ||
                    displayName?.trim() ||
                    fallbackCommentName(actingWallet),
                body: text.trim().slice(0, 500), // cap at 500 chars
            },
        });

        return NextResponse.json({ success: true, data: comment }, { status: 201 });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to post comment';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
