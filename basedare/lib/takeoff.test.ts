import { test } from "node:test";
import assert from "node:assert/strict";
import {
  participationScorecard,
  participationWindow,
  type ParticipationAction,
} from "./participation-scorecard";
import { momentReleaseOptions } from "./moment-release";
import { accountWalletAllowed } from "./account-access";
import { PilotSchema } from "./takeoff-pilot";
const a = "0x" + "a".repeat(40),
  b = "0x" + "b".repeat(40);
const now = new Date("2026-11-21T06:00:00Z");
test("complete Manila windows, accounts dedupe across action kinds and only known prior-week returns count", () => {
  const w = participationWindow(now);
  assert.equal(w.end, "2026-11-20T16:00:00.000Z");
  const row = (
    account: string,
    sourceId: string,
    occurredAt: string,
    kind: ParticipationAction["kind"] = "reviewed_story"
  ): ParticipationAction => ({ account, sourceId, occurredAt, kind });
  const story = row(a, "story", "2026-11-15T12:00:00Z");
  const result = participationScorecard(
    [
      row(a, "old", "2026-11-09T12:00:00Z"),
      story,
      story,
      row(a, "visit", "2026-11-18T12:00:00Z", "confirmed_qr_visit"),
      row(b, "new", "2026-11-18T12:00:00Z"),
      row("0x" + "c".repeat(40), "today", "2026-11-20T16:00:00Z"),
    ],
    now
  );
  assert.deepEqual(result.metrics, {
    activeAccounts: 2,
    reviewedCreators: 2,
    qrVisitorAccounts: 1,
    actions: 3,
    previousActiveAccounts: 1,
    returningAccounts: 1,
    returnRate: 1,
  });
  assert.equal(participationScorecard([], now).metrics.returnRate, null);
  assert.equal(participationScorecard(null, now).metrics.activeAccounts, null);
  assert.throws(() =>
    participationScorecard([story, { ...story, account: b }], now)
  );
});
test("media acceptance requires the verified account, short valid window and independent originals switch", () => {
  const env = {
    MOMENT_ACCEPTANCE_ENABLED: "true",
    MOMENT_ACCEPTANCE_WALLETS: a,
    MOMENT_ACCEPTANCE_STARTS_AT: "2026-11-21T00:00:00Z",
    MOMENT_ACCEPTANCE_UNTIL: "2026-11-21T12:00:00Z",
    PINATA_JWT: "fixture",
  };
  assert.equal(
    momentReleaseOptions(env, null, now.getTime()).socialLinks,
    false
  );
  assert.equal(momentReleaseOptions(env, b, now.getTime()).socialLinks, false);
  assert.deepEqual(momentReleaseOptions(env, a, now.getTime()), {
    socialLinks: true,
    originalMedia: false,
  });
  assert.deepEqual(
    momentReleaseOptions(
      { ...env, MOMENT_ORIGINAL_MEDIA_ENABLED: "true" },
      a,
      now.getTime()
    ),
    { socialLinks: true, originalMedia: false },
    "A stale public originals switch cannot broaden a private link-only test"
  );
  assert.equal(
    momentReleaseOptions(
      { ...env, MOMENT_ACCEPTANCE_ORIGINALS_ENABLED: "true" },
      a,
      now.getTime()
    ).originalMedia,
    true
  );
  assert.equal(
    momentReleaseOptions(
      { ...env, MOMENT_ACCEPTANCE_UNTIL: "2026-11-23T00:00:00Z" },
      a,
      now.getTime()
    ).socialLinks,
    false
  );
  assert.equal(
    momentReleaseOptions(env, a, now.getTime() + 86400000).socialLinks,
    false
  );
});
test("email sign-in cannot assert ownership of an unrelated or ambiguous wallet", () => {
  assert.equal(accountWalletAllowed(true, true, a, [a]), true);
  assert.equal(accountWalletAllowed(true, true, a, [b]), false);
  assert.equal(accountWalletAllowed(true, true, a, [a, b]), false);
  assert.equal(accountWalletAllowed(false, true, a, [a]), false);
  assert.equal(accountWalletAllowed(true, false, a, [a]), false);
});
test("pilot remains a draft until genuine host/contributor references and tracked links are recorded", () => {
  const draft = {
    revision: 0,
    owner: "Fixture owner",
    reviewer: "Fixture reviewer",
    supportEmail: "support@example.test",
    startsAt: "2026-11-22T00:00:00Z",
    endsAt: "2026-12-06T00:00:00Z",
    targetHosts: 1,
    targetCreators: 1,
    targetParticipants: 20,
    stopRule: "Pause on safety or consent failures immediately.",
    activityIds: ["postcard"],
    hosts: [],
    creatorTags: [],
    creatorPermissionReference: "",
    trackingSlugs: [],
    businessEnquiryId: null,
    status: "DRAFT",
  };
  assert.equal(PilotSchema.safeParse(draft).success, true);
  assert.equal(
    PilotSchema.safeParse({ ...draft, status: "READY_FOR_REVIEW" }).success,
    false
  );
  assert.equal(
    PilotSchema.safeParse({ ...draft, status: "ACTIVE" }).success,
    false
  );
  assert.equal(
    PilotSchema.safeParse({ ...draft, activityIds: ["postcard", "postcard"] })
      .success,
    false
  );
});
