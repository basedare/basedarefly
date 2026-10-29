/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the actual route with isolated session/DB boundaries. */
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
const Module = require('node:module');
const original = Module._load;
const wallet = '0x1111111111111111111111111111111111111111';
let session: { walletAddress: string; token: string } | null = null;
const config = { enabled: true, merchantPermission: true, merchantQrTested: true, merchantReceiptConfirmed: true, testedAt: new Date(Date.now() - 1000).toISOString(), testReference: 'private-test-reference', testedNetwork: 'Base', testedAsset: 'USDC', qrMethod: 'QR_PH_MERCHANT' };
let changedOwner = false;
let stoppedPilot = false;
let locked = false;
const records = new Map();
const prisma = {
  venue: { findUnique: async () => ({ id: 'venue', name: 'Fixture venue', claimedBy: wallet, metadataJson: { localSpendPilot: config } }) },
  founderEvent: { findMany: async () => [] },
  $transaction: async (work: (tx: unknown) => Promise<void>) => {
    locked = false;
    return work({
      $queryRaw: async () => { locked = true; return []; },
      venue: { findUniqueOrThrow: async () => ({ claimedBy: changedOwner ? 'other-owner' : wallet, metadataJson: { localSpendPilot: { ...config, enabled: !stoppedPilot } } }) },
      founderEvent: { upsert: async (input: { where: { dedupeKey: string }; create: unknown }) => { assert.equal(locked, true); if (!records.has(input.where.dedupeKey)) records.set(input.where.dedupeKey, input.create); } },
    });
  },
};
Module._load = function(name: string, ...args: unknown[]) {
  if (name === 'next-auth') return { getServerSession: async () => session };
  if (name === '@/lib/auth-options') return { authOptions: {} };
  if (name === '@/lib/prisma') return { prisma };
  return original.call(this, name, ...args);
};
async function main() {
  const { GET, POST } = require('../app/api/venues/[slug]/local-spend/route');
  const params = { params: Promise.resolve({ slug: 'fixture-venue' }) };
  const record = { recordId: '3dfb0c28-d720-44bb-82ab-8b3b4e3c4b9a', consent: true, outcome: 'COMPLETED', evidence: 'MERCHANT_CONFIRMED', stablecoin: 'USDC', network: 'Base', qrMethod: 'QR_PH_MERCHANT', amountSpent: '2.10', elapsedSeconds: 30, phpReceived: '120', receiptReference: 'merchant-1', providerReference: 'provider-1' };
  const request = (body = record, token = 'fixture-token') => new NextRequest('https://basedare.invalid/api/venues/fixture-venue/local-spend', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify({ action: 'record', record: body }) });
  const guest = await GET(new NextRequest('https://basedare.invalid/api/venues/fixture-venue/local-spend'), params);
  const publicBody = await guest.json();
  assert.equal(publicBody.data.active.network, 'Base');
  assert.equal(JSON.stringify(publicBody).includes('private-test-reference'), false);
  assert.equal((await POST(request(), params)).status, 403); assert.equal(records.size, 0);
  session = { walletAddress: wallet, token: 'fixture-token' };
  assert.equal((await POST(request(record, 'wrong-token'), params)).status, 401);
  assert.equal((await POST(request({ ...record, network: 'wrong-chain' }), params)).status, 400);
  assert.equal((await POST(request({ ...record, providerReference: '' }), params)).status, 400);
  changedOwner = true; assert.equal((await POST(request(), params)).status, 500); assert.equal(records.size, 0);
  changedOwner = false; stoppedPilot = true; assert.equal((await POST(request(), params)).status, 500); assert.equal(records.size, 0);
  stoppedPilot = false;
  assert.equal((await POST(request(), params)).status, 200);
  assert.equal((await POST(request(), params)).status, 200); assert.equal(records.size, 1);
  console.log('PASS: actual local-spend route protects guest/private data, auth, tested rails, confirmation, owner/pilot races and record-ID retry. Isolated fixture only; no provider, chain or database access.');
}
main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
