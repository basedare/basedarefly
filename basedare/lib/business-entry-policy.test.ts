import assert from "node:assert/strict";
import { test } from "node:test";
import {
  businessWorkspaceRequested,
  isGeneralBusinessEntry,
} from "./business-entry-policy.ts";
import {
  BUSINESS_GOAL_ORDER,
  businessRequestHref,
  confirmedBusinessEnquiry,
} from "./business-request.ts";
test("the public entry stays guest-friendly while existing targeted workspace routes remain intact", () => {
  for (const query of [
    {},
    { from: "home" },
    { mode: "control" },
    { city: "Cebu" },
  ])
    assert.equal(businessWorkspaceRequested(query), false);
  for (const key of [
    "venue",
    "campaign",
    "compose",
    "creator",
    "tier",
    "payout",
    "title",
    "objective",
    "syncTime",
    "reportSource",
    "reportAudience",
    "reportSessionKey",
    "reportIntent",
  ])
    assert.equal(
      businessWorkspaceRequested({ [key]: "existing-context" }),
      true,
      key,
    );
  assert.equal(businessWorkspaceRequested({ workspace: "1" }), true);
  assert.equal(businessWorkspaceRequested({ workspace: ["1", "0"] }), false);
  assert.equal(
    isGeneralBusinessEntry({ source: "home-business", city: "Cebu" }),
    true,
  );
  for (const key of [
    "missionType",
    "offer",
    "packageId",
    "budgetRange",
    "goal",
    "creatorSlots",
    "payout",
    "proofRequired",
    "venueSlug",
    "auditBrief",
  ])
    assert.equal(
      isGeneralBusinessEntry({ [key]: "legacy-context" }),
      false,
      key,
    );
});
test("all three goals preserve the business request/city without price, auth or a live publication instruction", () => {
  assert.equal(BUSINESS_GOAL_ORDER.length, 3);
  for (const kind of BUSINESS_GOAL_ORDER) {
    const url = new URL(
      businessRequestHref(kind, "home-business", "General Luna, Siargao"),
      "https://www.basedare.xyz",
    );
    assert.equal(url.pathname, "/activations");
    assert.equal(url.searchParams.get("missionType"), kind);
    assert.equal(url.searchParams.get("budgetRange"), "discuss");
    assert.equal(url.searchParams.get("city"), "General Luna, Siargao");
    for (const key of [
      "wallet",
      "account",
      "publish",
      "fund",
      "price",
      "payout",
      "rightsAccepted",
    ])
      assert.equal(url.searchParams.has(key), false);
  }
});
test("truthful confirmation requires an actual saved enquiry ID, not an empty success or spam acknowledgement", () => {
  for (const value of [
    null,
    {},
    { success: true },
    { success: true, data: { received: true } },
    { success: true, data: { id: "received" } },
    { success: false, data: { id: "saved-enquiry-001" } },
  ])
    assert.equal(confirmedBusinessEnquiry(value), null);
  assert.deepEqual(
    confirmedBusinessEnquiry({
      success: true,
      data: {
        id: "saved-enquiry-001",
        closeRoomHref: "/activations/close/signed-token.v1",
      },
    }),
    {
      id: "saved-enquiry-001",
      closeRoomHref: "/activations/close/signed-token.v1",
    },
  );
  for (const href of [
    "https://evil.invalid/",
    "//evil.invalid/",
    "javascript:alert(1)",
    "/activations/close/../admin",
  ])
    assert.equal(
      confirmedBusinessEnquiry({
        success: true,
        data: { id: "saved-enquiry-001", closeRoomHref: href },
      })?.closeRoomHref,
      null,
    );
});
