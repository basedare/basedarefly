import 'server-only';

import { prisma } from '@/lib/prisma';
import { sendWalletPush, type PushTopic } from '@/lib/web-push';

type CreateWalletNotificationInput = {
  wallet: string | null | undefined;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  pushTopic?: PushTopic;
};

export async function createWalletNotification(input: CreateWalletNotificationInput) {
  if (!input.wallet) {
    return null;
  }

  const wallet = input.wallet.toLowerCase();

  const notification = await prisma.notification.create({
    data: {
      wallet,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link || null,
    },
  });

  void sendWalletPush({
    wallet,
    topic: input.pushTopic ?? 'wallet',
    title: input.title,
    body: input.message,
    url: input.link || '/dashboard',
  }).catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown push fanout error';
    console.error('[NOTIFICATIONS] Push fanout failed:', message);
  });

  return notification;
}
