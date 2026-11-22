import {
  bypassDecorativeLoader,
  suppressInstallPrompt,
} from "./mobile-surface-policy";
import test from "node:test";
import assert from "node:assert/strict";
import { EconomyCommand, validateSchedule } from "./local-economy";
import { publicMomentAllowed } from "./adventure-evidence";
test("commands reject forged authority, invalid scopes and silent recording rights", () => {
  assert.equal(
    EconomyCommand.safeParse({
      action: "node.publish",
      id: "node",
      consent: false,
    }).success,
    false
  );
  assert.equal(
    EconomyCommand.safeParse({
      action: "member.invite",
      id: "node",
      tag: "guest",
      role: "OWNER",
    }).success,
    false
  );
  assert.equal(
    EconomyCommand.safeParse({
      action: "session.decide",
      id: "guest",
      decision: "APPROVED",
      hostWallet: "forged",
    }).success,
    false
  );
  assert.equal(
    EconomyCommand.safeParse({
      action: "recording.withdraw",
      id: "grant",
      evaluation: true,
    }).success,
    false
  );
});
test("future bounded schedules and exact end boundary", () => {
  const now = new Date("2026-11-23T00:00:00Z");
  assert.doesNotThrow(() =>
    validateSchedule(
      new Date("2026-11-24T00:00:00Z"),
      new Date("2026-11-25T00:00:00Z"),
      now
    )
  );
  for (const [start, end] of [
    ["invalid", "invalid"],
    ["2026-11-22", "2026-11-23"],
    ["2026-11-24", "2026-11-24"],
    ["2026-11-24", "2026-11-26"],
    ["2027-05-01", "2027-05-02"],
  ])
    assert.throws(() => validateSchedule(new Date(start), new Date(end), now));
});
test("a Session original remains private even after ordinary Moment display review", () => {
  assert.equal(
    publicMomentAllowed({
      activityId: "session-recording",
      status: "APPROVED",
      publicConsentVersion: "adventure-display-v2",
      privateMediaCid: "original",
    }),
    false
  );
  assert.equal(
    publicMomentAllowed({
      activityId: "postcard",
      status: "APPROVED",
      publicConsentVersion: "adventure-display-v2",
      privateMediaCid: "original",
    }),
    true
  );
});

test("local participation surfaces keep decorative loaders and installation out of forms", () => {
  for (const p of ["/local", "/n/band", "/sessions/event"]) {
    assert.equal(bypassDecorativeLoader(p), true);
    assert.equal(suppressInstallPrompt(p), true);
  }
  assert.equal(bypassDecorativeLoader("/local-other"), false);
});
