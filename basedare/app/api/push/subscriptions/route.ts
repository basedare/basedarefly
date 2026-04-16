import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';

type PushKeys = {
  p256dh?: string;
  auth?: string;
};

type PushSubscriptionPayload = {
  endpoint?: string;
  keys?: PushKeys;
};

const ALLOWED_TOPICS = ['wallet', 'nearby', 'campaigns', 'venues'] as const;
type PushTopic = (typeof ALLOWED_TOPICS)[number];

function extractSubscription(body: unknown): PushSubscriptionPayload | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const payload = body as PushSubscriptionPayload;
  if (!payload.endpoint || typeof payload.endpoint !== 'string') {
    return null;
  }

  return payload;
}

function sanitizeTopics(input: unknown): PushTopic[] {
  if (!Array.isArray(input)) {
    return ['wallet', 'nearby'];
  }

  const filtered = input
    .filter((topic): topic is PushTopic => typeof topic === 'string' && ALLOWED_TOPICS.includes(topic as PushTopic));

  return filtered.length > 0 ? Array.from(new Set(filtered)) : ['wallet', 'nearby'];
}

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet');

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ success: false, error: 'Valid wallet address required' }, { status: 400 });
    }

    const subscription = await prisma.webPushSubscription.findFirst({
      where: {
        wallet: wallet.toLowerCase(),
        isActive: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        endpoint: true,
        topics: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      subscribed: Boolean(subscription),
      endpoint: subscription?.endpoint ?? null,
      topics: subscription?.topics ?? ['wallet', 'nearby'],
      updatedAt: subscription?.updatedAt ?? null,
      configured: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PUSH] Fetch subscription failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to fetch push subscription' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const wallet = body?.wallet;
    const subscription = extractSubscription(body?.subscription);
    const topics = sanitizeTopics(body?.topics);

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ success: false, error: 'Valid wallet address required' }, { status: 400 });
    }

    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ success: false, error: 'Valid push subscription required' }, { status: 400 });
    }

    const lowerWallet = wallet.toLowerCase();

    await prisma.webPushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        wallet: lowerWallet,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        topics,
        userAgent: request.headers.get('user-agent'),
        isActive: true,
        lastSeenAt: new Date(),
      },
      create: {
        wallet: lowerWallet,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        topics,
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PUSH] Subscribe failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to save push subscription' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const wallet = body?.wallet;
    const endpoint = body?.endpoint;
    const topics = sanitizeTopics(body?.topics);

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ success: false, error: 'Valid wallet address required' }, { status: 400 });
    }

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ success: false, error: 'Endpoint required' }, { status: 400 });
    }

    await prisma.webPushSubscription.updateMany({
      where: {
        wallet: wallet.toLowerCase(),
        endpoint,
        isActive: true,
      },
      data: {
        topics,
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, topics });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PUSH] Update topics failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to update push topics' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const wallet = body?.wallet;
    const endpoint = body?.endpoint;

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ success: false, error: 'Valid wallet address required' }, { status: 400 });
    }

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ success: false, error: 'Endpoint required' }, { status: 400 });
    }

    await prisma.webPushSubscription.updateMany({
      where: {
        wallet: wallet.toLowerCase(),
        endpoint,
      },
      data: {
        isActive: false,
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PUSH] Unsubscribe failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to remove push subscription' }, { status: 500 });
  }
}
