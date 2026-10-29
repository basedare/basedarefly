import assert from 'node:assert/strict';
import { test } from 'node:test';
import { businessRequestDedupeSource, businessRequestHref, businessRequestKind } from './business-request.ts';
import { loadBuyerWorkspace } from './buyer-workspace.ts';

const wallet = '0x' + 'a'.repeat(40);
const profile = { id: 'buyer-1', walletAddress: wallet, name: 'Buyer' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

test('content and activity enquiries carry their intent without a fixed Sprint price, identity or funding', () => {
  for (const source of ['buyer-workspace', 'home-business'] as const) {
    for (const kind of ['content-brief', 'activity-brief', 'visibility-brief'] as const) {
      const url = new URL(businessRequestHref(kind, source), 'https://www.basedare.xyz');
      assert.equal(url.pathname, '/activations');
      assert.equal(url.searchParams.get('missionType'), kind);
      assert.equal(url.searchParams.get('source'), source);
      assert.equal(url.searchParams.get('budgetRange'), 'discuss');
      assert.equal(url.searchParams.get('packageId'), 'pilot-drop');
      assert.equal(url.searchParams.get('goal'), kind === 'content-brief' ? 'ugc' : kind === 'visibility-brief' ? 'launch' : 'other');
      for (const key of ['buyerWallet', 'payout', 'contentRights', 'offer']) assert.equal(url.searchParams.has(key), false);
    }
  }
  for (const value of ['field-mission', 'guest', 'first-spark', '', null, 'constructor']) assert.equal(businessRequestKind(value), null);
});

test('a buyer snapshot waits for both successful reads and accepts an actual empty work list', async () => {
  const calls: string[] = [];
  const request: typeof fetch = async (url, options) => {
    calls.push(String(url));
    assert.equal(options?.cache, 'no-store');
    assert.ok(options?.signal);
    return calls.length === 1 ? reply({ success: true, data: profile }) : reply({ success: true, data: [] });
  };
  const result = await loadBuyerWorkspace(wallet, new AbortController().signal, request);
  assert.equal(result.kind, 'ready');
  if (result.kind === 'ready') assert.deepEqual(result.campaigns, []);
  assert.equal(calls.length, 2);
  assert.equal(new URL(calls[1], 'https://www.basedare.xyz').searchParams.get('brand'), wallet);
});

test('only the explicit profile 404 becomes a registration state', async () => {
  const result = await loadBuyerWorkspace(wallet, new AbortController().signal, async () => reply({ code: 'NOT_FOUND', success: false }, 404));
  assert.equal(result.kind, 'missing');
  for (const status of [401, 403, 500]) {
    await assert.rejects(loadBuyerWorkspace(wallet, new AbortController().signal, async () => reply({ code: 'NOT_FOUND' }, status)), /profile could not be loaded/);
  }
});

test('an error or malformed work read never becomes an empty successful snapshot', async () => {
  for (const response of [reply({ success: false }, 503), reply({ success: true, data: null }), reply({ success: false, data: [] }), reply({ success: true, data: [null] }), new Response('Unavailable', { status: 503 })]) {
    let count = 0;
    await assert.rejects(loadBuyerWorkspace(wallet, new AbortController().signal, async () => ++count === 1 ? reply({ success: true, data: profile }) : response), /work could not be loaded/);
  }
});

test('a mismatched or malformed buyer profile cannot expose a different wallet workspace', async () => {
  for (const data of [null, { id: 'bad' }, { ...profile, walletAddress: '0x' + 'b'.repeat(40) }]) {
    let calls = 0;
    await assert.rejects(loadBuyerWorkspace(wallet, new AbortController().signal, async () => { calls++; return reply({ success: true, data }); }), /profile could not be loaded/);
    assert.equal(calls, 1);
  }
});

test('aborting an account read propagates to the pending work request', async () => {
  const controller = new AbortController();
  let calls = 0;
  const request: typeof fetch = async (_url, options) => {
    if (++calls === 1) return reply({ success: true, data: profile });
    controller.abort();
    options?.signal?.throwIfAborted();
    throw new Error('should be aborted');
  };
  await assert.rejects(loadBuyerWorkspace(wallet, controller.signal, request), { name: 'AbortError' });
});


test('different enquiry kinds stay separate while retries and legacy sources remain stable', () => {
  assert.notEqual(businessRequestDedupeSource('buyer-workspace', 'content-brief'), businessRequestDedupeSource('buyer-workspace', 'activity-brief'));
  assert.equal(businessRequestDedupeSource('buyer-workspace', 'content-brief'), 'buyer-workspace:content-brief');
  assert.equal(businessRequestDedupeSource('sprint-repeat:SPR-123', 'field-mission'), 'sprint-repeat:SPR-123');
  assert.equal(businessRequestDedupeSource('site', 'guest'), 'site');
});

import { buildActivationCloseRoomFromEvent, buildActivationCloseRoomAdminState } from './activation-close-room.ts';
test('content and activity review keep the real brief and cannot inherit a First Spark offer', () => {
  for (const kind of ['content-brief', 'activity-brief']) {
    const metadata = { routedMissionType: kind, company: 'Test buyer', city: 'Sydney', packageId: 'pilot-drop', budgetRange: 'discuss', notes: 'One exact scoped deliverable', routedTimeWindow: 'Next month' };
    const room = buildActivationCloseRoomFromEvent({ id: 'qa-only', title: 'Brief', amount: null, status: 'NEW', actor: null, metadataJson: metadata, occurredAt: new Date(), updatedAt: new Date() });
    assert.equal(room.isFirstSpark, false);
    assert.equal(room.businessBrief?.kind, kind);
    assert.equal(room.businessBrief?.notes, metadata.notes);
    assert.equal(room.businessBrief?.timing, 'Next month');
    assert.equal(room.budgetLabel, 'Budget to be agreed');
    const admin = buildActivationCloseRoomAdminState({ id: 'qa-only', metadata, company: 'Test buyer', contactName: 'Test person', email: 'qa@example.test', assignedVenue: '', paymentReference: '' });
    const body = new URL(admin.mailtoHref!).searchParams.get('body')!;
    assert.match(body, /Scope, price, permissions, availability and funding are not agreed/);
    assert.doesNotMatch(body, /QR proof|one simple perk|First Spark/);
  }
});

test('existing pilot review keeps its own offer and has no business enquiry projection', () => {
  const room = buildActivationCloseRoomFromEvent({ id: 'legacy-qa-only', title: 'Pilot', amount: null, status: 'NEW', actor: null, metadataJson: { offerId: 'first-spark', packageId: 'pilot-drop' }, occurredAt: new Date(), updatedAt: new Date() });
  assert.equal(room.businessBrief, null);
  assert.equal(room.isFirstSpark, true);
});
