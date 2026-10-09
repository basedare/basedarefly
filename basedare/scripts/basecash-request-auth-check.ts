/* eslint-disable @typescript-eslint/no-require-imports -- Install boundary stubs before loading the route. */
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
const Module = require('node:module');
const original = Module._load;
const wallet = '0x0000000000000000000000000000000000000001';
let authorized = false;
let writes = 0;
let alerts = 0;
Module._load = function(name: string, ...args: unknown[]) {
  if (name === '@/lib/wallet-action-auth-server') return { getAuthorizedWalletForRequest: async (_req: unknown, options: unknown) => {
    assert.deepEqual(options, { walletAddress: wallet, action: 'basecash-credit-request', resource: 'test-venue:500' });
    return authorized ? wallet : null;
  } };
  if (name === '@/lib/basecash-auth') return {};
  if (name === '@/lib/telegram') return { alertBaseCashCreditPending: async () => { alerts++; } };
  if (name === '@/lib/basecash') return {
    getBaseCashVenueBySlug: async () => ({ id: 'test', name: 'Test venue', slug: 'test-venue' }),
    createBaseCashVenueCredit: async (input: { buyerWallet: string }) => { assert.equal(input.buyerWallet, wallet); writes++; return { id: 'test-credit', receiptCode: 'test', paymentStatus: 'PENDING', buyerWallet: wallet }; },
    mapBaseCashCredit: (row: unknown) => row, baseCashPilotMode: () => ({ simulatedPaymentEnabled: false }),
    buildBaseCashReceiptUrl: () => 'https://example.com/receipt/test', isMissingBaseCashTableError: () => false,
  };
  return original.call(this, name, ...args);
};
const { POST } = require('@/app/api/venues/[slug]/basecash/credits/route');
const request = () => new NextRequest('https://www.basedare.xyz/api/venues/test-venue/basecash/credits', { method: 'POST', body: JSON.stringify({ denominationPhp: 500, buyerWallet: wallet }) });
const params = { params: Promise.resolve({ slug: 'test-venue' }) };
async function main() {
  assert.equal((await POST(request(), params)).status, 401);
  assert.equal(writes, 0); assert.equal(alerts, 0);
  authorized = true;
  for (let i = 0; i < 3; i++) assert.equal((await POST(request(), params)).status, 200);
  assert.equal((await POST(request(), params)).status, 429);
  assert.equal(writes, 3); assert.equal(alerts, 3);
  console.log('PASS: unauthenticated wallet requests cannot write or alert; verified wallet requests are scoped and rate limited.');
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
