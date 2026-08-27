import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveCreatorLoopActions } from './creator-loop-actions.ts';

test('creator loop sends discovery to the creator-first earn page', () => {
  const actions = resolveCreatorLoopActions({
    isConnected: false,
    isLoading: false,
    loadFailed: false,
    items: [],
  });

  assert.equal(actions[0].href, '/earn?source=creators-loop');
  assert.equal(actions[0].state, 'ready');
  assert.equal(actions[1].state, 'locked');
  assert.match(actions[1].detail, /Accept a paid mission/);
  assert.equal(actions[2].state, 'locked');
});

test('an accepted mission unlocks dashboard and its exact proof page', () => {
  const actions = resolveCreatorLoopActions({
    isConnected: true,
    isLoading: false,
    loadFailed: false,
    items: [
      {
        category: 'Ready for proof',
        href: '/dare/surf-clip',
        role: 'creator',
        title: 'Film one clean surf clip',
      },
    ],
    creatorTag: '@islandsurfer',
  });

  assert.equal(actions[1].href, '/dashboard');
  assert.equal(actions[1].state, 'ready');
  assert.equal(actions[2].href, '/dare/surf-clip');
  assert.equal(actions[2].state, 'ready');
  assert.equal(actions[3].href, '/creator/islandsurfer');
});

test('accepted work under review keeps proof locked without hiding the active mission', () => {
  const actions = resolveCreatorLoopActions({
    isConnected: true,
    isLoading: false,
    loadFailed: false,
    items: [
      {
        category: 'Under review',
        href: '/dare/reviewing',
        role: 'creator',
        title: 'Venue walkthrough clip',
      },
    ],
  });

  assert.equal(actions[1].href, '/dashboard');
  assert.equal(actions[2].href, null);
  assert.equal(actions[2].state, 'locked');
  assert.equal(actions[3].href, '/dashboard#your-trail');
});

test('a direct offer explains that acceptance unlocks show-up actions', () => {
  const actions = resolveCreatorLoopActions({
    isConnected: true,
    isLoading: false,
    loadFailed: false,
    items: [
      {
        category: 'Needs response',
        href: '/dare/new-offer',
        role: 'creator',
        title: 'Sunset venue reel',
      },
    ],
  });

  assert.equal(actions[1].state, 'locked');
  assert.match(actions[1].detail, /Accept Sunset venue reel/);
});

test('an action-center failure falls back to the dashboard instead of falsely locking work', () => {
  const actions = resolveCreatorLoopActions({
    isConnected: true,
    isLoading: false,
    loadFailed: true,
    items: [],
  });

  assert.equal(actions[1].href, '/dashboard');
  assert.equal(actions[2].href, '/dashboard');
  assert.match(actions[1].detail, /unavailable/);
});
