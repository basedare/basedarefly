import assert from "node:assert/strict";
import test from "node:test";

import {
  assertVenueEventFeedCryptoConfigured,
  decryptVenueEventFeedToken,
  encryptVenueEventFeedToken,
} from "./venue-event-feed-crypto.ts";

test("venue feed tokens are encrypted at rest and decrypt exactly", () => {
  const previous = process.env.VENUE_EVENT_FEED_SECRET;
  process.env.VENUE_EVENT_FEED_SECRET = "test-only-feed-secret-that-is-long-enough";
  try {
    assert.equal(
      assertVenueEventFeedCryptoConfigured(),
      "test-only-feed-secret-that-is-long-enough"
    );
    const token = "IGQVJ-test-token-value-with-enough-entropy";
    const encrypted = encryptVenueEventFeedToken(token);
    assert.notEqual(encrypted, token);
    assert.match(encrypted, /^v1\./);
    assert.equal(decryptVenueEventFeedToken(encrypted), token);
  } finally {
    if (previous === undefined) delete process.env.VENUE_EVENT_FEED_SECRET;
    else process.env.VENUE_EVENT_FEED_SECRET = previous;
  }
});

test("venue feed encryption fails closed without a dedicated secret", () => {
  const previous = process.env.VENUE_EVENT_FEED_SECRET;
  delete process.env.VENUE_EVENT_FEED_SECRET;
  try {
    assert.throws(
      () => encryptVenueEventFeedToken("IGQVJ-test-token-value-with-enough-entropy"),
      /at least 32 characters/
    );
  } finally {
    if (previous !== undefined) process.env.VENUE_EVENT_FEED_SECRET = previous;
  }
});
