import { test } from 'node:test';
import assert from 'node:assert/strict';
import { venueLocalInput, venueLocalToIso } from './venue-local-time.ts';
test('a traveller scheduling 7pm in Siargao gets 7pm in Siargao, regardless of device time zone', () => {
  assert.equal(venueLocalToIso('2026-09-29T19:00','Asia/Manila'),'2026-09-29T11:00:00.000Z');
  assert.equal(venueLocalInput(new Date('2026-09-29T11:00:00Z'),'Asia/Manila'),'2026-09-29T19:00');
});
test('invalid dates and nonexistent or ambiguous DST times need correction', () => {
  assert.equal(venueLocalToIso('2026-02-30T19:00','Asia/Manila'),null);
  assert.equal(venueLocalToIso('2026-10-04T02:30','Australia/Sydney'),null);
  assert.equal(venueLocalToIso('2026-04-05T02:30','Australia/Sydney'),null);
});
