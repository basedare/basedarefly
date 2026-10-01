import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { changeFriend } from "@/lib/friends-server";
import {
  ADVENTURE_DISPLAY_CONSENT,
  adventureHashtag,
} from "@/lib/adventure-sharing";
import { ACTIVITY_SUGGESTIONS } from "@/lib/home-activities";
const target = new URL(process.env.DATABASE_URL || "");
if (target.hostname !== "127.0.0.1" || !target.pathname.includes("_test"))
  throw Error("Disposable database required");
const Module = require("node:module");
const original = Module._load;
Module._load = function (name: string, ...args: unknown[]) {
  if (name === "@/lib/wallet-action-auth-server")
    return {
      getAuthorizedWalletForRequest: async (
        req: NextRequest,
        input: { walletAddress: string },
      ) =>
        req.headers.get("x-test-wallet") === input.walletAddress
          ? input.walletAddress
          : null,
    };
  if (name === "@/lib/admin-auth")
    return {
      authorizeAdminRequest: async (req: NextRequest) => ({
        authorized: req.headers.get("x-test-admin") === "yes",
        walletAddress: "test-reviewer",
      }),
      unauthorizedAdminResponse: () => new Response("{}", { status: 401 }),
    };
  if (name === "@/lib/media-upload")
    return {
      validateSupportedMediaFile: () => null,
      uploadPublicMediaFile: async () => ({
        url: "https://example.com/test.jpg",
        proofType: "IMAGE",
      }),
    };
  return original.call(this, name, ...args);
};
const routes = require("@/app/api/adventure-submissions/route");
const admin = require("@/app/api/admin/adventures/route");
const a = "0x1111111111111111111111111111111111111111",
  b = "0x2222222222222222222222222222222222222222",
  c = "0x3333333333333333333333333333333333333333";
const activityId = ACTIVITY_SUGGESTIONS[0].id;
function upload(runId: string, auth = true, consent = true) {
  const form = new FormData();
  form.set("wallet", a);
  form.set("activityId", activityId);
  form.set("runId", runId);
  form.set("venueSlug", "social-test");
  form.set("caption", "Test only");
  form.set("file", new File(["test"], "test.jpg", { type: "image/jpeg" }));
  if (consent) form.set("consent", ADVENTURE_DISPLAY_CONSENT);
  return new NextRequest("https://example.com/api/adventure-submissions", {
    method: "POST",
    headers: auth ? { "x-test-wallet": a } : {},
    body: form,
  });
}
async function read(path = "") {
  return (
    await (
      await routes.GET(
        new NextRequest("https://example.com/api/adventure-submissions" + path),
      )
    ).json()
  ).data;
}
function review(id: string, status: string) {
  return admin.PUT(
    new NextRequest("https://example.com/api/admin/adventures", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-test-admin": "yes" },
      body: JSON.stringify({ id, status, reason: "Checked test only" }),
    }),
  );
}
async function main() {
  await prisma.venue.create({
    data: {
      slug: "social-test",
      name: "Test",
      latitude: 9.79,
      longitude: 126.15,
    },
  });
  assert.equal((await routes.POST(upload("test-run-0001", false))).status, 401);
  assert.equal(
    (await routes.POST(upload("test-run-0001", true, false))).status,
    400,
  );
  const results = await Promise.all([
    routes.POST(upload("test-run-0001")),
    routes.POST(upload("test-run-0001")),
  ]);
  assert.ok(results.every((r) => r.status === 200));
  assert.equal(await prisma.adventureSubmission.count(), 1);
  const post = await prisma.adventureSubmission.findFirstOrThrow();
  assert.equal(post.status, "PENDING");
  assert.equal(post.promotionContact, false);
  assert.equal((await read()).length, 0);
  assert.equal(
    (
      await admin.PUT(
        new NextRequest("https://example.com/api/admin/adventures", {
          method: "PUT",
          body: "{}",
        }),
      )
    ).status,
    401,
  );
  const decisions = await Promise.all([
    review(post.id, "APPROVED"),
    review(post.id, "APPROVED"),
  ]);
  assert.deepEqual(decisions.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await read("?tag=" + adventureHashtag(activityId))).length, 1);
  assert.equal((await read("?lat=0&lng=0&radiusKm=1")).length, 0);
  assert.equal((await read("?lat=9.79&lng=126.15&radiusKm=1")).length, 1);
  const publicPost = (await read())[0];
  assert.equal(publicPost.wallet, undefined);
  assert.equal(publicPost.promotionContact, undefined);
  await routes.DELETE(
    new NextRequest("https://example.com/api/adventure-submissions", {
      method: "DELETE",
      headers: { "x-test-wallet": b, "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, wallet: b }),
    }),
  );
  assert.equal((await read()).length, 1);
  await routes.DELETE(
    new NextRequest("https://example.com/api/adventure-submissions", {
      method: "DELETE",
      headers: { "x-test-wallet": a, "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, wallet: a }),
    }),
  );
  assert.equal((await read()).length, 0);
  assert.equal((await review(post.id, "APPROVED")).status, 409);
  await routes.POST(upload("test-run-0002"));
  await routes.POST(upload("test-run-0003"));
  assert.equal((await routes.POST(upload("test-run-0004"))).status, 429);
  for (const [i, wallet] of [a, b, c].entries())
    await prisma.streamerTag.create({
      data: {
        tag: "@social-test-" + i,
        walletAddress: wallet,
        status: "ACTIVE",
        verificationMethod: "test",
      },
    });
  await Promise.all([
    changeFriend(a, b, "request"),
    changeFriend(a, b, "request"),
  ]);
  assert.equal(await prisma.friendConnection.count(), 1);
  await assert.rejects(() => changeFriend(a, b, "accept"));
  await changeFriend(b, a, "accept");
  assert.equal(
    (await prisma.friendConnection.findFirstOrThrow()).status,
    "ACCEPTED",
  );
  await changeFriend(a, b, "remove");
  await assert.rejects(() => changeFriend(a, b, "request"));
  const tags = await prisma.streamerTag.findMany();
  await prisma.meetupBlock.create({
    data: {
      blockerBaretagId: tags.find((t) => t.walletAddress === a)!.id,
      blockedBaretagId: tags.find((t) => t.walletAddress === c)!.id,
    },
  });
  await assert.rejects(() => changeFriend(c, a, "request"));
  assert.equal(await prisma.placeTag.count(), 0);
  assert.equal(await prisma.pointsEvent.count(), 0);
  console.log(
    "PASS: auth, consent, duplicate upload, pending privacy, concurrent review, hashtag/area filters, ownership, withdrawal, cap, bilateral friends and blocks; no verified evidence or points created.",
  );
}
main()
  .finally(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
