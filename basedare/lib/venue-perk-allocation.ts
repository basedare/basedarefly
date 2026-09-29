import type { Prisma } from '@prisma/client';
import { getActiveVenuePerk } from './venue-perks';

/** Caller locks the venue row before checking inventory and creating the check-in. */
export async function availablePerkForWallet(tx: Prisma.TransactionClient, venueId: string, metadata: unknown, wallet: string, now: Date) {
  const perk = getActiveVenuePerk(metadata, now);
  if (!perk?.offerId) return perk;
  const where = { venueId, metadataJson: { path: ['venuePerk', 'offerId'], equals: perk.offerId } };
  const [issued, previous] = await Promise.all([
    tx.venueCheckIn.count({ where }),
    tx.venueCheckIn.count({ where: { ...where, walletAddress: { equals: wallet, mode: 'insensitive' } } }),
  ]);
  // Issued rewards reserve stock through the offer, even if later expired/revoked.
  // Revoking a check-in must not replenish an item staff may already have handed over.
  if (previous || (perk.quantityLimit != null && issued >= perk.quantityLimit)) return null;
  return perk;
}
