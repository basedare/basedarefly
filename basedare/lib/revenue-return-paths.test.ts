import assert from 'node:assert/strict';
import { test } from 'node:test';
import { missionReturnPath } from './mission-return-path.ts';
import { buildSprintReorderHref } from './sprint-reorder.ts';

test('paid notifications return to the specific mission and preserve community destinations', () => {
  assert.equal(missionReturnPath({ id: 'abc', shortId: 'xyz', bounty: 125 }), '/earn/xyz');
  assert.equal(missionReturnPath({ id: 'abc', bounty: 0 }), '/dare/abc');
  assert.equal(missionReturnPath({ id: 'abc', bounty: 125, isSimulated: true }), '/dare/abc');
});
test('repeat is an editable invoice request with attribution, not funding or reused consent', () => {
  const href = buildSprintReorderHref({ receiptCode: 'SPR-123', question: 'Is this service available?', area: 'General Luna', freshnessWindowHours: 6 });
  const url = new URL(href, 'https://www.basedare.xyz');
  assert.equal(url.pathname, '/activations');
  assert.equal(url.searchParams.get('missionTitle'), 'Is this service available?');
  assert.equal(url.searchParams.get('source'), 'sprint-repeat:SPR-123');
  assert.equal(url.searchParams.get('venueName'), 'General Luna');
  assert.match(url.searchParams.get('proofRequired')!, /Previous funding and media permissions do not carry over/);
  assert.equal(url.searchParams.has('buyerWallet'), false);
});

import { buildContentReorderHref } from './content-reorder.ts';
import { CONTENT_RIGHTS_VERSION } from './content-delivery.ts';
test('content reorder carries a draft, replaces the deadline and never copies identity, proof or consent', () => {
  const href = buildContentReorderHref({ title: 'Film the cafe', bounty: 100, venueId: 'venue-1', outcomeContractSnapshot: {
    contentDelivery: { termsVersion: CONTENT_RIGHTS_VERSION, buyerName: 'Cafe', assetType: 'VIDEO', format: 'Vertical 20s', acceptanceCriteria: 'Show the entrance clearly', posting: 'NONE', postingInstructions: '', deadline: '2026-01-01T00:00:00.000Z', revisionLimit: 0 },
  } }, Date.parse('2026-09-21T00:00:00.000Z'));
  const url = new URL(href!, 'https://www.basedare.xyz');
  const brief = JSON.parse(url.searchParams.get('contentBrief')!);
  assert.equal(brief.deadline, '2026-09-23T00:00:00.000Z');
  assert.equal(url.searchParams.get('venueId'), 'venue-1');
  assert.equal(url.searchParams.has('walletAddress'), false);
  assert.equal(url.searchParams.has('contentRights'), false);
});

test('content reorder cannot substitute a place label for an exact venue', () => {
  assert.equal(buildContentReorderHref({ title: 'Film cafe', bounty: 100, locationLabel: 'Cafe' }), null);
});
