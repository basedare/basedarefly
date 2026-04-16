import 'server-only';

import webpush from 'web-push';

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

let vapidConfigured = false;
let vapidAttempted = false;

function configureWebPush() {
  if (vapidAttempted) {
    return vapidConfigured;
  }

  vapidAttempted = true;

  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:hello@basedare.xyz';

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export async function sendWalletPush(input: SendWalletPushInput) {
  if (!input.wallet) return;
  if (!configureWebPush()) return;

  const wallet = input.wallet.toLowerCase();

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
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.url || '/dashboard',
    topic: input.topic,
  });

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
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
          return;
        }

        const message = error instanceof Error ? error.message : 'Unknown web push error';
        console.error('[WEB_PUSH] Send failed:', message);
      }
    })
  );
}
