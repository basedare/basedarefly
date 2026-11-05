/** Genuine localhost HTTP and authorization. Never targets a hosted environment. */
import assert from 'node:assert/strict';
import { privateKeyToAccount } from 'viem/accounts';
import { buildWalletActionMessage } from '@/lib/wallet-action-auth';
const origin = 'http://localhost:3217', account = privateKeyToAccount(('0x' + '1'.repeat(64)) as `0x${string}`);
async function headers(action: string, resource: string) {
  const issuedAt = new Date().toISOString(), walletAddress = account.address.toLowerCase();
  return { Origin: origin, 'Content-Type': 'application/json', 'x-basedare-wallet': walletAddress, 'x-basedare-wallet-issued-at': issuedAt, 'x-basedare-wallet-signature': await account.signMessage({ message: buildWalletActionMessage({ walletAddress, action, resource, issuedAt }) }) };
}
async function main() {
  const seeded = await fetch(origin + '/community/posts/local-story-browser-fixture'); assert.equal(seeded.status, 200); assert.match(await seeded.text(), /Disposable local browser verification only/);
  const body = { postType: 'story', title: 'HTTP story fixture only', notes: 'Signed localhost handler verification. No real post or participant.', venueSlug: 'local-story-browser-place', city: 'General Luna', latitude: 9.79, longitude: 126.15, publicConsentVersion: 'community-story-display-v1', submissionKey: crypto.randomUUID(), walletAddress: account.address };
  const submitted = await fetch(origin + '/api/local-signals', { method: 'POST', headers: await headers('community-post:create', 'venue:' + body.venueSlug), body: JSON.stringify(body) }); assert.equal(submitted.status, 200, await submitted.clone().text());
  const id = (await submitted.json()).data.id;
  assert.equal((await fetch(origin + '/community/posts/' + id)).status, 404);
  const login = await fetch(origin + '/api/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ adminSecret: 'local-browser-fixture-admin-secret-2026' }) }); assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie')!.split(';')[0];
  const review = await fetch(origin + '/api/admin/local-signals', { method: 'PATCH', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'APPROVED', operatorNote: 'PRIVATE_HTTP_OPERATOR_NOTE', broadcast: false }) }); assert.equal(review.status, 200, await review.clone().text());
  const page = await fetch(origin + '/community/posts/' + id); assert.equal(page.status, 200); const html = await page.text(); assert.match(html, /Signed localhost handler verification/); assert.doesNotMatch(html, /PRIVATE_HTTP_OPERATOR_NOTE/); assert.match(page.headers.get('cache-control')!, /no-store/);
  const feed = await fetch(origin + '/api/local-signals?postType=story&lat=9.79&lng=126.15&radiusKm=25'); assert.ok((await feed.json()).data.signals.some((s: { id: string }) => s.id === id));
  const withdrawn = await fetch(origin + '/api/local-signals/' + id, { method: 'POST', headers: await headers('community-post:manage', 'community'), body: JSON.stringify({ wallet: account.address, action: 'withdraw' }) }); assert.equal(withdrawn.status, 200);
  assert.equal((await fetch(origin + '/community/posts/' + id)).status, 404);
  console.log('PASS: optimized localhost signed submission → private pending → actual operator session/review → shared public feed/SSR page → signed withdrawal/404. No remote record or external message.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
