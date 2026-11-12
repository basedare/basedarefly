import assert from "node:assert/strict";
import { test } from "node:test";
import {
  discoveryPrice,
  discoveryWindow,
  interpretDiscoveryIntent,
  rankDiscoveryResults,
  type DiscoveryResult,
} from "./discovery-intelligence.ts";
const area = {
  lat: 9.79,
  lng: 126.15,
  radiusKm: 8,
  label: "General Luna, Siargao",
  timeZone: "Asia/Manila",
};
const now = new Date("2026-11-10T04:00:00Z");
const result = (patch: Partial<DiscoveryResult> = {}): DiscoveryResult => ({
  kind: "ADVENTURE",
  key: "postcard",
  title: "Send a postcard",
  summary: "Create a memory",
  label: "Free self-guided adventure",
  reason: "At your own pace",
  href: "/adventures/postcard",
  actionLabel: "Start adventure",
  pricePhp: 0,
  priceLabel: "Free",
  minutes: 10,
  distanceKm: null,
  categories: ["create"],
  ...patch,
});

test("interprets user intent, time, PHP budget, duration and company without an AI provider", () => {
  const i = interpretDiscoveryIntent(
    "Something adventurous under ₱500 for the next two hours, with friends"
  );
  assert.equal(i.intent, "adventure");
  assert.equal(i.when, "next2h");
  assert.equal(i.maxBudgetPhp, 500);
  assert.equal(i.maxMinutes, 120);
  assert.equal(i.company, "group");
  assert.equal(
    interpretDiscoveryIntent("Where can I meet other travellers?").intent,
    "meet"
  );
  assert.equal(
    interpretDiscoveryIntent("Any live music near General Luna tonight?")
      .intent,
    "music"
  );
  assert.equal(
    interpretDiscoveryIntent("Find paid creator opportunities").intent,
    "earn"
  );
  assert.equal(
    interpretDiscoveryIntent("Hidden spots with real community stories").intent,
    "stories"
  );
});
test("free time does not mean a zero money budget; unsupported hours/currency/date stay explicit", () => {
  assert.equal(interpretDiscoveryIntent("two hours free").maxBudgetPhp, null);
  assert.equal(interpretDiscoveryIntent("free adventures").maxBudgetPhp, 0);
  assert.match(
    interpretDiscoveryIntent("coffee open now").notices.join(" "),
    /not confirmed/
  );
  assert.match(
    interpretDiscoveryIntent("something under $10 next weekend").notices.join(
      " "
    ),
    /Currency conversion.*date is not interpreted/s
  );
});
test("prices require explicit PHP entry evidence; ranges, from and minimum spend are unknown", () => {
  assert.equal(discoveryPrice("Free entry"), 0);
  assert.equal(discoveryPrice("₱500"), 500);
  assert.equal(discoveryPrice("PHP 1,200 per person"), 1200);
  for (const value of [
    null,
    "From ₱500",
    "₱300–500",
    "$20",
    "₱100 minimum spend",
    "Ask staff",
  ])
    assert.equal(discoveryPrice(value), null);
});
test("grouped and decimal PHP budgets are parsed atomically, never as a numeric prefix", () => {
  assert.equal(
    interpretDiscoveryIntent("music under ₱1,000").maxBudgetPhp,
    1000
  );
  assert.equal(
    interpretDiscoveryIntent("music under PHP 1,000.50").maxBudgetPhp,
    1000.5
  );
  assert.equal(
    interpretDiscoveryIntent("music under ₱1,00").maxBudgetPhp,
    null
  );
  assert.equal(interpretDiscoveryIntent("music under ₱500.").maxBudgetPhp, 500);
});
test("tonight uses the destination evening, preserves the after-midnight tail and handles DST", () => {
  assert.equal(
    new Date(discoveryWindow("tonight", now, area.timeZone).from).toISOString(),
    "2026-11-10T09:00:00.000Z"
  );
  assert.equal(
    new Date(discoveryWindow("tonight", now, area.timeZone).to).toISOString(),
    "2026-11-10T20:00:00.000Z"
  );
  const tail = new Date("2026-11-10T17:00:00Z");
  assert.equal(
    discoveryWindow("tonight", tail, area.timeZone).from,
    tail.getTime()
  );
  const dst = discoveryWindow(
    "tonight",
    new Date("2026-03-08T05:30:00Z"),
    "America/New_York"
  );
  assert.equal(new Date(dst.to).toISOString(), "2026-03-08T08:00:00.000Z");
  const evening = discoveryWindow(
    "tonight",
    new Date("2026-03-08T09:00:00Z"),
    "America/New_York"
  );
  assert.equal(
    new Date(evening.from).toISOString(),
    "2026-03-08T21:00:00.000Z"
  );
});
test("tomorrow uses local calendar boundaries across a 23-hour DST day", () => {
  const range = discoveryWindow(
    "tomorrow",
    new Date("2026-03-07T17:00:00Z"),
    "America/New_York"
  );
  assert.equal(new Date(range.from).toISOString(), "2026-03-08T05:00:00.000Z");
  assert.equal(range.to - range.from, 23 * 3600000);
});
test("unknown prices/durations do not satisfy stated constraints and free ideas remain separate", () => {
  const i = interpretDiscoveryIntent("adventure under ₱500 for 30 minutes");
  assert.deepEqual(
    rankDiscoveryResults(
      [
        result(),
        result({ key: "unknown", pricePhp: null }),
        result({ key: "too-long", minutes: 60 }),
        result({ key: "unknown-time", minutes: null }),
      ],
      i,
      area,
      now
    ).map((r) => r.key),
    ["postcard"]
  );
});
test("music tonight needs actual scheduled music; historical stories and music venues are not performances", () => {
  const i = interpretDiscoveryIntent("live music tonight");
  const candidates = [
    result({ kind: "PLACE", key: "club", title: "Music club" }),
    result({ kind: "STORY", key: "past", title: "Music last night" }),
    result({
      kind: "EVENT",
      key: "gig",
      title: "Acoustic band concert",
      startsAt: "2026-11-10T11:00:00Z",
      endsAt: "2026-11-10T13:00:00Z",
    }),
    result({
      kind: "EVENT",
      key: "daytime",
      title: "Music concert",
      startsAt: "2026-11-10T05:00:00Z",
      endsAt: "2026-11-10T07:00:00Z",
    }),
  ];
  assert.deepEqual(
    rankDiscoveryResults(candidates, i, area, now).map((r) => r.key),
    ["gig"]
  );
});
test("expired/distant results cannot outrank eligibility, and duplicate/tie order is stable", () => {
  const i = interpretDiscoveryIntent("What should I do?");
  const a = result({ key: "a" }),
    b = result({ key: "b" });
  assert.deepEqual(
    rankDiscoveryResults(
      [
        b,
        a,
        a,
        result({ key: "expired", endsAt: "2026-11-09T00:00:00Z" }),
        result({
          key: "far",
          place: { slug: "far", name: "Far", lat: -33.8, lng: 151.2 },
        }),
      ],
      i,
      area,
      now
    ).map((r) => r.key),
    ["a", "b"]
  );
});
test("solo and paid intents never turn free play into a paid opportunity or a meetup into solo activity", () => {
  assert.deepEqual(
    rankDiscoveryResults(
      [result()],
      interpretDiscoveryIntent("paid opportunities"),
      area,
      now
    ),
    []
  );
  assert.deepEqual(
    rankDiscoveryResults(
      [result({ kind: "MEETUP", key: "group" })],
      interpretDiscoveryIntent("meet people solo"),
      area,
      now
    ),
    []
  );
});
