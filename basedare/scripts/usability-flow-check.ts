/* eslint-disable @typescript-eslint/no-require-imports -- Stub external boundaries before loading server modules. */
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
const Module = require('node:module');
const original = Module._load;
const wallet = '0x0000000000000000000000000000000000000001';
process.env.NEXT_PUBLIC_NETWORK = 'mainnet';
process.env.BASE_MAINNET_RPC_URL = 'https://configured.invalid';
let mode = 'wrong-chain';
const writes: unknown[] = [];
let existing: { slug: string }[] = [];
let messageReads = 0;
let tagReads = 0;
const now = new Date();
const db = {
  venue: {
    findMany: async () => existing,
    createMany: async (input: { data: unknown[]; skipDuplicates: boolean }) => { assert.equal(input.skipDuplicates, true); writes.push(...input.data); },
    findUnique: async () => ({ id: 'venue', slug: 'test', name: 'Test', latitude: 9.79, longitude: 126.16, status: 'ACTIVE', checkInRadiusMeters: 120 }),
  },
  venueCheckIn: { findFirst: async () => null, findMany: async () => [] },
  venueRoomPresence: { findUnique: async () => null, findMany: async () => [{ id: 'presence', walletAddress: wallet, displayName: '0x0000...0001', avatarUrl: null, source: 'GPS', lastSeenAt: now, expiresAt: new Date(+now + 60000) }] },
  venueRoomMessage: { findMany: async () => { messageReads++; return [{ id: 'message', walletAddress: wallet, displayName: '0x0000...0001', avatarUrl: null, body: 'Hello', metadataJson: null, createdAt: now, expiresAt: new Date(+now + 60000) }]; } },
  streamerTag: { findMany: async () => { tagReads++; return [{ id: 'tag', tag: '@islander', walletAddress: wallet, status: 'ACTIVE', pfpUrl: null }]; } },
};
Module._load = function(name: string, ...args: unknown[]) {
  if (name === '@/lib/prisma') return { prisma: db };
  if (name === '@/lib/notifications') return { createWalletNotification: async () => undefined };
  if (name === 'viem') {
    const real = original.call(this, name, ...args);
    return { ...real, http: (url: string, options: { timeout: number; retryCount: number }) => {
      assert.equal(options.timeout, 2000); assert.equal(options.retryCount, 0); return url;
    }, createPublicClient: (input: { transport: string }) => ({
      getChainId: async () => mode === 'wrong-chain' && input.transport.includes('configured') ? 84532 : 8453,
      readContract: async (args: { address: string }) => { assert.equal(args.address.toLowerCase(), '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'); if (mode === 'failed') throw Error('offline'); return 1234567n; },
      getBalance: async () => { if (mode === 'failed' || mode === 'partial') throw Error('offline'); return 1000000000000000n; },
    }) };
  }
  return original.call(this, name, ...args);
};

async function main() {
  const { GET } = require('@/app/api/wallet/balance/route');
  assert.equal((await GET(new NextRequest('https://basedare.xyz/api/wallet/balance?address=bad'))).status, 400);
  const request = () => new NextRequest(`https://basedare.xyz/api/wallet/balance?address=${wallet}`);
  let response = await GET(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { chainId: 8453, usdc: '1234567', eth: '1000000000000000' });
  mode = 'partial'; response = await GET(request());
  assert.deepEqual(await response.json(), { chainId: 8453, usdc: '1234567', eth: null });
  mode = 'failed'; response = await GET(request());
  assert.equal(response.status, 503); assert.equal((await response.json()).usdc, null);
  mode = 'recovered'; assert.equal((await GET(request())).status, 200);
  const { ensureCuratedVenueRecords } = require('@/lib/curated-venues');
  existing = [{ slug: 'hideaway' }]; await ensureCuratedVenueRecords(['hideaway']); assert.equal(writes.length, 0);
  await ensureCuratedVenueRecords(['hideaway', 'gados', 'gados']); assert.equal(writes.length, 1);
  assert.equal((writes[0] as { slug: string }).slug, 'gados');
  const { roomDisplayName } = require('@/lib/room-display-name');
  assert.equal(roomDisplayName(wallet, '@@islander'), '@islander');
  assert.match(roomDisplayName(wallet), /^Explorer [A-F0-9]{6}$/);
  assert.equal(roomDisplayName(wallet.toUpperCase()), roomDisplayName(wallet));
  const { getVenueRoomSnapshot } = require('@/lib/venue-room');
  let snapshot = await getVenueRoomSnapshot({ slug: 'test', walletAddress: wallet });
  assert.equal(snapshot.access.unlocked, false); assert.equal(messageReads, 0);
  snapshot = await getVenueRoomSnapshot({ slug: 'test', walletAddress: wallet, latitude: 9.79, longitude: 126.16 });
  assert.equal(snapshot.messages[0].displayName, '@islander');
  assert.equal(snapshot.whoHere[0].displayName, '@islander');
  assert.equal(snapshot.messages[0].mine, true); assert.equal(tagReads, 2);
  console.log('PASS: wallet chain/fallback/partial failure/recovery; curated insert-only discovery; current room handles and locked access. No network or database writes performed.');
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
