import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCommunityIdentity } from './community-identity.ts';

test('an active or verified Baretag unlocks community identity', () => {
  assert.deepEqual(
    resolveCommunityIdentity([
      { tag: 'older', status: 'VERIFIED' },
      { tag: '@islander', status: 'ACTIVE', isPrimary: true },
    ]),
    { status: 'ready', tag: '@islander' }
  );
});

test('a pending Baretag stays locked until review', () => {
  assert.deepEqual(resolveCommunityIdentity([{ tag: 'maya', status: 'PENDING' }]), {
    status: 'pending',
    tag: '@maya',
  });
});

test('a usable Baretag wins over a newer pending claim', () => {
  assert.deepEqual(
    resolveCommunityIdentity([
      { tag: 'new-name', status: 'PENDING', isPrimary: true },
      { tag: 'known-name', status: 'VERIFIED' },
    ]),
    { status: 'ready', tag: '@known-name' }
  );
});

test('rejected, revoked, or absent tags do not unlock posting', () => {
  assert.deepEqual(
    resolveCommunityIdentity([
      { tag: 'rejected', status: 'REJECTED' },
      { tag: 'revoked', status: 'REVOKED' },
    ]),
    { status: 'missing', tag: null }
  );
  assert.deepEqual(resolveCommunityIdentity([]), { status: 'missing', tag: null });
});
