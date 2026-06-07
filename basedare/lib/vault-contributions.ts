import 'server-only';

import { prisma } from '@/lib/prisma';
import { composePassport } from '@/lib/creator-passport';
import { VAULT_REVIEW_POINTS } from '@/lib/creator-passport-constants';

export type VaultContributionInput = {
  walletAddress: string;
  venueId: string;
  type: 'review';
  sourceId?: string | null;
};

/**
 * Award Signal Points for a proof-gated vault contribution (reputation only).
 * - Idempotent + anti-farm: one award per (wallet, venue) via the PointsEvent
 *   unique key, so editing/re-reviewing the same venue never re-awards.
 * - Never throws: points accounting must not break the underlying review write.
 */
export async function onVaultContribution(input: VaultContributionInput): Promise<null> {
  if (input.type !== 'review') return null;
  const wallet = input.walletAddress?.trim().toLowerCase();
  if (!wallet || !input.venueId) return null;

  try {
    await prisma.pointsEvent.upsert({
      where: {
        walletAddress_type_sourceId: {
          walletAddress: wallet,
          type: 'vault_review',
          sourceId: input.venueId,
        },
      },
      update: {}, // already awarded — do not re-award
      create: {
        walletAddress: wallet,
        type: 'vault_review',
        sourceId: input.venueId,
        points: VAULT_REVIEW_POINTS,
      },
    });

    // Recompute + persist denormalized signalPoints on the passport.
    await composePassport(wallet);
  } catch (error) {
    console.error('[VAULT_POINTS] Signal Points award failed (non-fatal):', error);
  }

  return null;
}
