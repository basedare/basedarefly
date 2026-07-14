import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createOpaqueToken,
  createParticipantCookieValue,
  hashOpaqueToken,
  hmacEmail,
  verifyParticipantCookieValue,
} from './mission-pass-crypto.ts';

const SECRET = 'alpha-secret-that-is-definitely-longer-than-thirty-two-characters';

test('opaque tokens are high-entropy and only their digest needs storage', () => {
  const first = createOpaqueToken();
  const second = createOpaqueToken();
  assert.notEqual(first, second);
  assert.ok(first.length >= 40);
  assert.equal(hashOpaqueToken(first).length, 64);
  assert.equal(hashOpaqueToken(first), hashOpaqueToken(first));
  assert.notEqual(hashOpaqueToken(first), first);
});

test('email HMAC is deterministic, keyed, and not a raw-address hash', () => {
  const email = 'maya@example.com';
  const digest = hmacEmail(email, SECRET);
  assert.equal(digest, hmacEmail(email, SECRET));
  assert.notEqual(digest, hmacEmail(email, `${SECRET}-other`));
  assert.equal(digest.includes(email), false);
});

test('participant cookie verifies, rejects tampering, and expires', () => {
  const issuedAt = 1_800_000_000;
  const participant = 'email:abcdef';
  const cookie = createParticipantCookieValue(participant, SECRET, issuedAt);
  assert.equal(verifyParticipantCookieValue(cookie, SECRET, issuedAt + 1), participant);
  assert.equal(verifyParticipantCookieValue(`${cookie}x`, SECRET, issuedAt + 1), null);
  assert.equal(verifyParticipantCookieValue(cookie, `${SECRET}-other`, issuedAt + 1), null);
  assert.equal(verifyParticipantCookieValue(cookie, SECRET, issuedAt + 31 * 24 * 60 * 60), null);
});
