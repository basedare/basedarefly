/** Actual optimized local server. No session/auth stubs or hosted fixtures. */
import assert from 'node:assert/strict';
import { privateKeyToAccount } from 'viem/accounts';
import { buildWalletActionMessage } from '@/lib/wallet-action-auth';
const origin = 'http://localhost:3217';
const account = privateKeyToAccount(('0x' + '1'.repeat(64)) as `0x${string}`);
const wallet = account.address.toLowerCase();
async function headers(action: string) {
  const issuedAt = new Date().toISOString();
  return { Origin: origin, 'Content-Type': 'application/json', 'x-basedare-wallet': wallet, 'x-basedare-wallet-issued-at': issuedAt, 'x-basedare-wallet-signature': await account.signMessage({ message: buildWalletActionMessage({ walletAddress: wallet, action, resource: 'community', issuedAt }) }) };
}
async function read(view: string, extra: Record<string, string> = {}) {
  const r = await fetch(origin + '/api/social?' + new URLSearchParams({ view, wallet, ...extra }), { headers: await headers('social:read') });
  assert.equal(r.status, 200, await r.clone().text()); return (await r.json()).data;
}
async function write(kind: string, key: string, action: string) {
  const r = await fetch(origin + '/api/social', { method: 'POST', headers: await headers('social:write'), body: JSON.stringify({ wallet, kind, key, action }) });
  assert.equal(r.status, 200, await r.clone().text()); return (await r.json()).data;
}
async function main() {
  assert.equal((await fetch(origin + '/community/posts/local-following-story')).status, 200);
  assert.equal((await fetch(origin + '/api/social?view=library&wallet=' + wallet)).status, 401);
  await write('PERSON', '@fixture-followed', 'follow'); await write('VENUE', 'local-following-place', 'follow');
  await write('VENUE', 'local-following-place', 'save'); await write('STORY', 'local-following-story', 'save'); await write('ACTIVITY', 'venue_event:local-following-event', 'save');
  const state = await read('state', { kind: 'PERSON', key: '@fixture-followed' }); assert.equal(state.following, true);
  const library = await read('library'); assert.equal(library.follows.length, 2); assert.equal(library.saves.length, 3);
  assert.ok(library.saves.every((s: { target: unknown }) => s.target));
  const local = await read('following', { lat: '9.79', lng: '126.15', radiusKm: '25' });
  assert.equal(local.followingCount, 2); assert.ok(local.items.some((s: { key: string }) => s.key === 'local-following-story')); assert.ok(local.items.some((s: { key: string }) => s.key === 'venue_event:local-following-event'));
  const otherCity = await read('following', { lat: '-33.8688', lng: '151.2093', radiusKm: '25' }); assert.equal(otherCity.items.length, 0);
  assert.ok(!JSON.stringify(local).includes(wallet));
  for (const row of library.saves) await write(row.kind, row.key, 'unsave');
  for (const row of library.follows) await write(row.kind, row.key, 'unfollow');
  const cleared = await read('library'); assert.equal(cleared.follows.length, 0); assert.equal(cleared.saves.length, 0);
  console.log('PASS: optimized localhost actual wallet authentication → creator/venue follow → place/story/activity save → private library → Following by city → remove/reload. No remote fixture or message.');
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
