import assert from "node:assert/strict";
import test from "node:test";

import {
  getVenueEventTrustLabel,
  inferVenueEventDraft,
  isVenueEventLiveNow,
  normalizeVenueEventSourceUrl,
  parseVenueLocalDateTime,
  resolveVenueEventExpiry,
  slugifyVenueEvent,
  validateVenueEventWindow,
} from "./venue-events.ts";

test("extracts a compact draft but never invents an exact date", () => {
  const draft = inferVenueEventDraft(
    "SUNSET VINYL NIGHT\nFriday 7:30 PM\nFree entry\nDJs by the pool"
  );
  assert.equal(draft.title, "SUNSET VINYL NIGHT");
  assert.equal(draft.category, "music");
  assert.equal(draft.priceLabel, "Free");
  assert.match(draft.dateMention ?? "", /Friday/i);
  assert.equal(draft.timeMention, "7:30 PM");
  assert.ok(draft.confidence >= 0.8);
});

test("does not mistake a calendar year for an event time", () => {
  const draft = inferVenueEventDraft(
    "Sunday Market\nAugust 16, 2026\nLocal makers and food"
  );
  assert.equal(draft.timeMention, null);
});

test("source urls accept only public http protocols and remove fragments", () => {
  assert.equal(normalizeVenueEventSourceUrl(" javascript:alert(1) "), null);
  assert.equal(
    normalizeVenueEventSourceUrl("https://example.com/post#comments"),
    "https://example.com/post"
  );
});

test("publish window rejects past and inverted events", () => {
  const now = new Date("2026-08-13T00:00:00.000Z");
  assert.match(
    validateVenueEventWindow(new Date("2026-08-12T10:00:00.000Z"), null, now) ??
      "",
    /past/
  );
  assert.match(
    validateVenueEventWindow(
      new Date("2026-08-14T10:00:00.000Z"),
      new Date("2026-08-14T09:00:00.000Z"),
      now
    ) ?? "",
    /after/
  );
  assert.equal(
    validateVenueEventWindow(new Date("2026-08-14T10:00:00.000Z"), null, now),
    null
  );
});

test("operator wall clock is interpreted in the venue timezone", () => {
  assert.equal(
    parseVenueLocalDateTime("2026-08-14T19:30", "Asia/Manila")?.toISOString(),
    "2026-08-14T11:30:00.000Z"
  );
  assert.equal(parseVenueLocalDateTime("not-a-date", "Asia/Manila"), null);
});

test("event lifecycle uses a bounded default and clear live state", () => {
  const start = new Date("2026-08-14T10:00:00.000Z");
  assert.equal(
    resolveVenueEventExpiry(start, null).toISOString(),
    "2026-08-15T04:00:00.000Z"
  );
  assert.equal(
    isVenueEventLiveNow(
      { startsAt: start, endsAt: null },
      new Date("2026-08-14T12:00:00.000Z")
    ),
    true
  );
  assert.equal(
    isVenueEventLiveNow(
      { startsAt: start, endsAt: null },
      new Date("2026-08-14T15:00:00.000Z")
    ),
    false
  );
});

test("trust wording and slugs stay honest and deterministic", () => {
  assert.equal(getVenueEventTrustLabel("SOURCE_CHECKED"), "Source checked");
  assert.equal(getVenueEventTrustLabel("VENUE_CONFIRMED"), "Venue confirmed");
  assert.equal(
    slugifyVenueEvent(
      "Vinyl & Tacos",
      "shaka-siargao",
      new Date("2026-08-14T10:00:00Z"),
      "signal123456"
    ),
    "shaka-siargao-vinyl-tacos-2026-08-14-123456"
  );
});
