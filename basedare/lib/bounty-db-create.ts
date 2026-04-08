import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function generateShortId(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateInviteToken(): string {
  return `inv_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

type CreateDatabaseBackedBountyInput = {
  db?: Prisma.TransactionClient;
  title: string;
  missionMode: 'IRL' | 'STREAM';
  missionTag: string | null;
  amount: number;
  streamerTag: string | null;
  streamId: string;
  tagVerified: boolean;
  stakerAddress?: string | null;
  referrerTag?: string | null;
  referrerAddress?: string | null;
  targetWalletAddress?: string | null;
  imageUrl?: string | null;
  imageCid?: string | null;
  requireSentinel?: boolean;
  venueId?: string | null;
  isNearbyDare?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  geohash?: string | null;
  locationLabel?: string | null;
  discoveryRadiusKm?: number | null;
  isSimulated?: boolean;
};

export async function createDatabaseBackedBounty(input: CreateDatabaseBackedBountyInput) {
  const db = input.db ?? prisma;
  const isOpenBounty = !input.streamerTag;
  const isAwaitingClaim = !isOpenBounty && !input.tagVerified;
  const inviteToken = isAwaitingClaim ? generateInviteToken() : null;
  const claimDeadline = isAwaitingClaim ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const shortId = generateShortId();
  const dareStatus = isAwaitingClaim ? 'AWAITING_CLAIM' : 'PENDING';

  const dare = await db.dare.create({
    data: {
      title: input.title,
      missionMode: input.missionMode,
      tag: input.missionTag,
      bounty: input.amount,
      streamerHandle: isOpenBounty ? null : input.streamerTag,
      status: dareStatus,
      streamId: input.streamId,
      txHash: null,
      isSimulated: input.isSimulated ?? true,
      expiresAt,
      shortId,
      referrerTag: input.referrerTag || null,
      referrerAddress: input.referrerAddress || null,
      stakerAddress: input.stakerAddress || null,
      imageUrl: input.imageUrl || null,
      imageCid: input.imageCid || null,
      requireSentinel: Boolean(input.requireSentinel),
      inviteToken,
      claimDeadline,
      targetWalletAddress: input.tagVerified ? input.targetWalletAddress || null : null,
      venueId: input.venueId || null,
      isNearbyDare: Boolean(input.isNearbyDare),
      latitude: input.isNearbyDare ? input.latitude || null : null,
      longitude: input.isNearbyDare ? input.longitude || null : null,
      geohash: input.isNearbyDare ? input.geohash || null : null,
      locationLabel: input.isNearbyDare ? input.locationLabel || null : null,
      discoveryRadiusKm: input.isNearbyDare ? input.discoveryRadiusKm || null : null,
    },
  });

  const inviteLink =
    isAwaitingClaim && input.streamerTag
      ? `/claim-tag?invite=${inviteToken}&handle=${encodeURIComponent(input.streamerTag.replace('@', ''))}`
      : null;

  return {
    dare,
    shortId,
    expiresAt,
    inviteToken,
    inviteLink,
    claimDeadline,
    isAwaitingClaim,
    isOpenBounty,
    dareStatus,
  };
}
