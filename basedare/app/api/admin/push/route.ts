import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { PUSH_TOPICS } from '@/lib/web-push';

const MODERATOR_WALLETS =
  process.env.MODERATOR_WALLETS?.split(',').map((wallet) => wallet.trim().toLowerCase()) || [];

function isModerator(request: NextRequest): string | null {
  const walletHeader = request.headers.get('x-moderator-wallet');
  if (!walletHeader) return null;
  const lowerWallet = walletHeader.toLowerCase();
  return MODERATOR_WALLETS.includes(lowerWallet) ? lowerWallet : null;
}

export async function GET(request: NextRequest) {
  const moderatorWallet = isModerator(request);
  if (!moderatorWallet) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [subscriptions, recentDeliveries] = await Promise.all([
      prisma.webPushSubscription.findMany({
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          wallet: true,
          topics: true,
          isActive: true,
          lastSeenAt: true,
          lastLocationAt: true,
          nearbyRadiusKm: true,
          updatedAt: true,
        },
      }),
      prisma.webPushDelivery.findMany({
        orderBy: { createdAt: 'desc' },
        take: 40,
        select: {
          id: true,
          wallet: true,
          topic: true,
          title: true,
          url: true,
          status: true,
          reason: true,
          errorMessage: true,
          createdAt: true,
          subscriptionId: true,
        },
      }),
    ]);

    const activeSubscriptions = subscriptions.filter((subscription) => subscription.isActive);
    const inactiveSubscriptions = subscriptions.filter((subscription) => !subscription.isActive);
    const freshLocationCount = activeSubscriptions.filter((subscription) => subscription.lastLocationAt).length;

    const topicMix = PUSH_TOPICS.map((topic) => ({
      topic,
      subscriptions: activeSubscriptions.filter((subscription) => subscription.topics.includes(topic)).length,
      deliveries: recentDeliveries.filter((delivery) => delivery.topic === topic && delivery.status === 'SENT').length,
    }));

    const statusCounts = recentDeliveries.reduce(
      (acc, delivery) => {
        acc[delivery.status] = (acc[delivery.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          activeSubscriptions: activeSubscriptions.length,
          inactiveSubscriptions: inactiveSubscriptions.length,
          freshLocationSubscriptions: freshLocationCount,
          recentSent: statusCounts.SENT ?? 0,
          recentFailed: statusCounts.FAILED ?? 0,
          recentSkipped: statusCounts.SKIPPED ?? 0,
          recentlyDeactivated: statusCounts.DEACTIVATED ?? 0,
        },
        topicMix,
        recentDeliveries: recentDeliveries.map((delivery) => ({
          ...delivery,
          createdAt: delivery.createdAt.toISOString(),
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_PUSH] Fetch failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load push diagnostics' }, { status: 500 });
  }
}
