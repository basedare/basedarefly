import 'server-only';

import { prisma } from '@/lib/prisma';

type DareImageLike = {
  imageUrl?: string | null;
  stakerAddress?: string | null;
};

export async function getStakerAvatarMap(stakerAddresses: Array<string | null | undefined>) {
  const uniqueWallets = [...new Set(
    stakerAddresses
      .map((wallet) => wallet?.trim().toLowerCase())
      .filter((wallet): wallet is string => Boolean(wallet))
  )];

  if (uniqueWallets.length === 0) {
    return new Map<string, string>();
  }

  const tags = await prisma.streamerTag.findMany({
    where: {
      walletAddress: { in: uniqueWallets },
      status: 'VERIFIED',
      pfpUrl: { not: null },
    },
    select: {
      walletAddress: true,
      pfpUrl: true,
    },
  });

  return new Map(
    tags
      .filter((tag): tag is { walletAddress: string; pfpUrl: string } => Boolean(tag.pfpUrl))
      .map((tag) => [tag.walletAddress.toLowerCase(), tag.pfpUrl])
  );
}

export function resolveDareImageUrl(
  dare: DareImageLike,
  stakerAvatarMap: Map<string, string>
): string | null {
  if (dare.imageUrl) {
    return dare.imageUrl;
  }

  const stakerWallet = dare.stakerAddress?.toLowerCase();
  if (!stakerWallet) {
    return null;
  }

  return stakerAvatarMap.get(stakerWallet) ?? null;
}
