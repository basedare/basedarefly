import 'server-only';

import { createWalletNotification } from '@/lib/notifications';

export async function notifyTargetedDareReceived({
  walletAddress,
  title,
  shortId,
  bounty,
}: {
  walletAddress: string | null | undefined;
  title: string;
  shortId: string | null | undefined;
  bounty: number;
}) {
  if (!walletAddress) return;

  await createWalletNotification({
    wallet: walletAddress,
    type: 'DARE_CREATED',
    title: 'New Dare Received',
    message: `You were dared: "${title}" for ${bounty} USDC. Accept or decline to continue.`,
    link: `/dare/${shortId || ''}`,
    pushTopic: 'wallet',
  });
}

export async function notifyTargetedDareResponse({
  walletAddress,
  title,
  shortId,
  action,
  responderTag,
}: {
  walletAddress: string | null | undefined;
  title: string;
  shortId: string | null | undefined;
  action: 'ACCEPT' | 'DECLINE';
  responderTag?: string | null;
}) {
  if (!walletAddress) return;

  const actor = responderTag || 'Your target';
  const accepted = action === 'ACCEPT';

  await createWalletNotification({
    wallet: walletAddress,
    type: accepted ? 'DARE_ACCEPTED' : 'DARE_DECLINED',
    title: accepted ? 'Dare Accepted' : 'Dare Declined',
    message: accepted
      ? `${actor} accepted "${title}". Proof is now unlocked.`
      : `${actor} declined "${title}".`,
    link: `/dare/${shortId || ''}`,
    pushTopic: 'wallet',
  });
}
