import 'server-only';

import webpush from 'web-push';

import { calculateDistance } from '@/lib/geo';
import { prisma } from '@/lib/prisma';

export const PUSH_TOPICS = ['wallet', 'nearby', 'campaigns', 'venues'] as const;
export type PushTopic = (typeof PUSH_TOPICS)[number];

type SendWalletPushInput = {
  wallet: string | null | undefined;
  topic: PushTopic;
  title: string;
  body: string;
  url?: string | null;
};

export type PushSendResult = {
  configured: boolean;
  subscriptions: number;
  sent: number;
  skipped: number;
  failed: number;
  deactivated: number;
  reason?: 'missing_wallet' | 'not_configured' | 'cooldown_duplicate' | 'no_active_subscriptions';
};

type StoredSubscription = {
  id: string;
  wallet: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type PushPayloadInput = {
  title: string;
  body: string;
  url: string;
  topic: PushTopic;
  kind?: string;
};

type PushDeliveryConfig = {
  configured: boolean;
  publicKeyConfigured: boolean;
  privateKeyConfigured: boolean;
  publicKeySource: 'VAPID_PUBLIC_KEY' | 'NEXT_PUBLIC_VAPID_PUBLIC_KEY' | null;
  subject: string;
};

export type PushClientConfig = PushDeliveryConfig & {
  publicKey: string | null;
  clientConfigured: boolean;
  deliveryConfigured: boolean;
};

type RawPushDeliveryConfig = PushDeliveryConfig & {
  publicKey: string;
  privateKey: string;
};

let vapidConfiguredFor: string | null = null;
const BASE64URL_SECRET_RE = /^[A-Za-z0-9_-]+={0,2}$/;

const WALLET_PUSH_COOLDOWN_BY_TOPIC_MS: Record<Exclude<PushTopic, 'nearby'>, number> = {
  wallet: 1000 * 60 * 5,
  campaigns: 1000 * 60 * 8,
  venues: 1000 * 60 * 12,
};

function cleanEnvValue(value: string | undefined) {
  return (value ?? '').trim().replace(/^['"]+|['"]+$/g, '').trim();
}

function readBase64UrlEnv(name: string, options: { minLength?: number; maxLength?: number } = {}) {
  const value = cleanEnvValue(process.env[name]);
  const minLength = options.minLength ?? 1;
  const maxLength = options.maxLength ?? 200;
  return value.length >= minLength && value.length <= maxLength && BASE64URL_SECRET_RE.test(value) ? value : '';
}

function readPushDeliveryConfig(): RawPushDeliveryConfig {
  const vapidPublicKey = readBase64UrlEnv('VAPID_PUBLIC_KEY', { minLength: 80, maxLength: 120 });
  const nextPublicVapidKey = readBase64UrlEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', { minLength: 80, maxLength: 120 });
  const publicKey = vapidPublicKey || nextPublicVapidKey || '';
  const privateKey = readBase64UrlEnv('VAPID_PRIVATE_KEY', { minLength: 30, maxLength: 80 });
  const subject = cleanEnvValue(process.env.VAPID_SUBJECT) || 'mailto:hello@basedare.xyz';

  return {
    configured: Boolean(publicKey && privateKey),
    publicKeyConfigured: Boolean(publicKey),
    privateKeyConfigured: Boolean(privateKey),
    publicKey,
    privateKey,
    subject,
    publicKeySource: vapidPublicKey
      ? 'VAPID_PUBLIC_KEY'
      : nextPublicVapidKey
        ? 'NEXT_PUBLIC_VAPID_PUBLIC_KEY'
        : null,
  };
}

export function getPushDeliveryConfig(): PushDeliveryConfig {
  const config = readPushDeliveryConfig();
  return {
    configured: Boolean(config.publicKey && config.privateKey),
    publicKeyConfigured: Boolean(config.publicKey),
    privateKeyConfigured: Boolean(config.privateKey),
    publicKeySource: config.publicKeySource,
    subject: config.subject,
  };
}

export function getPushClientConfig(): PushClientConfig {
  const config = readPushDeliveryConfig();
  const publicKeyConfigured = Boolean(config.publicKey);
  const privateKeyConfigured = Boolean(config.privateKey);

  return {
    configured: publicKeyConfigured && privateKeyConfigured,
    publicKeyConfigured,
    privateKeyConfigured,
    publicKeySource: config.publicKeySource,
    subject: config.subject,
    publicKey: config.publicKey || null,
    clientConfigured: publicKeyConfigured,
    deliveryConfigured: privateKeyConfigured,
  };
}

function configureWebPush() {
  const config = readPushDeliveryConfig();
  if (!config.publicKey || !config.privateKey) {
    return false;
  }

  const configKey = `${config.subject}:${config.publicKey}:${config.privateKey}`;
  if (vapidConfiguredFor === configKey) {
    return true;
  }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  vapidConfiguredFor = configKey;
  return true;
}

function buildPushPayload(input: PushPayloadInput) {
  const id = `push-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return JSON.stringify({
    id,
    title: input.title,
    body: input.body,
    url: input.url,
    topic: input.topic,
    kind: input.kind,
    tag: `basedare-${input.topic}-${id}`,
    timestamp: Date.now(),
  });
}

async function recordPushDelivery(input: {
  subscriptionId?: string | null;
  wallet: string;
  topic: PushTopic;
  title: string;
  body: string;
  url?: string | null;
  status: 'SENT' | 'SKIPPED' | 'FAILED' | 'DEACTIVATED';
  reason?: string | null;
  errorMessage?: string | null;
}) {
  await prisma.webPushDelivery.create({
    data: {
      subscriptionId: input.subscriptionId ?? null,
      wallet: input.wallet,
      topic: input.topic,
      title: input.title,
      body: input.body,
      url: input.url ?? null,
      status: input.status,
      reason: input.reason ?? null,
      errorMessage: input.errorMessage ?? null,
    },
  }).catch(() => {});
}

async function shouldSkipWalletPush(input: {
  wallet: string;
  topic: Exclude<PushTopic, 'nearby'>;
  title: string;
  url?: string | null;
}) {
  const cooldownMs = WALLET_PUSH_COOLDOWN_BY_TOPIC_MS[input.topic];
  const since = new Date(Date.now() - cooldownMs);

  const recent = await prisma.webPushDelivery.findFirst({
    where: {
      wallet: input.wallet,
      topic: input.topic,
      status: 'SENT',
      title: input.title,
      url: input.url ?? null,
      createdAt: {
        gte: since,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(recent);
}

async function sendToStoredSubscription(
  subscription: StoredSubscription,
  payload: string,
  errorLabel: string,
  metadata: {
    wallet: string;
    topic: PushTopic;
    title: string;
    body: string;
    url?: string | null;
  }
) {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      payload
    );

    await recordPushDelivery({
      subscriptionId: subscription.id,
      wallet: metadata.wallet,
      topic: metadata.topic,
      title: metadata.title,
      body: metadata.body,
      url: metadata.url,
      status: 'SENT',
      reason: 'delivered',
    });

    return { ok: true as const };
  } catch (error: unknown) {
    const statusCode =
      typeof error === 'object' && error && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode)
        : null;

    if (statusCode === 404 || statusCode === 410) {
      await prisma.webPushSubscription.update({
        where: { id: subscription.id },
        data: { isActive: false },
      }).catch(() => {});

      await recordPushDelivery({
        subscriptionId: subscription.id,
        wallet: metadata.wallet,
        topic: metadata.topic,
        title: metadata.title,
        body: metadata.body,
        url: metadata.url,
        status: 'DEACTIVATED',
        reason: `endpoint_${statusCode}`,
      });

      return { ok: false as const, inactive: true as const };
    }

    const message = error instanceof Error ? error.message : 'Unknown web push error';
    console.error(`[WEB_PUSH] ${errorLabel}:`, message);
    await recordPushDelivery({
      subscriptionId: subscription.id,
      wallet: metadata.wallet,
      topic: metadata.topic,
      title: metadata.title,
      body: metadata.body,
      url: metadata.url,
      status: 'FAILED',
      reason: 'send_error',
      errorMessage: message,
    });
    return { ok: false as const, inactive: false as const };
  }
}

export async function sendWalletPush(input: SendWalletPushInput) {
  if (!input.wallet) {
    return {
      configured: false,
      subscriptions: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      deactivated: 0,
      reason: 'missing_wallet',
    } satisfies PushSendResult;
  }
  if (!configureWebPush()) {
    return {
      configured: false,
      subscriptions: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      deactivated: 0,
      reason: 'not_configured',
    } satisfies PushSendResult;
  }

  const wallet = input.wallet.toLowerCase();
  const url = input.url || '/dashboard';

  if (input.topic !== 'nearby') {
    const shouldSkip = await shouldSkipWalletPush({
      wallet,
      topic: input.topic,
      title: input.title,
      url,
    });

    if (shouldSkip) {
      await recordPushDelivery({
        wallet,
        topic: input.topic,
        title: input.title,
        body: input.body,
        url,
        status: 'SKIPPED',
        reason: 'cooldown_duplicate',
      });
      return {
        configured: true,
        subscriptions: 0,
        sent: 0,
        skipped: 1,
        failed: 0,
        deactivated: 0,
        reason: 'cooldown_duplicate',
      } satisfies PushSendResult;
    }
  }

  const subscriptions = await prisma.webPushSubscription.findMany({
    where: {
      wallet,
      isActive: true,
      topics: {
        has: input.topic,
      },
    },
    select: {
      id: true,
      wallet: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  if (subscriptions.length === 0) {
    await recordPushDelivery({
      wallet,
      topic: input.topic,
      title: input.title,
      body: input.body,
      url,
      status: 'SKIPPED',
      reason: 'no_active_subscriptions',
    });
    return {
      configured: true,
      subscriptions: 0,
      sent: 0,
      skipped: 1,
      failed: 0,
      deactivated: 0,
      reason: 'no_active_subscriptions',
    } satisfies PushSendResult;
  }

  const payload = buildPushPayload({
    title: input.title,
    body: input.body,
    url,
    topic: input.topic,
  });

  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      sendToStoredSubscription(subscription, payload, 'Send failed', {
        wallet,
        topic: input.topic,
        title: input.title,
        body: input.body,
        url,
      })
    )
  );

  return results.reduce<PushSendResult>(
    (summary, result) => {
      if (result.status === 'rejected') {
        summary.failed += 1;
        return summary;
      }
      if (result.value.ok) {
        summary.sent += 1;
        return summary;
      }
      if (result.value.inactive) {
        summary.deactivated += 1;
        return summary;
      }
      summary.failed += 1;
      return summary;
    },
    {
      configured: true,
      subscriptions: subscriptions.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      deactivated: 0,
    }
  );
}

type SendNearbyDarePushInput = {
  title: string;
  body: string;
  url: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
};

const NEARBY_PUSH_COOLDOWN_MS = 1000 * 60 * 20;

export async function sendNearbyDarePush(input: SendNearbyDarePushInput) {
  if (!configureWebPush()) {
    return;
  }

  const freshnessCutoff = new Date(Date.now() - 1000 * 60 * 60 * 12);
  const nearbyPushCutoff = new Date(Date.now() - NEARBY_PUSH_COOLDOWN_MS);
  const alertKey = `nearby:${input.url}`;

  const subscriptions = await prisma.webPushSubscription.findMany({
    where: {
      isActive: true,
      topics: {
        has: 'nearby',
      },
      lastLatitude: { not: null },
      lastLongitude: { not: null },
      lastLocationAt: { gte: freshnessCutoff },
      OR: [
        { lastNearbyPushAt: null },
        { lastNearbyPushAt: { lt: nearbyPushCutoff } },
        { lastNearbyPushKey: { not: alertKey } },
      ],
    },
    select: {
      id: true,
      wallet: true,
      endpoint: true,
      p256dh: true,
      auth: true,
      lastLatitude: true,
      lastLongitude: true,
      nearbyRadiusKm: true,
      lastNearbyPushAt: true,
      lastNearbyPushKey: true,
    },
  });

  if (subscriptions.length === 0) {
    return;
  }

  const payload = buildPushPayload({
    title: input.title,
    body: input.body,
    url: input.url,
    topic: 'nearby',
  });

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      if (subscription.lastLatitude == null || subscription.lastLongitude == null) {
        return;
      }

      const distanceKm = calculateDistance(
        input.latitude,
        input.longitude,
        subscription.lastLatitude,
        subscription.lastLongitude
      );

      const effectiveRadius = Math.max(
        0.5,
        Math.min(input.radiusKm, subscription.nearbyRadiusKm ?? 5)
      );

      if (distanceKm > effectiveRadius) {
        return;
      }

      try {
        const result = await sendToStoredSubscription(
          subscription,
          payload,
          'Nearby dare push failed',
          {
            wallet: subscription.wallet,
            topic: 'nearby',
            title: input.title,
            body: input.body,
            url: input.url,
          }
        );

        if (!result.ok) {
          return;
        }

        await prisma.webPushSubscription.update({
          where: { id: subscription.id },
          data: {
            lastNearbyPushAt: new Date(),
            lastNearbyPushKey: alertKey,
          },
        }).catch(() => {});
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown nearby push error';
        console.error('[WEB_PUSH] Nearby dare post-send update failed:', message);
      }
    })
  );
}

export async function sendTestPushToWalletDevice(input: {
  wallet: string | null | undefined;
  endpoint: string | null | undefined;
}) {
  if (!input.wallet || !input.endpoint) {
    return { success: false as const, reason: 'missing_target' as const };
  }

  if (!configureWebPush()) {
    return { success: false as const, reason: 'not_configured' as const };
  }

  const subscription = await prisma.webPushSubscription.findFirst({
    where: {
      wallet: input.wallet.toLowerCase(),
      endpoint: input.endpoint,
      isActive: true,
    },
    select: {
      id: true,
      wallet: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  if (!subscription) {
    return { success: false as const, reason: 'not_found' as const };
  }

  const payload = buildPushPayload({
    title: 'BaseDare alerts on',
    body: 'This device can receive wallet, nearby, and venue alerts.',
    url: '/dashboard',
    topic: 'wallet',
    kind: 'test',
  });

  const result = await sendToStoredSubscription(subscription, payload, 'Test push failed', {
    wallet: subscription.wallet,
    topic: 'wallet',
    title: 'BaseDare alerts on',
    body: 'This device can receive wallet, nearby, and venue alerts.',
    url: '/dashboard',
  });
  if (!result.ok) {
    return { success: false as const, reason: result.inactive ? 'inactive' as const : 'send_failed' as const };
  }

  return { success: true as const };
}
