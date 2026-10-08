/* eslint-disable @typescript-eslint/no-require-imports -- Install module stubs before loading the routes under test. */
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
const Module = require('node:module');
const original = Module._load;
let issued = 0;
let known = false;
let fail = false;
let deliveries = 0;
Module._load = function(name: string, ...args: unknown[]) {
  if (name === '@/lib/creator-attribution-server') return {
    issueRecoveryMissionPass: async () => { issued++; return known ? { sent: true, normalizedEmail: 'test@example.com', continueUrl: 'https://www.basedare.xyz/continue/private', missionPass: { id: 'pass', expiresAt: new Date() } } : { sent: false }; },
    issueMissionPass: async () => { issued++; throw new Error('Should not issue while disabled'); },
    markMissionPassDelivery: async () => null,
    applyJourneyCookie: () => { throw new Error('Recovery must not change caller identity'); },
  };
  return original.call(this, name, ...args);
};
const { POST: recover } = require('@/app/api/mission-passes/recover/route');
const { POST: issue } = require('@/app/api/mission-passes/route');
const { sendMissionPassEmail } = require('@/lib/mission-pass-email');
let latestBody: Record<string, unknown> = {};
global.fetch = async (_url, init) => {
  deliveries++;
  assert.ok(init?.signal, 'Email provider requests need a timeout');
  assert.equal((init?.headers as Record<string, string>)['Idempotency-Key'], 'mission-pass-recovery-pass');
  latestBody = JSON.parse(String(init?.body));
  return new Response(fail ? 'private recipient provider details' : '{"id":"email"}', { status: fail ? 500 : 200 });
};
const request = (body: unknown) => new NextRequest('https://www.basedare.xyz/api/mission-passes/recover', { method: 'POST', body: JSON.stringify(body) });
async function main() {
  process.env.NEXT_PUBLIC_MISSION_PASS_EMAIL_ENABLED = 'false';
  assert.equal((await recover(request({ email: 'test@example.com' }))).status, 503);
  assert.equal((await issue(request({ actionIntentId: 'intent', deliveryMethod: 'EMAIL', email: 'test@example.com' }))).status, 503);
  assert.equal(issued, 0, 'Disabled delivery must not create passes');
  process.env.NEXT_PUBLIC_MISSION_PASS_EMAIL_ENABLED = 'true';
  process.env.RESEND_API_KEY = 'test-only';
  process.env.MISSION_PASS_FROM_EMAIL = 'BaseDare <missions@example.com>';
  process.env.MISSION_PASS_HMAC_SECRET = 'test-only-secret-at-least-32-characters';
  const unknown = await recover(request({ email: 'test@example.com' }));
  assert.equal(unknown.status, 200);
  assert.equal(deliveries, 0);
  const expected = await unknown.json();
  known = true; fail = true;
  const failed = await recover(request({ email: 'test@example.com' }));
  assert.equal(failed.status, 200);
  assert.deepEqual(await failed.json(), expected, 'Delivery failure must not reveal whether an email has saved activities');
  assert.equal(failed.headers.get('set-cookie'), null);
  fail = false;
  await sendMissionPassEmail({ to: 'test@example.com', title: '<script>bad</script>', continueUrl: 'https://www.basedare.xyz/continue/private', expiresAt: new Date(), idempotencyKey: 'mission-pass-recovery-pass' });
  assert.ok(String(latestBody.html).includes('&lt;script&gt;'));
  assert.ok(!String(latestBody.html).includes('<script>'));
  console.log('PASS: disabled delivery has no issuance, recovery responses do not enumerate email, no recovery cookie mutation, email escaped and time-bounded.');
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
