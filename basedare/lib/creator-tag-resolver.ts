import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { annotatePrimaryTags, selectPrimaryTag } from '@/lib/creator-identity';

export const PRIMARY_CREATOR_TAG_SELECT = {
  id: true,
  tag: true,
  walletAddress: true,
  bio: true,
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
  revokedAt: true,
  revokedBy: true,
  revokeReason: true,
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
