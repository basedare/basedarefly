import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseSpotlightWeek,
  relatedAttempts,
  spotlightWeek,
} from "./moment-motivation";
test("editorial week changes at Monday midnight in Manila, including year boundaries", () => {
  assert.equal(
    spotlightWeek(new Date("2026-11-01T15:59:59Z")).key,
    "2026-10-26"
  );
  const next = spotlightWeek(new Date("2026-11-01T16:00:00Z"));
  assert.equal(next.key, "2026-11-02");
  assert.equal(next.startsAt, "2026-11-01T16:00:00.000Z");
  assert.equal(next.endsAt, "2026-11-08T16:00:00.000Z");
  assert.equal(
    spotlightWeek(new Date("2027-01-01T12:00:00Z")).key,
    "2026-12-28"
  );
  assert.equal(parseSpotlightWeek("2026-02-30"), null);
  assert.equal(parseSpotlightWeek("2026-11-03"), null);
  assert.equal(parseSpotlightWeek("2026-11-02/other"), null);
});
test("comparison requires genuine direct lineage, the same challenge and independent wallets", () => {
  const a = {
    id: "original",
    activityId: "wave-or-ex",
    wallet: "0xABC",
    parentMomentId: null,
  };
  const b = {
    id: "reply",
    activityId: a.activityId,
    wallet: "0xdef",
    parentMomentId: a.id,
  };
  assert.equal(relatedAttempts(a, b), true);
  assert.equal(relatedAttempts(b, a), true);
  assert.equal(relatedAttempts(a, { ...b, wallet: "0xabc" }), false);
  assert.equal(relatedAttempts(a, { ...b, activityId: "coconut-ceo" }), false);
  assert.equal(relatedAttempts(a, { ...b, parentMomentId: null }), false);
  assert.equal(relatedAttempts({ ...a, parentMomentId: b.id }, b), false);
});
