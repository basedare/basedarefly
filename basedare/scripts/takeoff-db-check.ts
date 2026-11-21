/* eslint-disable @typescript-eslint/no-require-imports -- Ambient NextAuth session is unavailable outside the server; actual admin authorization is exercised. */
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { buildWalletActionMessage } from "@/lib/wallet-action-auth";
import { prisma } from "@/lib/prisma";
import { participationWindow } from "@/lib/participation-scorecard";
import { loadParticipationScorecard } from "@/lib/participation-scorecard-server";
const db = new URL(process.env.DATABASE_URL || "");
if (db.hostname !== "127.0.0.1" || !db.pathname.includes("_test"))
  throw Error("Disposable local database required.");
process.env.ADMIN_SECRET =
  "fixture-takeoff-admin-secret-at-least-32-characters";
process.env.GROWTH_BRAIN_EXPORT_SECRET =
  "fixture-read-only-growth-secret-at-least-32-characters";
process.env.SIMULATE_BOUNTIES = "true";
const Module = require("node:module"),
  original = Module._load;
Module._load = function (name: string, ...args: unknown[]) {
  if (name === "next-auth") return { getServerSession: async () => null };
  return original.call(this, name, ...args);
};
const admin = require("@/app/api/admin/takeoff/route"),
  growth = require("@/app/api/growth/participation/route"),
  options = require("@/app/api/adventure-submissions/options/route");
Module._load = original;
const origin = "https://www.basedare.xyz",
  wallet = "0x" + "e".repeat(40);
const request = (body?: unknown, authorized = true, requestOrigin = origin) =>
  new NextRequest(origin + "/api/admin/takeoff", {
    method: body ? "POST" : "GET",
    headers: {
      Origin: requestOrigin,
      ...(authorized ? { "x-admin-secret": process.env.ADMIN_SECRET! } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
async function main() {
  assert.equal((await admin.GET(request(undefined, false))).status, 401);
  const startsAt = new Date(Date.now() + 86400000).toISOString(),
    endsAt = new Date(Date.now() + 15 * 86400000).toISOString();
  const draft = {
    revision: 0,
    owner: "Fixture owner",
    reviewer: "Fixture reviewer",
    supportEmail: "fixture@example.test",
    startsAt,
    endsAt,
    targetHosts: 1,
    targetCreators: 1,
    targetParticipants: 20,
    stopRule: "Pause immediately after a consent or safety failure.",
    activityIds: ["postcard"],
    hosts: [],
    creatorTags: [],
    creatorPermissionReference: "",
    trackingSlugs: [],
    businessEnquiryId: null,
    status: "DRAFT",
  };
  const body = { action: "savePilot", data: draft };
  assert.equal((await admin.POST(request(body, false))).status, 401);
  assert.equal(
    (await admin.POST(request(body, true, "https://example.test"))).status,
    403
  );
  const results = await Promise.all([
    admin.POST(request(body)),
    admin.POST(request(body)),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    (
      await admin.POST(
        request({
          action: "savePilot",
          data: { ...draft, revision: 1, status: "READY_FOR_REVIEW" },
        })
      )
    ).status,
    400
  );
  const report = await admin.GET(request());
  assert.equal(report.status, 200, await report.clone().text());
  const data = (await report.json()).data;
  assert.equal(data.pilot.revision, 1);
  assert.equal(data.payment.ready, false);
  assert.equal(data.payment.reason, "LIVE_MODE_NOT_CONFIRMED");
  const host = await prisma.venue.create({
    data: {
      slug: "fixture-takeoff-host",
      name: "Local fixture only",
      latitude: 9.79,
      longitude: 126.15,
      status: "ACTIVE",
    },
  });
  const creator = await prisma.streamerTag.create({
    data: {
      tag: "@fixture-takeoff",
      walletAddress: wallet,
      status: "ACTIVE",
      verificationMethod: "fixture-only",
    },
  });
  await prisma.creatorAttributionLink.create({
    data: {
      slug: "fixture-takeoff-link",
      creatorCode: "basedare",
      contentCode: "fixture",
      targetType: "PAGE",
      targetId: "postcard",
      targetHref: "/adventures/postcard",
      active: false,
    },
  });
  const ready = {
    ...draft,
    revision: 1,
    status: "READY_FOR_REVIEW",
    hosts: [
      {
        venueSlug: host.slug,
        permissionReference: "local host fixture only",
        confirmedAt: new Date().toISOString(),
      },
    ],
    creatorTags: [creator.tag],
    creatorPermissionReference: "local creator fixture only",
    trackingSlugs: ["fixture-takeoff-link"],
  };
  assert.equal(
    (
      await admin.POST(
        request({
          action: "savePilot",
          data: { ...ready, trackingSlugs: ["not-a-real-link"] },
        })
      )
    ).status,
    400
  );
  assert.equal(
    (await admin.POST(request({ action: "savePilot", data: ready }))).status,
    200
  );
  const persisted = (
    await prisma.founderEvent.findUniqueOrThrow({
      where: { dedupeKey: "takeoff-pilot:siargao:v1" },
    })
  ).metadataJson as { publicActivation: boolean };
  assert.equal(persisted.publicActivation, false);
  assert.equal(
    (
      await prisma.creatorAttributionLink.findUniqueOrThrow({
        where: { slug: "fixture-takeoff-link" },
      })
    ).active,
    false
  );
  const observation = {
    action: "acceptance",
    data: {
      check: "ios_account",
      result: "failed",
      releaseRevision: "a".repeat(40),
      tester: "Local fixture",
      evidenceReference: "local fixture only",
    },
  };
  const r1 = await admin.POST(request(observation));
  assert.equal(r1.status, 200);
  const r2 = await admin.POST(request(observation));
  assert.equal((await r1.json()).data.id, (await r2.json()).data.id);
  const before = await loadParticipationScorecard();
  assert.ok(before.complete);
  const window = participationWindow();
  const previous = new Date(Date.parse(window.previousStart) + 1000),
    current = new Date(Date.parse(window.currentStart) + 1000);
  const post = await prisma.adventureSubmission.create({
    data: {
      wallet,
      activityId: "postcard",
      runId: "fixture-takeoff-run1",
      caption: "Local fixture",
      hashtag: "basedarepostcard",
      socialUrl: "https://www.instagram.com/p/Fixture123/",
      socialPlatform: "INSTAGRAM",
      mediaType: "SOCIAL",
      publicConsentVersion: "adventure-display-v2",
      status: "APPROVED",
      createdAt: previous,
    },
  });
  const post2 = await prisma.adventureSubmission.create({
    data: {
      wallet,
      activityId: "postcard",
      runId: "fixture-takeoff-run2",
      caption: "Local fixture",
      hashtag: "basedarepostcard",
      socialUrl: "https://www.instagram.com/p/Fixture456/",
      socialPlatform: "INSTAGRAM",
      mediaType: "SOCIAL",
      publicConsentVersion: "adventure-display-v2",
      status: "APPROVED",
      createdAt: current,
    },
  });
  const after = await loadParticipationScorecard();
  assert.equal(
    after.metrics.returningAccounts,
    (before.metrics.returningAccounts ?? 0) + 1
  );
  assert.equal(
    after.metrics.activeAccounts,
    (before.metrics.activeAccounts ?? 0) + 1
  );
  await prisma.adventureSubmission.update({
    where: { id: post2.id },
    data: { status: "WITHDRAWN" },
  });
  assert.equal(
    (await loadParticipationScorecard()).metrics.returningAccounts,
    before.metrics.returningAccounts
  );
  assert.equal(
    (await growth.GET(new NextRequest(origin + "/api/growth/participation")))
      .status,
    401
  );
  const exportResponse = await growth.GET(
    new NextRequest(origin + "/api/growth/participation", {
      headers: {
        authorization: "Bearer " + process.env.GROWTH_BRAIN_EXPORT_SECRET,
      },
    })
  );
  assert.equal(exportResponse.status, 200);
  const exported = await exportResponse.text();
  assert.doesNotMatch(
    exported,
    new RegExp(wallet + "|fixture@example.test|" + post.id)
  );
  assert.equal(JSON.parse(exported).data.scope, "sitewide");
  const signer = privateKeyToAccount(("0x" + "3".repeat(64)) as `0x${string}`),
    actor = signer.address.toLowerCase(),
    issuedAt = new Date().toISOString();
  process.env.MOMENT_SUBMISSIONS_ENABLED = "false";
  process.env.MOMENT_ACCEPTANCE_ENABLED = "true";
  process.env.MOMENT_ACCEPTANCE_WALLETS = actor;
  process.env.MOMENT_ACCEPTANCE_STARTS_AT = new Date(
    Date.now() - 1000
  ).toISOString();
  process.env.MOMENT_ACCEPTANCE_UNTIL = new Date(
    Date.now() + 3600000
  ).toISOString();
  const optionsUrl = origin + "/api/adventure-submissions/options";
  assert.equal(
    (await (await options.GET(new NextRequest(optionsUrl))).json()).data
      .socialLinks,
    false
  );
  assert.equal(
    (await options.GET(new NextRequest(optionsUrl + "?wallet=" + actor)))
      .status,
    401
  );
  const signature = await signer.signMessage({
    message: buildWalletActionMessage({
      walletAddress: actor,
      action: "adventure:read",
      resource: "community",
      issuedAt,
    }),
  });
  const headers = {
    "x-basedare-wallet": actor,
    "x-basedare-wallet-signature": signature,
    "x-basedare-wallet-issued-at": issuedAt,
  };
  const permitted = await options.GET(
    new NextRequest(optionsUrl + "?wallet=" + actor, { headers })
  );
  assert.equal(permitted.status, 200);
  assert.deepEqual((await permitted.json()).data, {
    socialLinks: true,
    originalMedia: false,
  });
  process.env.MOMENT_ACCEPTANCE_UNTIL = new Date(Date.now() - 1).toISOString();
  assert.equal(
    (
      await (
        await options.GET(
          new NextRequest(optionsUrl + "?wallet=" + actor, { headers })
        )
      ).json()
    ).data.socialLinks,
    false
  );
  console.log(
    "PASS: real admin scope, origin, duplicate pilot revision, draft-only acceptance, current-source return counts, withdrawal, aggregate-only export. Disposable DB only."
  );
}
main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
