/** Real database and route logic; explicit local-only auth fixtures, never production. */
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  spotlightKey,
  spotlightWeek,
  WEEKLY_SPOTLIGHT_EVENT,
} from "@/lib/moment-motivation";
import {
  getMomentComparison,
  getWeeklySpotlight,
} from "@/lib/moment-spotlight-server";
const target = new URL(process.env.DATABASE_URL || "");
if (target.hostname !== "127.0.0.1" || !target.pathname.includes("_test"))
  throw Error("Disposable database required");
const Module = require("node:module");
const load = Module._load;
Module._load = function (name: string, ...args: unknown[]) {
  if (name === "@/lib/admin-auth")
    return {
      authorizeAdminRequest: async (req: NextRequest) => ({
        authorized: req.headers.get("x-test-admin") === "yes",
        walletAddress: "fixture-editor",
      }),
      unauthorizedAdminResponse: () => new Response("{}", { status: 401 }),
    };
  return load.call(this, name, ...args);
};
const admin = require("@/app/api/admin/adventures/route");
Module._load = load;
async function main() {
  const week = spotlightWeek();
  const a = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa001",
    b = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa002";
  await prisma.streamerTag.createMany({
    data: [
      {
        tag: "@motivation-a",
        walletAddress: a,
        status: "ACTIVE",
        verificationMethod: "local-fixture",
      },
      {
        tag: "@motivation-b",
        walletAddress: b,
        status: "ACTIVE",
        verificationMethod: "local-fixture",
      },
    ],
  });
  for (const [id, wallet, parent] of [
    ["motivation-parent", a, null],
    ["motivation-reply", b, "motivation-parent"],
    ["motivation-unrelated", a, null],
  ] as const)
    await prisma.adventureSubmission.create({
      data: {
        id,
        wallet,
        activityId: "wave-or-ex",
        runId: id,
        caption: "Explicit local motivation fixture only",
        hashtag: "basedarewaveorex",
        socialUrl:
          "https://x.com/fixture/status/" +
          (id === "motivation-parent"
            ? "111111111"
            : id === "motivation-reply"
            ? "222222222"
            : "333333333"),
        mediaType: "SOCIAL",
        status: "APPROVED",
        publicConsentVersion: "adventure-display-v2",
        creatorCreditConsent: true,
        spotlightConsent: true,
        parentMomentId: parent,
      },
    });
  const decide = (id: string, featured: boolean, extra = {}) =>
    admin.PUT(
      new NextRequest("https://example.com/api/admin/adventures", {
        method: "PUT",
        headers: { "x-test-admin": "yes", Origin: "https://example.com" },
        body: JSON.stringify({
          id,
          featured,
          reason: "Fixture editorial review",
          spotlightWeek: week.key,
          ...extra,
        }),
      })
    );
  assert.equal(
    (
      await admin.PUT(
        new NextRequest("https://example.com/api/admin/adventures", {
          method: "PUT",
          body: "{}",
        })
      )
    ).status,
    401
  );
  assert.equal(
    (await decide("motivation-parent", true, { spotlightWeek: "2000-01-03" }))
      .status,
    409
  );
  // Concurrent editors produce exactly one weekly slot, with one authoritative pick.
  const choices = await Promise.all([
    decide("motivation-parent", true),
    decide("motivation-reply", true),
  ]);
  assert.deepEqual(
    choices.map((r) => r.status),
    [200, 200]
  );
  assert.equal(
    await prisma.founderEvent.count({
      where: { dedupeKey: spotlightKey(week.key) },
    }),
    1
  );
  const selected = await getWeeklySpotlight();
  assert.ok(selected);
  const notices = await prisma.notification.count({
    where: { title: "Your creation made the Spotlight" },
  });
  assert.ok(
    notices >= 2,
    "Concurrent distinct picks should generate actual recognition notifications"
  );
  assert.equal((await decide(selected.post.id, true)).status, 200);
  assert.equal(
    await prisma.notification.count({
      where: { title: "Your creation made the Spotlight" },
    }),
    notices,
    "A retried selection must not notify again"
  );
  assert.ok(await getMomentComparison("motivation-parent", "motivation-reply"));
  assert.equal(
    await getMomentComparison("motivation-parent", "motivation-unrelated"),
    null
  );
  assert.equal(
    await getMomentComparison("motivation-parent", "motivation-parent"),
    null
  );
  await prisma.adventureSubmission.update({
    where: { id: "motivation-reply" },
    data: { status: "FLAGGED" },
  });
  assert.equal(
    await getMomentComparison("motivation-parent", "motivation-reply"),
    null
  );
  await prisma.adventureSubmission.update({
    where: { id: "motivation-reply" },
    data: { status: "APPROVED" },
  });
  await prisma.adventureSubmission.update({
    where: { id: selected.post.id },
    data: { spotlightConsent: false },
  });
  assert.equal(await getWeeklySpotlight(), null);
  assert.equal((await decide(selected.post.id, true)).status, 409);
  await prisma.adventureSubmission.update({
    where: { id: selected.post.id },
    data: { spotlightConsent: true },
  });
  const wallet = selected.post.id === "motivation-parent" ? a : b;
  await prisma.streamerTag.updateMany({
    where: { walletAddress: wallet },
    data: { revokedAt: new Date() },
  });
  assert.equal(await getWeeklySpotlight(), null);
  await prisma.streamerTag.updateMany({
    where: { walletAddress: wallet },
    data: { revokedAt: null },
  });
  assert.equal((await decide(selected.post.id, false)).status, 200);
  assert.equal(await getWeeklySpotlight(), null);
  assert.equal(
    (
      await prisma.founderEvent.findUniqueOrThrow({
        where: { dedupeKey: spotlightKey(week.key) },
      })
    ).status,
    "REMOVED"
  );
  assert.equal((await decide("motivation-parent", true)).status, 200);
  // Actual card handlers must recheck after asynchronous bundled-art/font work.
  let cardRace: () => Promise<unknown> = async () => {};
  const previousLoad = Module._load;
  Module._load = function (name: string, ...args: unknown[]) {
    if (name === "@/lib/adventure-og")
      return {
        adventureOg: async () => {
          await cardRace();
          return new Response("isolated-art-fixture");
        },
      };
    return previousLoad.call(this, name, ...args);
  };
  const comparisonCard =
    require("@/app/moments/[id]/compare/[otherId]/opengraph-image").default;
  const weeklyCard =
    require("@/app/moments/spotlight/[week]/opengraph-image").default;
  Module._load = previousLoad;
  cardRace = () =>
    prisma.adventureSubmission.update({
      where: { id: "motivation-reply" },
      data: { status: "FLAGGED" },
    });
  assert.equal(
    (
      await comparisonCard({
        params: Promise.resolve({
          id: "motivation-parent",
          otherId: "motivation-reply",
        }),
      })
    ).status,
    404
  );
  await prisma.adventureSubmission.update({
    where: { id: "motivation-reply" },
    data: { status: "APPROVED" },
  });
  cardRace = () =>
    prisma.adventureSubmission.update({
      where: { id: "motivation-parent" },
      data: { status: "WITHDRAWN" },
    });
  assert.equal(
    (await weeklyCard({ params: Promise.resolve({ week: week.key }) })).status,
    404
  );
  await prisma.adventureSubmission.update({
    where: { id: "motivation-parent" },
    data: { status: "APPROVED" },
  });
  const rejected = await admin.PUT(
    new NextRequest("https://example.com/api/admin/adventures", {
      method: "PUT",
      headers: { "x-test-admin": "yes" },
      body: JSON.stringify({
        id: "motivation-parent",
        status: "REJECTED",
        reason: "Fixture removal",
      }),
    })
  );
  assert.equal(rejected.status, 200);
  assert.equal(await getWeeklySpotlight(), null);
  assert.equal(
    await getMomentComparison("motivation-parent", "motivation-reply"),
    null
  );
  assert.equal(
    (
      await prisma.founderEvent.findUniqueOrThrow({
        where: { dedupeKey: spotlightKey(week.key) },
      })
    ).eventType,
    WEEKLY_SPOTLIGHT_EVENT
  );
  console.log(
    "PASS: real concurrent weekly selection, retry idempotency, stale-week refusal, independent comparison, current consent/identity/status checks and removal. Local fixtures only."
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
