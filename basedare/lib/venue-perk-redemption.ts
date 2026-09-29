import type { Prisma, PrismaClient } from '@prisma/client';
import { getVenuePerkSnapshot, markVenuePerkRedeemedInMetadata } from './venue-perks';

export class PerkRedemptionError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function redeemVenuePerk(db: Pick<PrismaClient, '$transaction'>, id: string, actor: { internal: boolean; wallet: string }, now = new Date()) {
  return db.$transaction(async (tx) => {
    const target = await tx.venueCheckIn.findUnique({ where: { id }, select: { venueId: true } });
    if (!target) throw new PerkRedemptionError('Check-in not found', 404);
    // All allocation/edit/redemption paths take the venue lock first.
    await tx.$queryRaw`SELECT id FROM "Venue" WHERE id = ${target.venueId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "VenueCheckIn" WHERE id = ${id} FOR UPDATE`;
    const checkIn = await tx.venueCheckIn.findUniqueOrThrow({ where: { id }, include: { venue: { select: { id: true, slug: true, name: true, claimedBy: true } } } });
    if (!actor.internal && (!actor.wallet || checkIn.venue.claimedBy?.toLowerCase() !== actor.wallet.toLowerCase())) throw new PerkRedemptionError('Only the claimed venue wallet can redeem this perk', 403);
    if (checkIn.status !== 'CONFIRMED') throw new PerkRedemptionError('A confirmed check-in is required', 409);
    const previous = getVenuePerkSnapshot(checkIn.metadataJson);
    if (!previous || previous.checkInId !== id) throw new PerkRedemptionError('This check-in did not unlock a venue perk', 404);
    if (previous.redeemedAt) return { perk: previous, venue: checkIn.venue, redeemedNow: false };
    if (!Number.isFinite(Date.parse(previous.expiresAt)) || Date.parse(previous.expiresAt) <= now.getTime()) throw new PerkRedemptionError('This venue perk has expired', 409);
    const { metadata, perk } = markVenuePerkRedeemedInMetadata(checkIn.metadataJson, { redeemedAt: now, redeemedBy: actor.internal ? 'internal' : actor.wallet });
    if (!perk) throw new PerkRedemptionError('Perk unavailable', 409);
    await tx.venueCheckIn.update({ where: { id }, data: { metadataJson: metadata as Prisma.InputJsonObject } });
    const start = new Date(checkIn.scannedAt); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86400000);
    await tx.venueMemory.upsert({
      where: { venueId_bucketType_bucketStartAt: { venueId: target.venueId, bucketType: 'DAY', bucketStartAt: start } },
      update: { bucketEndAt: end, perkRedemptionCount: { increment: 1 } },
      create: { venueId: target.venueId, bucketType: 'DAY', bucketStartAt: start, bucketEndAt: end,
        checkInCount: 0, uniqueVisitorCount: 0, dareCount: 0, completedDareCount: 0, proofCount: 0, perkRedemptionCount: 1,
        metadataJson: { createdBy: 'venue-perk-redemption' } },
    });
    return { perk, venue: checkIn.venue, redeemedNow: true };
  });
}
