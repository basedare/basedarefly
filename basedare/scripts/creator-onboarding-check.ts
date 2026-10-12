/* eslint-disable @typescript-eslint/no-require-imports -- Stub session/database boundaries; verify signatures locally. */
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { buildWalletActionAuthHeaders } from '../lib/wallet-action-auth';
import { creatorPassportAuthorization } from '../lib/creator-passport-auth';
import { EXPLICIT_MISSIONS, MISSION_STYLE_OPTIONS, AVAILABILITY_OPTIONS } from '../lib/creator-passport-constants';

const Module = require('node:module');
const original = Module._load;
const writes: string[] = [];
Module._load = function(name: string, ...args: unknown[]) {
  if (name === 'next-auth') return { getServerSession: async () => null };
  if (name === '@/lib/auth-options') return { authOptions: {} };
  if (name === '@/lib/creator-passport') return {
    EXPLICIT_MISSIONS, MISSION_STYLE_OPTIONS, AVAILABILITY_OPTIONS,
    recordExplicitMission: async (_wallet: string, mission: string) => { writes.push(mission); return { saved: true }; },
    updatePassport: async () => { writes.push('settings'); return { saved: true }; },
  };
  if (name === 'viem') {
    const real = original.call(this, name, ...args);
    return { ...real, createPublicClient: () => ({ verifyMessage: real.verifyMessage }) };
  }
  return original.call(this, name, ...args);
};

async function main() {
  const account = privateKeyToAccount(generatePrivateKey()); // Ephemeral, offline and unfunded.
  const { POST } = require('../app/api/creators/passport/mission/route');
  const { PATCH } = require('../app/api/creators/passport/route');
  const headers = (mission?: 'open_grid') => buildWalletActionAuthHeaders({
    walletAddress: account.address, ...creatorPassportAuthorization(account.address, mission),
    signatureScope: 'action', forceFreshSignature: true,
    signMessageAsync: ({ message }) => account.signMessage({ message }),
  });
  const request = (method: string, route: string, auth: Record<string, string>, body: unknown) => new NextRequest('https://basedare.invalid' + route, {
    method, headers: { 'content-type': 'application/json', ...auth }, body: JSON.stringify(body),
  });
  const mission = { walletAddress: account.address, missionId: 'open_grid' };
  assert.equal((await POST(request('POST', '/api/creators/passport/mission', {}, mission))).status, 401);
  const settingsAuth = await headers();
  assert.equal((await POST(request('POST', '/api/creators/passport/mission', settingsAuth, mission))).status, 401);
  assert.deepEqual(writes, []);
  assert.equal((await POST(request('POST', '/api/creators/passport/mission', await headers('open_grid'), mission))).status, 200);
  assert.deepEqual(writes, ['open_grid']);
  assert.equal((await PATCH(request('PATCH', '/api/creators/passport', settingsAuth, { walletAddress: account.address, homeZone: 'General Luna' }))).status, 200);
  assert.deepEqual(writes, ['open_grid', 'settings']);
  assert.equal((await POST(request('POST', '/api/creators/passport/mission', await headers('open_grid'), { ...mission, missionId: 'first_spark_applied' }))).status, 401);
  assert.deepEqual(writes, ['open_grid', 'settings']);
  console.log('PASS: creator settings/mission signatures reach their matching routes; unsigned, wrong-action and wrong-mission requests cannot write. No RPC, database or production writes.');
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
