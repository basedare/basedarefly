import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAddress } from 'viem';

// ============================================================================
// GET /api/notifications - Fetch unread notifications for a wallet
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const wallet = searchParams.get('wallet');

        if (!wallet || !isAddress(wallet)) {
            return NextResponse.json({ success: false, error: 'Valid wallet address required' }, { status: 400 });
        }

        const lowerWallet = wallet.toLowerCase();

        const notifications = await prisma.notification.findMany({
            where: {
                wallet: lowerWallet,
                isRead: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 20, // Limit to 20 unread for performance in polling
        });

        return NextResponse.json({ success: true, notifications });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[NOTIFICATIONS] Fetch failed:', message);
        return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
    }
}

// ============================================================================
// PUT /api/notifications - Mark notifications as read
// ============================================================================
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { notificationIds, wallet } = body;

        if (!wallet || !isAddress(wallet)) {
            return NextResponse.json({ success: false, error: 'Valid wallet address required' }, { status: 400 });
        }

        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
            return NextResponse.json({ success: false, error: 'Notification IDs required' }, { status: 400 });
        }

        const lowerWallet = wallet.toLowerCase();

        // Ensure users can only mark their own notifications as read
        await prisma.notification.updateMany({
            where: {
                id: { in: notificationIds },
                wallet: lowerWallet,
            },
            data: {
                isRead: true,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[NOTIFICATIONS] Mark read failed:', message);
        return NextResponse.json({ success: false, error: 'Failed to update notifications' }, { status: 500 });
    }
}
