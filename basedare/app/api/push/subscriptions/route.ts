import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';

type PushKeys = {
  p256dh?: string;
  auth?: string;
};

type PushSubscriptionPayload = {
  endpoint?: string;
  keys?: PushKeys;
};

type LocationContextPayload = {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
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

function sanitizeLocationContext(input: unknown): LocationContextPayload | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const payload = input as LocationContextPayload;
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  const radiusKm = payload.radiusKm == null ? undefined : Number(payload.radiusKm);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  if (radiusKm != null && (!Number.isFinite(radiusKm) || radiusKm < 0.5 || radiusKm > 50)) {
    return null;
  }

  return {
    latitude,
    longitude,
    radiusKm,
  };
}

function sanitizeNearbyRadius(input: unknown): number | undefined {
  if (input == null) {
    return undefined;
  }

  const radiusKm = Number(input);
  if (!Number.isFinite(radiusKm) || radiusKm < 0.5 || radiusKm > 50) {
    return undefined;
  }

  return radiusKm;
}

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet');
    const endpoint = request.nextUrl.searchParams.get('endpoint');

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ success: false, error: 'Valid wallet address required' }, { status: 400 });
    }

    const lowerWallet = wallet.toLowerCase();
    const endpointFilter = endpoint && endpoint.length <= 2048 ? endpoint : null;
    const authorizedWallet = await getAuthorizedWalletForRequest(request, {
      walletAddress: lowerWallet,
      action: 'push:read',
      resource: lowerWallet,
    });

    if (!authorizedWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await prisma.webPushSubscription.findFirst({
      where: {
        wallet: lowerWallet,
        isActive: true,
        ...(endpointFilter ? { endpoint: endpointFilter } : {}),
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        endpoint: true,
        topics: true,
        lastLatitude: true,
        lastLongitude: true,
        nearbyRadiusKm: true,
        lastLocationAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      subscribed: Boolean(subscription),
      endpoint: subscription?.endpoint ?? null,
      topics: subscription?.topics ?? ['wallet', 'nearby'],
      location:
        subscription?.lastLatitude != null && subscription?.lastLongitude != null
          ? {
              latitude: subscription.lastLatitude,
              longitude: subscription.lastLongitude,
              radiusKm: subscription.nearbyRadiusKm ?? 5,
              updatedAt: subscription.lastLocationAt ?? null,
            }
          : null,
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
    const location = sanitizeLocationContext(body?.location);
    const nearbyRadiusKm = sanitizeNearbyRadius(body?.nearbyRadiusKm) ?? location?.radiusKm ?? 5;

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ success: false, error: 'Valid wallet address required' }, { status: 400 });
    }

    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ success: false, error: 'Valid push subscription required' }, { status: 400 });
    }

    const lowerWallet = wallet.toLowerCase();
    const authorizedWallet = await getAuthorizedWalletForRequest(request, {
      walletAddress: lowerWallet,
      action: 'push:write',
      resource: lowerWallet,
    });

    if (!authorizedWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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
        lastLatitude: location?.latitude ?? null,
        lastLongitude: location?.longitude ?? null,
        nearbyRadiusKm,
        lastLocationAt: location ? new Date() : null,
      },
      create: {
        wallet: lowerWallet,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        topics,
        userAgent: request.headers.get('user-agent'),
        lastLatitude: location?.latitude ?? null,
        lastLongitude: location?.longitude ?? null,
        nearbyRadiusKm,
        lastLocationAt: location ? new Date() : null,
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
    const location = sanitizeLocationContext(body?.location);
    const nearbyRadiusKm = sanitizeNearbyRadius(body?.nearbyRadiusKm);

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ success: false, error: 'Valid wallet address required' }, { status: 400 });
    }

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ success: false, error: 'Endpoint required' }, { status: 400 });
    }

    const lowerWallet = wallet.toLowerCase();
    const authorizedWallet = await getAuthorizedWalletForRequest(request, {
      walletAddress: lowerWallet,
      action: 'push:write',
      resource: lowerWallet,
    });

    if (!authorizedWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.webPushSubscription.findFirst({
      where: {
        wallet: lowerWallet,
        endpoint,
        isActive: true,
      },
      select: {
        topics: true,
      },
    });

    const topics = body?.topics === undefined ? (existing?.topics ?? ['wallet', 'nearby']) : sanitizeTopics(body?.topics);

    await prisma.webPushSubscription.updateMany({
      where: {
        wallet: lowerWallet,
        endpoint,
        isActive: true,
      },
      data: {
        topics,
        lastLatitude: location?.latitude,
        lastLongitude: location?.longitude,
        nearbyRadiusKm: nearbyRadiusKm ?? location?.radiusKm ?? undefined,
        lastLocationAt: location ? new Date() : undefined,
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, topics, nearbyRadiusKm: nearbyRadiusKm ?? location?.radiusKm ?? null });
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

    const lowerWallet = wallet.toLowerCase();
    const authorizedWallet = await getAuthorizedWalletForRequest(request, {
      walletAddress: lowerWallet,
      action: 'push:write',
      resource: lowerWallet,
    });

    if (!authorizedWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.webPushSubscription.updateMany({
      where: {
        wallet: lowerWallet,
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
