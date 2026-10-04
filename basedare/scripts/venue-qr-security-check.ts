import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
const owner = '0x' + '1'.repeat(40);
let session: unknown = null;
let issued = 0;
const Module = require('node:module');
const original = Module._load;
Module._load = function(name: string, ...args: unknown[]) {
  if (name === 'next-auth') return { getServerSession: async () => session };
  if (name === '@/lib/auth-options') return { authOptions: {} };
  if (name === '@/lib/prisma') return { prisma: { venue: { findUnique: async () => ({ claimedBy: owner }) } } };
  if (name === '@/lib/venues') return { getVenueQrPayloadByVenueId: async () => { issued++; return { qrValue: 'private-live-code' }; } };
  return original.call(this, name, ...args);
};
const { GET } = require('@/app/api/venues/id/[id]/qr/route');
const { authorizeVenueOperator } = require('@/lib/venue-operator-auth');
const { venueLocationError } = require('@/lib/venue-check-in-location');
const request = () => new NextRequest('https://example.com/api/venues/id/venue/qr');
const context = { params: Promise.resolve({ id: 'venue' }) };
async function main() {
  assert.equal((await GET(request(), context)).status, 401);
  session = { walletAddress: '0x' + '2'.repeat(40), token: 'session' };
  assert.equal((await GET(request(), context)).status, 403);
  assert.equal(issued, 0, 'Unauthorized readers never reach token issuance');
  session = { walletAddress: owner, token: 'session' };
  const response = await GET(request(), context);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(issued, 1);
  assert.equal((await authorizeVenueOperator(new NextRequest('https://example.com', { method: 'POST' }), 'venue')).status, 401);
  assert.equal(await authorizeVenueOperator(new NextRequest('https://example.com', { method: 'POST', headers: { Authorization: 'Bearer session' } }), 'venue'), null);
  const now = Date.now();
  assert.equal(venueLocationError({ accuracyMeters: 15, locationTimestamp: now }, 120, now), null);
  for (const point of [{}, { accuracyMeters: 200, locationTimestamp: now }, { accuracyMeters: 15, locationTimestamp: now - 120001 }, { accuracyMeters: 15, locationTimestamp: now + 30001 }]) assert.ok(venueLocationError(point, 120, now));
  console.log('PASS: anonymous/unrelated wallets denied, approved owner allowed, QR non-cacheable, mutation session enforced, stale/inaccurate/missing location rejected.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
