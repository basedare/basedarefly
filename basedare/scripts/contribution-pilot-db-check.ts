/* eslint-disable @typescript-eslint/no-require-imports -- Only ambient NextAuth session is absent; handlers, authorization and PostgreSQL are real. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PILOT_AUDIT_EVENT,
  PILOT_AWARD_EVENT,
  PILOT_XP_AWARD,
  PILOT_XP_REVERSAL,
} from "@/lib/contribution-pilot";
import { composePassport } from "@/lib/creator-passport";

const target = new URL(process.env.DATABASE_URL || "");
if (target.hostname !== "127.0.0.1" || !target.pathname.endsWith("_test"))
  throw Error("Disposable local PostgreSQL test database only.");
process.env.ADMIN_SECRET =
  "local-contribution-pilot-test-secret-at-least-32-characters";
process.env.BASE_MAINNET_RPC_URL = "http://127.0.0.1:9";
process.env.BASE_SEPOLIA_RPC_URL = "http://127.0.0.1:9";
delete process.env.CONTRIBUTION_PILOT_ENABLED;
let sessionWallet: string | null = null;
const Module = require("node:module"),
  originalLoad = Module._load;
Module._load = function (name: string, ...args: unknown[]) {
  if (name === "next-auth") return { getServerSession: async () => sessionWallet ? { walletAddress: sessionWallet } : null };
  return originalLoad.call(this, name, ...args);
};
const adminApi = require("@/app/api/admin/contribution-pilot/route");
const publicApi = require("@/app/api/contribution-pilot/route");
const {
  createAdminSessionCookieValue,
  ADMIN_SESSION_COOKIE_NAME,
} = require("@/lib/admin-auth");
Module._load = originalLoad;

const origin = "https://www.basedare.xyz",
  suffix = randomUUID().slice(0, 8);
const wallets = [
  "0x8181818181818181818181818181818181818181",
  "0x8282828282828282828282828282828282828282",
  "0x8383838383838383838383838383838383838383",
  "0x8484848484848484848484848484848484848484",
];
let requestNumber = 0,
  groups = 0;
function request(
  body?: unknown,
  options: {
    auth?: boolean;
    origin?: string;
    raw?: string;
    cookie?: string;
  } = {}
) {
  return new NextRequest(origin + "/api/admin/contribution-pilot", {
    method: body === undefined && options.raw === undefined ? "GET" : "POST",
    headers: {
      Origin: options.origin ?? origin,
      "Content-Type": "application/json",
      "x-forwarded-for": `198.51.${Math.floor(++requestNumber / 200)}.${
        (requestNumber % 200) + 1
      }`,
      ...(options.auth === false
        ? {}
        : { "x-admin-secret": process.env.ADMIN_SECRET! }),
      ...(options.cookie ? { Cookie: options.cookie } : {}),
    },
    ...(body !== undefined || options.raw !== undefined
      ? { body: options.raw ?? JSON.stringify(body) }
      : {}),
  });
}
const post = (body: unknown, options?: Parameters<typeof request>[1]) =>
  adminApi.POST(request(body, options));
const read = (id: string) =>
  publicApi.GET(
    new NextRequest(
      `${origin}/api/contribution-pilot?campaign=${encodeURIComponent(id)}`,
      {
        headers: {
          "x-forwarded-for": `203.0.113.${(++requestNumber % 200) + 1}`,
        },
      }
    )
  );
async function body(response: Response, status = 200) {
  assert.equal(response.status, status, await response.clone().text());
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  return response.json();
}
function passed(name: string) {
  groups += 1;
  console.info(`PASS contribution pilot: ${name}`);
}

async function main() {
  const tags = await Promise.all(
    wallets.map((walletAddress, index) =>
      prisma.streamerTag.create({
        data: {
          tag: `@cp-${index}-${suffix}`,
          walletAddress,
          status: "ACTIVE",
          verificationMethod: "fixture-only",
        },
      })
    )
  );
  const venue = await prisma.venue.create({
    data: {
      slug: `cp-place-${suffix}`,
      name: "Contribution local fixture only",
      latitude: 9.790123456,
      longitude: 126.150987654,
      moderatorNote: "PRIVATE_PILOT_VENUE_NOTE",
    },
  });
  const otherVenue = await prisma.venue.create({
    data: {
      slug: `cp-other-${suffix}`,
      name: "Other local fixture only",
      latitude: 9.79,
      longitude: 126.15,
    },
  });
  const now = Date.now();
  const session = await prisma.venueQrSession.create({
    data: {
      venueId: venue.id,
      sessionKey: `cp-session-${suffix}`,
      startedAt: new Date(now - 7200000),
      endsAt: new Date(now + 7200000),
    },
  });
  const policy = {
    version: 1,
    title: "Local fixture pilot only",
    description: "An isolated test campaign, not a real public campaign.",
    startsAt: new Date(now - 3600000).toISOString(),
    endsAt: new Date(now + 3600000).toISOString(),
    activityIds: ["three-details", "postcard"],
    venueId: venue.id,
    xp: { venueVisit: 10, reviewedCreation: 20, maxPerPerson: 50 },
  };
  const makeCreation = (wallet = wallets[0], extra: object = {}) =>
    prisma.adventureSubmission.create({
      data: {
        wallet,
        activityId: "three-details",
        runId: randomUUID(),
        venueSlug: venue.slug,
        caption: "PRIVATE_PILOT_CAPTION",
        hashtag: "fixture",
        mediaType: "IMAGE",
        privateMediaCid: "PRIVATE_PILOT_MEDIA_CID",
        privateMediaMime: "image/jpeg",
        publicConsentVersion: "adventure-display-v2",
        creatorCreditConsent: true,
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy: "fixture-reviewer",
        ...extra,
      },
    });
  const makeVisit = (extra: object = {}) =>
    prisma.venueCheckIn.create({
      data: {
        walletAddress: wallets[0],
        venueId: venue.id,
        venueSessionId: session.id,
        qrTokenHash: "PRIVATE_PILOT_QR_HASH",
        geoDistanceMeters: 12,
        ...extra,
      },
    });
  const creation = await makeCreation();
  const privateCreation = await makeCreation(wallets[1]);
  const visit = await makeVisit();
  await prisma.creatorPassport.create({ data: { walletAddress: wallets[0] } });
  const beforeReputationLedger = await composePassport(wallets[0]);
  await prisma.pointsEvent.create({
    data: {
      walletAddress: wallets[0],
      type: "vault_review",
      sourceId: `cp-reputation-${suffix}`,
      points: 7,
    },
  });
  const reputationBaseline = await composePassport(wallets[0], {
    persist: true,
  });
  assert.equal(
    reputationBaseline.signalPoints,
    beforeReputationLedger.signalPoints + 7,
    "the existing non-XP reputation ledger must still count"
  );
  const create = async (extra: object = {}) =>
    (
      await body(
        await post({ action: "create", policy: { ...policy, ...extra } })
      )
    ).data.campaignId as string;
  const campaignId = await create();
  const activate = (id = campaignId) =>
    post({ action: "activate", campaignId: id });
  const award = (
    kind: string,
    id: string,
    consent = true,
    campaign = campaignId
  ) =>
    post({
      action: "award",
      campaignId: campaign,
      sourceKind: kind,
      sourceId: id,
      publicLeaderboardConsent: consent,
    });
  const snapshot = async () => (await body(await adminApi.GET(request()))).data;

  const originalCampaign = await prisma.founderEvent.findUniqueOrThrow({
    where: { id: campaignId },
  });
  assert.equal(originalCampaign.status, "DRAFT");
  assert.deepEqual(originalCampaign.metadataJson, policy);
  assert.equal(
    await prisma.pointsEvent.count({ where: { type: PILOT_XP_AWARD } }),
    0
  );
  assert.equal((await snapshot()).enabled, false);
  await body(await activate(), 409);
  await body(await award("REVIEWED_CREATION", creation.id), 409);
  for (const id of [campaignId, "missing", "invalid!"])
    assert.deepEqual(await body(await read(id), 404), {
      success: false,
      error: "This campaign is unavailable.",
    });
  process.env.CONTRIBUTION_PILOT_ENABLED = "TRUE";
  await body(await activate(), 409);
  passed(
    "born draft, exact flag, default-off public privacy and no side-effect awards"
  );

  await body(await adminApi.GET(request(undefined, { auth: false })), 401);
  await body(
    await post({ action: "activate", campaignId }, { auth: false }),
    401
  );
  await body(
    await post(
      { action: "activate", campaignId },
      { origin: "https://evil.example" }
    ),
    403
  );
  const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${createAdminSessionCookieValue()}`;
  await body(await adminApi.GET(request(undefined, { auth: false, cookie })));
  for (const extra of [
    { wallet: wallets[1] },
    { score: 999 },
    { points: 50 },
    { reward: "cash" },
  ])
    await body(
      await post({
        action: "award",
        campaignId,
        sourceKind: "REVIEWED_CREATION",
        sourceId: creation.id,
        publicLeaderboardConsent: true,
        ...extra,
      }),
      400
    );
  await body(await post({}, { raw: '{"private":"SECRET_BROKEN_JSON' }), 400);
  const oversized = await post(
    {},
    { raw: "PRIVATE_PILOT_BODY" + "x".repeat(9000) }
  );
  assert.ok(
    !JSON.stringify(await body(oversized, 413)).includes("PRIVATE_PILOT_BODY")
  );
  passed(
    "real admin secret/cookie authorization, same-origin, bounded bodies and server-owned actor/score"
  );

  const retryPolicy = { ...policy, title: "Concurrent retry fixture pilot" };
  const concurrentCreates = await Promise.all(Array.from({ length: 8 }, () => post({ action: "create", policy: retryPolicy })));
  const createResults = await Promise.all(concurrentCreates.map((response) => body(response)));
  const retryId = createResults[0].data.campaignId;
  assert.ok(createResults.every((result) => result.data.campaignId === retryId && result.data.status === "DRAFT"));
  assert.equal(createResults.filter((result) => result.data.duplicate === false).length, 1);
  const retried = await body(await post({ action: "create", policy: { ...retryPolicy, title: `  ${retryPolicy.title}  `, activityIds: [...retryPolicy.activityIds].reverse(), startsAt: retryPolicy.startsAt.replace("Z", "+00:00"), xp: { maxPerPerson: retryPolicy.xp.maxPerPerson, reviewedCreation: retryPolicy.xp.reviewedCreation, venueVisit: retryPolicy.xp.venueVisit } } }));
  assert.deepEqual(retried.data, { campaignId: retryId, status: "DRAFT", duplicate: true });
  assert.equal(await prisma.founderEvent.count({ where: { eventType: PILOT_AUDIT_EVENT, subjectId: retryId, metadataJson: { path: ["action"], equals: "create" } } }), 1);
  assert.notEqual(await create({ title: "Changed title fixture pilot" }), campaignId);
  assert.notEqual(await create({ endsAt: new Date(now + 7200000).toISOString() }), campaignId);
  const priorModerators = process.env.MODERATOR_WALLETS;
  process.env.MODERATOR_WALLETS = wallets[2];
  sessionWallet = wallets[2];
  const otherActor = await body(await post({ action: "create", policy: retryPolicy }, { auth: false }));
  assert.notEqual(otherActor.data.campaignId, retryId, "different authorized actors have separate drafts");
  assert.equal(otherActor.data.status, "DRAFT");
  sessionWallet = null;
  if (priorModerators === undefined) delete process.env.MODERATOR_WALLETS;
  else process.env.MODERATOR_WALLETS = priorModerators;
  passed("concurrent create and response-loss retry deduplicate actor/canonical policy; changed title/window and different actor remain distinct");

  for (const badPolicy of [
    { ...policy, rewardPool: 100 },
    { ...policy, activityIds: ["made-up"] },
    { ...policy, activityIds: ["three-details", "three-details"] },
    { ...policy, xp: { ...policy.xp, venueVisit: 101 } },
    { ...policy, venueId: null },
    { ...policy, endsAt: new Date(now - 7200000).toISOString() },
  ])
    await body(await post({ action: "create", policy: badPolicy }), 400);
  await body(await post({ action: "edit", campaignId, policy }), 400);
  process.env.CONTRIBUTION_PILOT_ENABLED = "true";
  await body(await award("REVIEWED_CREATION", creation.id), 409);
  await body(await activate());
  assert.equal((await body(await read(campaignId))).data.standings.length, 0);
  const future = await create({
    startsAt: new Date(now + 1800000).toISOString(),
  });
  await body(await activate(future));
  await body(await read(future), 404);
  await body(await award("REVIEWED_CREATION", creation.id, true, future), 409);
  passed(
    "strict immutable policy, authored activity/XP bounds and active time-window eligibility"
  );

  const badCreations = await Promise.all([
    makeCreation(wallets[2], { status: "PENDING" }),
    makeCreation(wallets[2], { status: "WITHDRAWN" }),
    makeCreation(wallets[2], { publicConsentVersion: "unknown" }),
    makeCreation(wallets[2], { creatorCreditConsent: false }),
    makeCreation(wallets[2], { activityId: "soundtrack" }),
    makeCreation(wallets[2], { venueSlug: otherVenue.slug }),
    makeCreation(wallets[2], { createdAt: new Date(now - 7200000) }),
    makeCreation(wallets[2], { reviewedBy: null }),
    makeCreation(wallets[2], {
      privateMediaCid: null,
      privateMediaMime: null,
      mediaUrl: "http://example.com/private",
      socialUrl: null,
    }),
  ]);
  for (const row of badCreations)
    await body(await award("REVIEWED_CREATION", row.id), 409);
  for (const kind of ["CLICK", "SELF_REPORTED_FINISH", "REFERRAL"])
    await body(await award(kind, creation.id), 400);
  await body(await award("REVIEWED_CREATION", "nonexistent"), 409);
  const badVisits = await Promise.all([
    makeVisit({ status: "REVOKED" }),
    makeVisit({ proofLevel: "GPS" }),
    makeVisit({ source: "MANUAL" }),
    makeVisit({ venueSessionId: null }),
    makeVisit({ qrTokenHash: null }),
    makeVisit({ geoDistanceMeters: null }),
    makeVisit({ geoDistanceMeters: 999 }),
    makeVisit({ scannedAt: new Date(now - 7200000) }),
    makeVisit({ venueId: otherVenue.id }),
  ]);
  for (const row of badVisits)
    await body(await award("VENUE_CHECK_IN", row.id), 409);
  passed(
    "source revalidation rejects missing, private, unreviewed, out-of-window/place/activity and non-QR evidence"
  );

  const parallel = await Promise.all(
    Array.from({ length: 8 }, () => award("REVIEWED_CREATION", creation.id))
  );
  const results = await Promise.all(parallel.map((r) => body(r)));
  const awardId = results[0].data.awardId;
  assert.ok(results.every((r) => r.data.awardId === awardId));
  assert.equal(results.filter((r) => !r.data.duplicate).length, 1);
  assert.equal(
    await prisma.pointsEvent.count({
      where: {
        walletAddress: wallets[0],
        type: PILOT_XP_AWARD,
        sourceId: `REVIEWED_CREATION:${creation.id}`,
      },
    }),
    1
  );
  await body(await award("VENUE_CHECK_IN", visit.id));
  await body(await award("REVIEWED_CREATION", privateCreation.id, false));
  assert.equal(
    await prisma.pointsEvent.count({
      where: { walletAddress: wallets[0], type: PILOT_XP_AWARD },
    }),
    2
  );
  assert.equal(
    await prisma.founderEvent.count({
      where: {
        eventType: PILOT_AUDIT_EVENT,
        subjectId: campaignId,
        metadataJson: { path: ["action"], equals: "award" },
      },
    }),
    3
  );
  assert.deepEqual(
    (await prisma.founderEvent.findUniqueOrThrow({ where: { id: campaignId } }))
      .metadataJson,
    originalCampaign.metadataJson
  );
  assert.equal(
    (await composePassport(wallets[0], { persist: true })).signalPoints,
    reputationBaseline.signalPoints,
    "XP awards must not change composed or persisted Signal Points"
  );
  assert.equal(
    (
      await prisma.creatorPassport.findUniqueOrThrow({
        where: { walletAddress: wallets[0] },
      })
    ).signalPoints,
    reputationBaseline.signalPoints
  );
  passed(
    "concurrent requests issue one append-only source award, exact server policy XP and audit"
  );

  const firstPublic = (await body(await read(campaignId))).data;
  assert.deepEqual(
    firstPublic.standings.map((p: { tag: string; xp: number }) => ({
      tag: p.tag,
      xp: p.xp,
    })),
    [{ tag: tags[0].tag, xp: 30 }]
  );
  const publicText = JSON.stringify(firstPublic);
  for (const secret of [
    ...wallets,
    creation.id,
    visit.id,
    tags[0].id,
    privateCreation.id,
    "PRIVATE_PILOT_MEDIA_CID",
    "PRIVATE_PILOT_CAPTION",
    "PRIVATE_PILOT_QR_HASH",
    "PRIVATE_PILOT_VENUE_NOTE",
    "9.790123456",
  ])
    assert.ok(!publicText.includes(secret), secret);
  assert.ok(
    !publicText.includes(tags[1].tag),
    "private recognition must not enter standings"
  );
  assert.match(firstPublic.notice, /Non-cash XP/);
  assert.match(firstPublic.notice, /separate from reputation/);
  assert.equal(
    firstPublic.standings[0].profileHref,
    `/creator/${tags[0].tag.slice(1)}`
  );
  assert.equal(publicApi.POST, undefined);
  passed(
    "opt-in standings are read-only, whitelisted and contain no wallets/private evidence or money claim"
  );

  const repeatedCreation = await makeCreation(),
    repeatedVisit = await makeVisit();
  await body(await award("REVIEWED_CREATION", repeatedCreation.id), 409);
  await body(await award("VENUE_CHECK_IN", repeatedVisit.id), 409);
  const secondCampaignTitle = "Second local fixture pilot";
  const secondCampaign = await create({ title: secondCampaignTitle });
  await body(await activate(secondCampaign));
  await body(
    await award("REVIEWED_CREATION", creation.id, true, secondCampaign),
    409
  );
  const capCampaign = await create({
    xp: { venueVisit: 0, reviewedCreation: 20, maxPerPerson: 10 },
  });
  await body(await activate(capCampaign));
  const capCreation = await makeCreation(wallets[2]);
  await body(
    await award("REVIEWED_CREATION", capCreation.id, false, capCampaign),
    409
  );
  passed(
    "one recognition per place/activity, lifetime cap and global evidence deduplication resist farming"
  );

  await prisma.adventureSubmission.update({
    where: { id: creation.id },
    data: { status: "WITHDRAWN" },
  });
  assert.equal((await body(await read(campaignId))).data.standings[0].xp, 10);
  await body(await award("REVIEWED_CREATION", creation.id), 409);
  assert.equal(
    (await snapshot()).awards.find((a: { id: string }) => a.id === awardId)
      .current,
    false
  );
  await prisma.adventureSubmission.update({
    where: { id: creation.id },
    data: { status: "APPROVED" },
  });
  await prisma.streamerTag.update({
    where: { id: tags[0].id },
    data: { revokedAt: new Date() },
  });
  assert.equal((await body(await read(campaignId))).data.standings.length, 0);
  await prisma.streamerTag.update({
    where: { id: tags[0].id },
    data: { revokedAt: null, walletAddress: wallets[3] },
  });
  assert.equal((await body(await read(campaignId))).data.standings.length, 0);
  await prisma.streamerTag.update({
    where: { id: tags[0].id },
    data: { walletAddress: wallets[0] },
  });
  await prisma.venueCheckIn.update({
    where: { id: visit.id },
    data: { status: "REVOKED" },
  });
  assert.equal((await body(await read(campaignId))).data.standings[0].xp, 20);
  await prisma.venueCheckIn.update({
    where: { id: visit.id },
    data: { status: "CONFIRMED" },
  });
  passed(
    "withdrawal, revoked check-in and revoked/transferred identity remove current public score"
  );

  delete process.env.CONTRIBUTION_PILOT_ENABLED;
  const reverseResponses = await Promise.all(
    Array.from({ length: 6 }, () =>
      post({
        action: "reverse",
        awardId,
        reason: "Fixture withdrawal reversal",
      })
    )
  );
  const reverseResults = await Promise.all(
    reverseResponses.map((r) => body(r))
  );
  assert.equal(reverseResults.filter((r) => !r.data.duplicate).length, 1);
  const originalPoints = await prisma.pointsEvent.findUniqueOrThrow({
    where: {
      walletAddress_type_sourceId: {
        walletAddress: wallets[0],
        type: PILOT_XP_AWARD,
        sourceId: `REVIEWED_CREATION:${creation.id}`,
      },
    },
  });
  const reversedPoints = await prisma.pointsEvent.findUniqueOrThrow({
    where: {
      walletAddress_type_sourceId: {
        walletAddress: wallets[0],
        type: PILOT_XP_REVERSAL,
        sourceId: originalPoints.id,
      },
    },
  });
  assert.equal(originalPoints.points, 20);
  assert.equal(reversedPoints.points, -20);
  assert.equal(
    (await composePassport(wallets[0], { persist: true })).signalPoints,
    reputationBaseline.signalPoints,
    "XP reversals must not change composed or persisted Signal Points"
  );
  assert.equal(
    (
      await prisma.creatorPassport.findUniqueOrThrow({
        where: { walletAddress: wallets[0] },
      })
    ).signalPoints,
    reputationBaseline.signalPoints
  );
  assert.equal(
    await prisma.founderEvent.count({
      where: { id: awardId, eventType: PILOT_AWARD_EVENT },
    }),
    1
  );
  process.env.CONTRIBUTION_PILOT_ENABLED = "true";
  await body(await award("REVIEWED_CREATION", creation.id), 409);
  await body(await award("REVIEWED_CREATION", repeatedCreation.id), 409);
  assert.equal((await body(await read(campaignId))).data.standings[0].xp, 10);
  passed(
    "concurrent compensating reversal works while disabled, is idempotent and terminal without reaward quota"
  );
  passed(
    "real composePassport before/after awards and reversal preserves Signal Points while non-XP ledger still counts"
  );

  const tie = await makeCreation(wallets[2]);
  await body(await award("REVIEWED_CREATION", tie.id, true, secondCampaign));
  const tie2 = await makeCreation(wallets[3]);
  await body(await award("REVIEWED_CREATION", tie2.id, true, secondCampaign));
  const standings = (await body(await read(secondCampaign))).data.standings;
  assert.deepEqual(
    standings.map((s: { tag: string }) => s.tag),
    [tags[2].tag, tags[3].tag].sort()
  );
  assert.deepEqual(
    standings.map((s: { rank: number }) => s.rank),
    [1, 2]
  );
  passed("deterministic ties use public name after equal score");

  const tieAward = await prisma.founderEvent.findFirstOrThrow({
    where: {
      eventType: PILOT_AWARD_EVENT,
      dedupeKey: `contribution-pilot:award:REVIEWED_CREATION:${tie.id}`,
    },
  });
  const ledgerBeforeConsentWithdrawal = await prisma.pointsEvent.count();
  delete process.env.CONTRIBUTION_PILOT_ENABLED;
  await body(
    await post({
      action: "withdrawLeaderboardConsent",
      awardId: tieAward.id,
      reason: "Participant requested leaderboard privacy",
    })
  );
  assert.equal(
    (
      await body(
        await post({
          action: "withdrawLeaderboardConsent",
          awardId: tieAward.id,
          reason: "Duplicate opt-out request",
        })
      )
    ).data.duplicate,
    true
  );
  assert.equal(
    await prisma.pointsEvent.count(),
    ledgerBeforeConsentWithdrawal,
    "privacy withdrawal must not change XP or reputation"
  );
  assert.equal(
    (await snapshot()).awards.find((a: { id: string }) => a.id === tieAward.id)
      .leaderboardConsentWithdrawn,
    true
  );
  process.env.CONTRIBUTION_PILOT_ENABLED = "true";
  assert.deepEqual(
    (await body(await read(secondCampaign))).data.standings.map(
      (s: { tag: string }) => s.tag
    ),
    [tags[3].tag]
  );
  const laterPrivate = await makeCreation(wallets[2], {
    activityId: "postcard",
  });
  await body(
    await award("REVIEWED_CREATION", laterPrivate.id, true, secondCampaign),
    409
  );
  await body(
    await award("REVIEWED_CREATION", laterPrivate.id, false, secondCampaign)
  );
  assert.deepEqual(
    (await body(await read(secondCampaign))).data.standings.map(
      (s: { tag: string }) => s.tag
    ),
    [tags[3].tag]
  );
  await prisma.streamerTag.delete({ where: { id: tags[3].id } });
  assert.equal(
    (await body(await read(secondCampaign))).data.standings.length,
    0
  );
  passed(
    "flag-off campaign-wide leaderboard withdrawal retains XP, blocks re-publication, and deleted identity remains hidden"
  );

  await body(await post({ action: "pause", campaignId }));
  await body(await read(campaignId), 404);
  await body(await award("VENUE_CHECK_IN", repeatedVisit.id), 409);
  await body(await activate());
  await prisma.venue.update({
    where: { id: venue.id },
    data: { status: "SUSPENDED" },
  });
  await body(await read(campaignId), 404);
  await body(await award("REVIEWED_CREATION", capCreation.id), 409);
  await prisma.venue.update({
    where: { id: venue.id },
    data: { status: "ACTIVE" },
  });
  const raceCreation = await makeCreation(wallets[3], {
    activityId: "postcard",
  });
  const [closing, racing] = await Promise.all([
    post({ action: "close", campaignId: secondCampaign }),
    award("REVIEWED_CREATION", raceCreation.id, false, secondCampaign),
  ]);
  await body(closing);
  assert.ok([200, 409].includes(racing.status));
  await body(await read(secondCampaign), 404);
  await body(await activate(secondCampaign), 409);
  await body(
    await award("REVIEWED_CREATION", raceCreation.id, false, secondCampaign),
    409
  );
  assert.equal(
    (
      await prisma.founderEvent.findUniqueOrThrow({
        where: { id: secondCampaign },
      })
    ).status,
    "CLOSED"
  );
  const closedRetry = await body(await post({ action: "create", policy: { ...policy, title: secondCampaignTitle } }));
  assert.deepEqual(closedRetry.data, { campaignId: secondCampaign, status: "CLOSED", duplicate: true });
  passed(
    "pause/place state and concurrent close/award serialize; create retry preserves terminal close"
  );

  await prisma.founderEvent.createMany({
    data: Array.from({ length: 101 }, (_, index) => ({
      eventType: PILOT_AWARD_EVENT,
      subjectType: "contribution_pilot",
      subjectId: campaignId,
      dedupeKey: `cp-overflow-${suffix}-${index}`,
      status: "AWARDED",
      metadataJson: { fixture: "private source deliberately not projected" },
    })),
  });
  const overflow = (await body(await read(campaignId))).data;
  assert.equal(overflow.standingsAvailable, false);
  assert.equal(overflow.standings, null);
  assert.equal((await snapshot()).awardsLimited, true);
  passed(
    "bounded source overflow is unknown, not a truncated or zero leaderboard"
  );
  console.info(
    `Contribution pilot PostgreSQL checks passed (${groups} groups). No live campaign, provider or payment was used.`
  );
}
// The shared rate limiter owns a timer; exit only after database cleanup.
main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
