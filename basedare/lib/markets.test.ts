import assert from 'node:assert/strict';
import test from 'node:test';

import { getMarketActions, MARKETS } from './markets.ts';

test('the one live market separates paid work, funding, and optional identity', () => {
  const liveMarkets = MARKETS.filter((market) => market.live);
  assert.equal(liveMarkets.length, 1);

  const actions = getMarketActions(liveMarkets[0]);
  assert.deepEqual(actions.contributor, {
    label: 'Find paid missions',
    href: '/earn?city=siargao&source=markets',
  });
  assert.deepEqual(actions.buyer, {
    label: 'Fund a mission',
    href: '/create?city=siargao&source=markets',
  });
  assert.deepEqual(actions.community, {
    label: 'Open Community',
    href: '/community?city=siargao&source=markets',
  });
  assert.deepEqual(actions.identity, {
    label: 'Claim your @tag',
    href: '/claim-tag?city=siargao&source=markets',
  });
});

test('scouting markets collect mission alerts without implying live work', () => {
  for (const market of MARKETS.filter((candidate) => !candidate.live)) {
    const actions = getMarketActions(market);
    assert.equal(actions.contributor.label, 'Get mission alerts');
    assert.match(actions.contributor.href, /^\/earn\?alerts=1&city=/);
    assert.match(actions.contributor.href, /#mission-alerts$/);
    assert.equal(actions.buyer, null);
    assert.equal(actions.community, null);
    assert.equal(actions.identity, null);
  }
});
