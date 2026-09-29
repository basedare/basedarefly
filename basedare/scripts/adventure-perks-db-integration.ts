import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient, type Prisma } from '@prisma/client';
import { availablePerkForWallet } from '../lib/venue-perk-allocation';
import { redeemVenuePerk } from '../lib/venue-perk-redemption';
import { buildVenuePerkUnlock, writeVenuePerkToMetadata } from '../lib/venue-perks';

const url = new URL(process.env.DATABASE_URL || '');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.includes('_test')) throw new Error('Disposable local test database required.');
const db = new PrismaClient();
const now = new Date();
const owner = '0x1111111111111111111111111111111111111111';
async function main() {
  const offer = writeVenuePerkToMetadata({}, { enabled: true, title: 'Test coffee', offerId: 'test-offer', quantityLimit: 1,
    startsAt: new Date(now.getTime() - 1000).toISOString(), endsAt: new Date(now.getTime() + 3600000).toISOString(), conditions: 'Complete test activity' });
  const venue = await db.venue.create({ data: { slug: 'adventure-perks-test', name: 'Test only', latitude: 0, longitude: 0, claimedBy: owner, metadataJson: offer.metadata as Prisma.InputJsonObject } });
  const reserve = (wallet: string) => db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Venue" WHERE id = ${venue.id} FOR UPDATE`;
    const perk = await availablePerkForWallet(tx, venue.id, offer.metadata, wallet, now);
    if (!perk) return null;
    const id = randomUUID();
    return tx.venueCheckIn.create({ data: { id, venueId: venue.id, walletAddress: wallet,
      metadataJson: { venuePerk: buildVenuePerkUnlock({ perk, checkInId: id, scannedAt: now }) } as Prisma.InputJsonObject } });
  });
  const claims = await Promise.all([reserve('guest-a'), reserve('guest-b')]);
  assert.equal(claims.filter(Boolean).length, 1, 'one available reward is reserved once');
  const claim = claims.find(Boolean)!;
  assert.equal(await reserve(claim.walletAddress), null, 'a second session cannot reserve again');
  await assert.rejects(() => redeemVenuePerk(db, claim.id, { internal: false, wallet: 'not-owner' }), /Only the claimed venue wallet/);
  const receipts = await Promise.all([redeemVenuePerk(db, claim.id, { internal: false, wallet: owner }, now), redeemVenuePerk(db, claim.id, { internal: false, wallet: owner }, now)]);
  assert.equal(receipts.filter((r) => r.redeemedNow).length, 1, 'only one request redeems');
  const memory = await db.venueMemory.findFirstOrThrow({ where: { venueId: venue.id } });
  assert.equal(memory.perkRedemptionCount, 1, 'concurrent retry does not inflate memory');
  await db.venueCheckIn.update({ where: { id: claim.id }, data: { status: 'REVOKED' } });
  assert.equal(await reserve('guest-after-revocation'), null, 'revoking a redeemed visit cannot replenish stock already spent');
  const expiredId = randomUUID();
  await db.venueCheckIn.create({ data: { id: expiredId, venueId: venue.id, walletAddress: 'guest-c', metadataJson: { venuePerk: { ...receipts[0].perk, checkInId: expiredId, redeemedAt: null, expiresAt: new Date(now.getTime() - 1).toISOString() } } as Prisma.InputJsonObject } });
  await assert.rejects(() => redeemVenuePerk(db, expiredId, { internal: false, wallet: owner }, now), /expired/);
  const revokedId = randomUUID();
  await db.venueCheckIn.create({ data: { id: revokedId, venueId: venue.id, walletAddress: 'guest-d', status: 'REVOKED', metadataJson: { venuePerk: { ...receipts[0].perk, checkInId: revokedId, redeemedAt: null } } as Prisma.InputJsonObject } });
  await assert.rejects(() => redeemVenuePerk(db, revokedId, { internal: false, wallet: owner }, now), /confirmed check-in/);
  console.log('PASS: concurrent allocation/redemption, owner authorization, expiry, revoked check-ins and one-count memory.');
}
main().finally(() => db.$disconnect()).catch((error) => { console.error(error); process.exitCode = 1; });
