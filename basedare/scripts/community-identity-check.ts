/* eslint-disable @typescript-eslint/no-require-imports -- Isolate database and auth boundaries. */
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { communityIdentityNotice, resolveCommunityIdentity } from '../lib/community-identity';

const Module = require('node:module');
const original = Module._load;
const legacyWallet = '0x1234567890AbcDEF1234567890aBcdef12345678';
const otherWallet = '0x0000000000000000000000000000000000000002';
let reads = 0;
let authorizedWallet: string | null = null;
let sessionWallet: string | null = null;
const records = [
  { id: 'legacy', tag: '@islander', walletAddress: legacyWallet, status: 'ACTIVE' },
  { id: 'pending', tag: '@pending', walletAddress: legacyWallet, status: 'PENDING' },
  { id: 'other', tag: '@other', walletAddress: otherWallet, status: 'VERIFIED' },
  { id: 'revoked', tag: '@revoked', walletAddress: otherWallet, status: 'REVOKED' },
];
Module._load = function(name: string, ...args: unknown[]) {
  if (name === '@/lib/prisma') return { prisma: { streamerTag: { findMany: async ({ where }: { where: { walletAddress: string | { equals?: string; in?: string[]; mode?: string }; status?: { in: string[] } } }) => {
    reads++;
    return records.filter(record => {
      const condition = where.walletAddress;
      const expected = typeof condition === 'string' ? [condition] : condition.in ?? [condition.equals!];
      const matches = expected.some(wallet => typeof condition !== 'string' && condition.mode === 'insensitive' ? wallet.toLowerCase() === record.walletAddress.toLowerCase() : wallet === record.walletAddress);
      return matches && (!where.status || where.status.in.includes(record.status));
    });
  } } } };
  if (name === 'next-auth') return { getServerSession: async () => sessionWallet ? { walletAddress: sessionWallet, token: 'session-token' } : null };
  if (name === '@/lib/auth-options') return { authOptions: {} };
  if (name === '@/lib/telegram') return { alertTagClaimSubmission: async () => undefined };
  if (name === '@/lib/wallet-action-auth-server') return { getAuthorizedWalletForRequest: async () => authorizedWallet };
  return original.call(this, name, ...args);
};

async function main() {
  const { GET } = require('@/app/api/tags/route');
  const response = await GET(new NextRequest(`https://basedare.xyz/api/tags?wallet=${legacyWallet.toLowerCase()}`));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.primaryTag.tag, '@islander');
  assert.deepEqual(resolveCommunityIdentity(payload.tags), { status: 'ready', tag: '@islander' });
  const beforeInvalid = reads;
  assert.equal((await GET(new NextRequest('https://basedare.xyz/api/tags?wallet=invalid'))).status, 400);
  assert.equal(reads, beforeInvalid);
  const { findPrimaryCreatorTagForWallet, findPrimaryCreatorTagsForWallets } = require('@/lib/creator-tag-resolver');
  assert.equal((await findPrimaryCreatorTagForWallet(legacyWallet.toLowerCase())).tag, '@islander');
  const batch = await findPrimaryCreatorTagsForWallets([legacyWallet.toLowerCase(), otherWallet]);
  assert.equal(batch.get(legacyWallet.toLowerCase()).tag, '@islander');
  assert.equal(batch.get(otherWallet).tag, '@other');
  assert.equal(resolveCommunityIdentity([{ tag: '@pending', status: 'PENDING' }]).status, 'pending');
  assert.equal(resolveCommunityIdentity([{ tag: '@revoked', status: 'REVOKED' }]).status, 'missing');
  for (const status of ['disconnected', 'checking', 'unknown'] as const) assert.notEqual(communityIdentityNotice({ status, tag: null }).action, 'claim');
  assert.equal(communityIdentityNotice({ status: 'pending', tag: '@pending' }).action, 'review');
  assert.equal(communityIdentityNotice({ status: 'missing', tag: null }).action, 'claim');
  assert.equal(communityIdentityNotice({ status: 'unknown', tag: null }).action, 'retry');
  const { resolveHostBaretag } = require('@/lib/meetups-server');
  sessionWallet = legacyWallet.toLowerCase();
  const request = new NextRequest('https://basedare.xyz/api/local-signals', { headers: { authorization: 'Bearer session-token' } });
  assert.equal((await resolveHostBaretag(request, sessionWallet)).tag, '@islander');
  // A different connected account cannot inherit the session account's name.
  assert.equal(await resolveHostBaretag(request, otherWallet), null);
  authorizedWallet = otherWallet;
  assert.equal((await resolveHostBaretag(request, otherWallet)).tag, '@other');
  console.log('PASS: legacy address casing, active/pending/revoked names, invalid input, batch isolation, honest UI notices and account-bound posting. No network/database writes.');
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
