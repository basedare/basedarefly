/* eslint-disable @typescript-eslint/no-require-imports -- Only absent ambient session is stubbed; wallet authorization and database are real. */
import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildWalletActionMessage } from "@/lib/wallet-action-auth";
import { STORY_CONSENT, publicStory } from "@/lib/community-stories";

const target = new URL(process.env.DATABASE_URL || "");
if (target.hostname !== "127.0.0.1" || !target.pathname.includes("_test"))
  throw Error("Disposable local PostgreSQL only.");
process.env.BASE_MAINNET_RPC_URL = "http://127.0.0.1:9";
process.env.BASE_SEPOLIA_RPC_URL = "http://127.0.0.1:9";
const Module = require("node:module"),
  original = Module._load;
Module._load = function (name: string, ...args: unknown[]) {
  if (name === "next-auth") return { getServerSession: async () => null };
  return original.call(this, name, ...args);
};
const api = require("@/app/api/social/route");
Module._load = original;
const accounts = ["1", "2", "3"].map((k) =>
  privateKeyToAccount(("0x" + k.repeat(64)) as `0x${string}`),
);
const [author, reader, stranger] = accounts,
  owner = reader.address.toLowerCase(),
  origin = "https://www.basedare.xyz";
let sequence = 0;
async function request(
  query: Record<string, string>,
  body?: Record<string, unknown>,
  signer: typeof author | null = reader,
  requestOrigin = origin,
) {
  const action = body ? "social:write" : "social:read",
    issuedAt = new Date().toISOString(),
    walletAddress = signer?.address.toLowerCase();
  const headers = {
    Origin: requestOrigin,
    "x-forwarded-for": `192.0.2.${++sequence}`,
    ...(signer
      ? {
          "x-basedare-wallet": walletAddress!,
          "x-basedare-wallet-issued-at": issuedAt,
          "x-basedare-wallet-signature": await signer.signMessage({
            message: buildWalletActionMessage({
              walletAddress: walletAddress!,
              action,
              resource: "community",
              issuedAt,
            }),
          }),
        }
      : {}),
  };
  return new NextRequest(origin + "/api/social?" + new URLSearchParams(query), {
    headers,
    method: body ? "POST" : "GET",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function read(
  view: string,
  rest: Record<string, string> = {},
  signer: typeof author | null = reader,
) {
  return api.GET(
    await request({ view, wallet: owner, ...rest }, undefined, signer),
  );
}
async function write(
  kind: string,
  key: string,
  action: string,
  signer: typeof author | null = reader,
  wallet = owner,
) {
  return api.POST(await request({}, { kind, key, action, wallet }, signer));
}
async function ok(response: Response) {
  assert.equal(response.status, 200, await response.clone().text());
  return (await response.json()).data;
}
async function main() {
  const [person, viewer] = await Promise.all(
    accounts
      .slice(0, 2)
      .map((account, i) =>
        prisma.streamerTag.create({
          data: {
            tag: "@p1-local-" + i,
            walletAddress: account.address.toLowerCase(),
            status: "ACTIVE",
            verificationMethod: "fixture-only",
          },
        }),
      ),
  );
  const venue = await prisma.venue.create({
    data: {
      slug: "p1-local-place",
      name: "P1 fixture only",
      latitude: 9.79,
      longitude: 126.15,
      timezone: "Asia/Manila",
      claimedBy: author.address.toLowerCase(),
      claimedAt: new Date(),
      claimRequestStatus: "APPROVED",
    },
  });
  const unverified = await prisma.venue.create({
    data: {
      slug: "p1-unverified-place",
      name: "Unverified fixture only",
      latitude: 9.79,
      longitude: 126.15,
    },
  });
  const story = await prisma.founderEvent.create({
    data: {
      eventType: "LOCAL_SIGNAL",
      dedupeKey: "p1-local-story-fixture",
      subjectType: "community_story",
      subjectId: person.id,
      source: "community",
      title: "P1 fixture story only",
      status: "APPROVED",
      venueId: venue.id,
      venueSlug: venue.slug,
      metadataJson: {
        postType: "story",
        title: "P1 fixture story only",
        notes: "PRIVATE_SOURCE_CANARY stays out of operator fields.",
        city: "General Luna",
        latitude: 9.79,
        longitude: 126.15,
        authorTagId: person.id,
        authorWallet: author.address.toLowerCase(),
        publicConsentVersion: STORY_CONSENT,
        operatorNote: "PRIVATE_OPERATOR_CANARY",
      },
    },
  });
  const now = Date.now(),
    later = (hours: number) => new Date(now + hours * 3600000);
  const event = await prisma.venueEvent.create({
    data: {
      slug: "p1-local-event",
      venueId: venue.id,
      title: "Local future fixture only",
      category: "music",
      startsAt: later(2),
      endsAt: later(3),
      timezone: "Asia/Manila",
      sourceLabel: "Fixture only",
      trustLevel: "VENUE_POSTED",
      lastConfirmedAt: new Date(),
      expiresAt: later(4),
    },
  });
  const meetup = await prisma.meetup.create({
    data: {
      creatorBaretagId: person.id,
      title: "Local fixture meetup only",
      type: "jam",
      venueId: venue.id,
      placeLabel: venue.name,
      approxLat: 9.79,
      approxLng: 126.15,
      startTime: later(2),
    },
  });
  const moment = await prisma.adventureSubmission.create({
    data: {
      wallet: author.address.toLowerCase(),
      activityId: "three-details",
      runId: "p1-fixture-run",
      venueSlug: venue.slug,
      caption: "Local fixture Moment only",
      hashtag: "fixture",
      mediaType: "SOCIAL",
      socialUrl: "https://www.tiktok.com/@fixture/video/1234567890123456789",
      publicConsentVersion: "adventure-display-v2",
      creatorCreditConsent: true,
      status: "APPROVED",
    },
  });
  const area = { lat: "9.79", lng: "126.15", radiusKm: "25" };
  const feed = async () => ok(await read("following", area));
  assert.equal((await write("PERSON", person.id, "follow", null)).status, 401);
  assert.equal(
    (await write("PERSON", person.id, "follow", stranger)).status,
    401,
    "A signature cannot act for another wallet.",
  );
  assert.equal(
    (
      await api.POST(
        await request(
          {},
          { wallet: owner, kind: "PERSON", key: person.id, action: "follow" },
          reader,
          "https://evil.example",
        ),
      )
    ).status,
    403,
  );
  const guestState = await ok(
    await api.GET(
      await request({ kind: "PERSON", key: person.tag }, undefined, null),
    ),
  );
  assert.equal(guestState.target.key, person.id);
  assert.equal(guestState.identified, false);
  assert.equal((await write("VENUE", unverified.slug, "follow")).status, 404);
  await ok(await write("VENUE", unverified.slug, "save"));
  for (const r of await Promise.all([
    write("PERSON", person.id, "follow"),
    write("PERSON", person.id, "follow"),
  ]))
    await ok(r);
  assert.equal(
    await prisma.socialFollow.count({
      where: { wallet: owner, targetKey: person.id },
    }),
    1,
  );
  await ok(await write("VENUE", venue.slug, "follow"));
  assert.equal((await feed()).followingCount, 2);
  const items = (await feed()).items;
  assert.ok(items.some((i: { key: string }) => i.key === story.id));
  assert.ok(items.some((i: { key: string }) => i.key === moment.id));
  assert.ok(
    items.some((i: { key: string }) => i.key === "venue_event:" + event.id),
  );
  assert.ok(
    items.some((i: { key: string }) => i.key === "meetup:" + meetup.id),
  );
  assert.equal(
    (
      await ok(
        await read("following", {
          lat: "-33.86",
          lng: "151.2",
          radiusKm: "25",
        }),
      )
    ).items.length,
    0,
    "Browsing city governs Following.",
  );
  assert.ok(!JSON.stringify(items).includes("PRIVATE_OPERATOR_CANARY"));
  assert.ok(
    !JSON.stringify(items).includes(author.address.toLowerCase()),
    "No private wallet or follow snapshot DTO.",
  );
  await prisma.adventureSubmission.update({
    where: { id: moment.id },
    data: { creatorCreditConsent: false },
  });
  assert.ok(
    !(await feed()).items.some((i: { key: string }) => i.key === moment.id),
    "Uncredited content must not reveal an author via Following.",
  );
  await prisma.adventureSubmission.update({
    where: { id: moment.id },
    data: { creatorCreditConsent: true },
  });
  for (const [kind, key] of [
    ["VENUE", venue.slug],
    ["STORY", story.id],
    ["MOMENT", moment.id],
    ["ACTIVITY", "venue_event:" + event.id],
    ["ACTIVITY", "meetup:" + meetup.id],
  ])
    await ok(await write(kind, key, "save"));
  await ok(await write("STORY", story.id, "save"));
  assert.equal(
    await prisma.savedItem.count({
      where: { wallet: owner, targetKey: story.id },
    }),
    1,
  );
  assert.equal((await read("library", {}, stranger)).status, 401);
  assert.equal((await read("library", {}, null)).status, 401);
  assert.equal((await ok(await read("library"))).saves.length, 6);
  await prisma.streamerTag.update({
    where: { id: person.id },
    data: { revokedAt: new Date() },
  });
  assert.equal(
    await publicStory(story.id),
    null,
    "Revoked timestamp hides even a stale ACTIVE status.",
  );
  assert.ok(
    !(await feed()).items.some((i: { key: string }) =>
      [story.id, moment.id, "meetup:" + meetup.id].includes(i.key),
    ),
  );
  let library = await ok(await read("library"));
  assert.equal(
    library.saves.find((r: { key: string }) => r.key === story.id).target,
    null,
  );
  await prisma.streamerTag.update({
    where: { id: person.id },
    data: { revokedAt: null },
  });
  for (const reverse of [false, true]) {
    const block = await prisma.meetupBlock.create({
      data: {
        blockerBaretagId: reverse ? person.id : viewer.id,
        blockedBaretagId: reverse ? viewer.id : person.id,
      },
    });
    assert.equal(
      (await feed()).items.length,
      0,
      "Blocks apply in both directions, including the venue owner.",
    );
    assert.equal((await write("PERSON", person.id, "follow")).status, 404);
    library = await ok(await read("library"));
    assert.equal(
      library.saves.find((r: { key: string }) => r.key === story.id).target,
      null,
    );
    await prisma.meetupBlock.delete({ where: { id: block.id } });
  }
  await prisma.streamerTag.update({
    where: { id: person.id },
    data: { walletAddress: stranger.address.toLowerCase() },
  });
  assert.equal(
    (await feed()).followingCount,
    1,
    "A transferred tag cannot inherit its old followers.",
  );
  library = await ok(await read("library"));
  assert.equal(
    library.follows.find((r: { key: string }) => r.key === person.id).target,
    null,
  );
  await prisma.streamerTag.update({
    where: { id: person.id },
    data: { walletAddress: author.address.toLowerCase() },
  });
  await prisma.founderEvent.update({
    where: { id: story.id },
    data: { status: "WITHDRAWN" },
  });
  await prisma.venueEvent.update({
    where: { id: event.id },
    data: { status: "CANCELLED" },
  });
  await prisma.meetup.update({
    where: { id: meetup.id },
    data: { startTime: later(-2) },
  });
  library = await ok(await read("library"));
  for (const key of [
    story.id,
    "venue_event:" + event.id,
    "meetup:" + meetup.id,
  ])
    assert.equal(
      library.saves.find((r: { key: string }) => r.key === key).target,
      null,
    );
  assert.equal((await write("STORY", story.id, "save")).status, 404);
  await ok(await write("STORY", story.id, "unsave"));
  await prisma.venue.update({
    where: { id: venue.id },
    data: { status: "SUSPENDED" },
  });
  assert.equal((await feed()).items.length, 0);
  await ok(await write("VENUE", venue.id, "unfollow"));
  await prisma.streamerTag.update({
    where: { id: person.id },
    data: { status: "REVOKED" },
  });
  await ok(await write("PERSON", person.id, "unfollow"));
  assert.equal((await feed()).followingCount, 0);
  const other = stranger.address.toLowerCase();
  await prisma.savedItem.createMany({
    data: Array.from({ length: 99 }, (_, i) => ({
      wallet: other,
      targetKind: "STORY",
      targetKey: "unavailable-local-fixture-" + i,
    })),
  });
  await prisma.venue.update({
    where: { id: venue.id },
    data: { status: "ACTIVE" },
  });
  const cap = await Promise.all([
    write("VENUE", venue.id, "save", stranger, other),
    write("VENUE", unverified.id, "save", stranger, other),
  ]);
  assert.deepEqual(cap.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    await prisma.savedItem.count({ where: { wallet: other, active: true } }),
    100,
    "Concurrent writes cannot exceed the owner cap.",
  );
  for (const table of ["SocialFollow", "SavedItem"]) {
    const rows = await prisma.$queryRawUnsafe<Array<{ rowsecurity: boolean }>>(
      `SELECT rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='${table}'`,
    );
    assert.equal(rows[0].rowsecurity, true);
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL ROLE anon");
        await tx.$queryRawUnsafe(`SELECT * FROM "${table}"`);
      }),
    );
  }
  console.log(
    "PASS: real signed Follow/Unfollow, Save/Unsave, canonical sources, private lists, Following, city, credit, bilateral blocks, revocation/transfer, cancellation/expiry, concurrency caps and RLS. Disposable fixtures only.",
  );
}
main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
