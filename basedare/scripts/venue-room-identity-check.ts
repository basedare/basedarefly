/* eslint-disable @typescript-eslint/no-require-imports -- Isolated module-loader mock; no live database or notifications. */
import assert from 'node:assert/strict';
const wallet = '0x' + '1'.repeat(40);
const guest = '0x' + '2'.repeat(40);
let queries = 0;
const now = new Date();
const expiry = new Date(now.getTime() + 60000);
const tag = { id: 'tag', tag: '@islander', walletAddress: wallet, status: 'VERIFIED', pfpUrl: null, createdAt: now, updatedAt: now };
const message = (id: string, author: string, metadataJson = {}) => ({ id, walletAddress: author, displayName: '0x1111...1111', avatarUrl: null, body: 'Meet at Gados', metadataJson, createdAt: now, expiresAt: expiry });
const Module = require('node:module');
const original = Module._load;
Module._load = function(name: string, ...args: unknown[]) {
  if (name === '@/lib/notifications') return { createWalletNotification: async () => {} };
  if (name === '@/lib/prisma') return { prisma: {
    streamerTag: { findMany: async (args: { where: { status: { in: string[] } } }) => { queries++; assert.deepEqual(args.where.status.in, ['ACTIVE', 'VERIFIED']); return [tag]; } },
    venue: { findUnique: async () => ({ id: 'gados', slug: 'gados', name: 'Gados', latitude: 9.7867894, longitude: 126.1621528, status: 'ACTIVE', checkInRadiusMeters: 120 }) },
    venueRoomPresence: { findUnique: async () => null, findMany: async () => [{ id: 'presence', walletAddress: wallet, displayName: 'old-wallet-label', avatarUrl: null, source: 'GPS', lastSeenAt: now, expiresAt: expiry }] },
    venueCheckIn: { findMany: async () => [], findFirst: async () => null },
    venueRoomMessage: { findMany: async () => [message('known', wallet), message('guest', guest), { ...message('receipt', wallet, { kind: 'receipt' }), displayName: 'Recorded actor' }] },
  } };
  return original.call(this, name, ...args);
};
const { getVenueRoomSnapshot } = require('@/lib/venue-room');
const { findPrimaryCreatorTagsForWallets } = require('@/lib/creator-tag-resolver');
async function main() {
  assert.equal((await findPrimaryCreatorTagsForWallets([])).size, 0);
  assert.equal(queries, 0);
  const locked = await getVenueRoomSnapshot({ slug: 'gados', walletAddress: guest });
  assert.equal(locked.access.unlocked, false);
  assert.equal(locked.messages.length, 0);
  assert.equal(queries, 0, 'Locked rooms must not query public identities or expose messages');
  const room = await getVenueRoomSnapshot({ slug: 'gados', walletAddress: wallet, latitude: 9.7867894, longitude: 126.1621528 });
  assert.equal(room.messages.find((m: {id: string}) => m.id === 'known').displayName, '@islander');
  assert.equal(room.messages.find((m: {id: string}) => m.id === 'known').mine, true);
  assert.equal(room.messages.find((m: {id: string}) => m.id === 'guest').displayName, 'Guest');
  assert.equal(room.messages.find((m: {id: string}) => m.id === 'receipt').displayName, 'Recorded actor');
  assert.equal(room.whoHere[0].displayName, '@islander');
  assert.equal(queries, 2, 'Batch identity reads once for presence and once for messages');
  console.log('PASS: current usernames replace historical wallet labels; guests, receipt labels, own-message state, room access and bounded queries preserved.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
