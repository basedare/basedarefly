import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { PUSH_TOPICS, sendWalletPush, type PushTopic } from '@/lib/web-push';

function sanitizePushText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function sanitizePushUrl(value: unknown) {
  const url = sanitizePushText(value, 200);
  if (!url.startsWith('/') || url.startsWith('//')) return '/dashboard';
  return url;
}

function sanitizePushTopic(value: unknown): PushTopic | null {
  if (typeof value !== 'string') return null;
  return PUSH_TOPICS.includes(value as PushTopic) ? (value as PushTopic) : null;
}

function hasPushDeliveryConfig() {
  return Boolean(
    (process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)?.trim() &&
    process.env.VAPID_PRIVATE_KEY?.trim()
  );
}

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
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
          configured: hasPushDeliveryConfig(),
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

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const body = await request.json();
    const wallet = sanitizePushText(body?.wallet, 96).toLowerCase();
    const topic = sanitizePushTopic(body?.topic);
    const title = sanitizePushText(body?.title, 80);
    const message = sanitizePushText(body?.body, 180);
    const url = sanitizePushUrl(body?.url);

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ success: false, error: 'Valid wallet address required' }, { status: 400 });
    }

    if (!topic) {
      return NextResponse.json({ success: false, error: 'Valid push topic required' }, { status: 400 });
    }

    if (!title || !message) {
      return NextResponse.json({ success: false, error: 'Push title and body are required' }, { status: 400 });
    }

    const result = await sendWalletPush({
      wallet,
      topic,
      title,
      body: message,
      url,
    });

    if (!result.configured) {
      return NextResponse.json(
        {
          success: false,
          error: 'Push delivery keys are not configured',
          data: result,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_PUSH] Manual send failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to send admin push' }, { status: 500 });
  }
}
