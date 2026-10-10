import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { annotatePrimaryTags, selectPrimaryTag } from '@/lib/creator-identity';

export const PRIMARY_CREATOR_TAG_SELECT = {
  id: true,
  tag: true,
  walletAddress: true,
  bio: true,
  pfpUrl: true,
  followerCount: true,
  tags: true,
  verificationMethod: true,
  identityPlatform: true,
  identityHandle: true,
  identityVerificationCode: true,
  verifiedAt: true,
  twitterHandle: true,
  twitterVerified: true,
  twitchHandle: true,
  twitchVerified: true,
  youtubeHandle: true,
  youtubeVerified: true,
  kickHandle: true,
  kickVerificationCode: true,
  kickVerified: true,
  status: true,
  totalEarned: true,
  completedDares: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StreamerTagSelect;

export type PrimaryCreatorTag = Prisma.StreamerTagGetPayload<{
  select: typeof PRIMARY_CREATOR_TAG_SELECT;
}> & {
  isPrimary: boolean;
};

type FindPrimaryCreatorTagOptions = {
  statuses?: string[];
};

export async function findPrimaryCreatorTagForWallet(
  walletAddress: string,
  options: FindPrimaryCreatorTagOptions = {}
): Promise<PrimaryCreatorTag | null> {
  const statuses = options.statuses ?? ['ACTIVE', 'VERIFIED'];

  const tags = await prisma.streamerTag.findMany({
    where: {
      walletAddress: walletAddress.toLowerCase(),
      status: { in: statuses },
    },
    select: PRIMARY_CREATOR_TAG_SELECT,
    orderBy: { createdAt: 'desc' },
  });

  if (tags.length === 0) {
    return null;
  }

  const annotatedTags = annotatePrimaryTags(tags);
  return selectPrimaryTag(annotatedTags);
}

/** Resolve current public usernames in one query for a room or people list. */
export async function findPrimaryCreatorTagsForWallets(walletAddresses: string[]) {
  const wallets = [...new Set(walletAddresses.map((wallet) => wallet.toLowerCase()))];
  const result = new Map<string, PrimaryCreatorTag>();
  if (!wallets.length) return result;
  const tags = await prisma.streamerTag.findMany({
    where: { walletAddress: { in: wallets }, status: { in: ['ACTIVE', 'VERIFIED'] } },
    select: PRIMARY_CREATOR_TAG_SELECT,
    orderBy: { createdAt: 'desc' },
  });
  const grouped = new Map<string, typeof tags>();
  for (const tag of tags) {
    const wallet = tag.walletAddress.toLowerCase();
    grouped.set(wallet, [...(grouped.get(wallet) ?? []), tag]);
  }
  for (const [wallet, walletTags] of grouped) {
    const primary = selectPrimaryTag(annotatePrimaryTags(walletTags));
    if (primary) result.set(wallet, primary);
  }
  return result;
}
