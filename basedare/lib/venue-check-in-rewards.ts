import 'server-only';

import { composePassport } from '@/lib/creator-passport';
import { getVenueCheckInSignalPoints } from '@/lib/creator-passport-constants';
import { prisma } from '@/lib/prisma';

export type VenueCheckInReward = {
  pointsAwarded: number;
  firstVerifiedVisit: boolean;
};

/**
 * Award reputation for the first QR + GPS check-in at a venue.
 *
 * PointsEvent's unique wallet/type/source key is the anti-farm boundary: a
 * player can revisit and refresh venue memory, but cannot grind one venue for
 * Signal Points. Reward accounting is non-fatal so it never breaks presence.
 */
export async function awardVenueCheckInReward(input: {
  walletAddress: string;
  venueId: string;
  proofLevel: string;
}): Promise<VenueCheckInReward> {
  const walletAddress = input.walletAddress.trim().toLowerCase();
  const points = getVenueCheckInSignalPoints(input.proofLevel);

  if (!walletAddress || !input.venueId || points === 0) {
    return { pointsAwarded: 0, firstVerifiedVisit: false };
  }

  let createdCount = 0;

  try {
    const created = await prisma.pointsEvent.createMany({
      data: [
        {
          walletAddress,
          type: 'venue_check_in',
          sourceId: input.venueId,
          points,
        },
      ],
      skipDuplicates: true,
    });
    createdCount = created.count;
  } catch (error) {
    console.error('[VENUE_CHECK_IN_REWARD] Signal Points award failed (non-fatal):', error);
    return { pointsAwarded: 0, firstVerifiedVisit: false };
  }

  if (createdCount === 0) {
    return { pointsAwarded: 0, firstVerifiedVisit: false };
  }

  // PointsEvent is the source of truth. Passport persistence is a materialized
  // cache, so a cache-refresh failure must not hide a reward already recorded.
  await composePassport(walletAddress, { persist: true }).catch((error) => {
    console.error('[VENUE_CHECK_IN_REWARD] Passport refresh failed (non-fatal):', error);
  });

  return { pointsAwarded: points, firstVerifiedVisit: true };
}
