/* eslint-disable @typescript-eslint/no-require-imports -- Replace ambient NextAuth and RPC transport only; exercise real signatures, routes and PostgreSQL. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { prisma } from "@/lib/prisma";
import { EconomyCommand, type EconomyInput } from "@/lib/local-economy";
import { executeEconomy, readEconomy } from "@/lib/local-economy-server";
import {
  writeRelationship,
  relationshipState,
  followingProjection,
} from "@/lib/social-retention-server";
import {
  sessionRecordingPayload,
  recordingWithdrawalPayload,
} from "@/lib/session-recordings-server";
import { publicMomentAllowed } from "@/lib/adventure-evidence";
import { buildWalletActionMessage } from "@/lib/wallet-action-auth";
const Module = require("node:module"),
  original = Module._load;
Module._load = function (name: string, ...args: unknown[]) {
  if (name === "next-auth")
    return {
      ...original.call(this, name, ...args),
      getServerSession: async () => null,
    };
  if (name === "viem") {
    const real = original.call(this, name, ...args);
    return {
      ...real,
      createPublicClient: () => ({ verifyMessage: real.verifyMessage }),
    };
  }
  return original.call(this, name, ...args);
};
const route = require("../app/api/local-economy/route");
const accounts = Array.from({ length: 5 }, () =>
  privateKeyToAccount(generatePrivateKey())
);
const w = accounts.map((a) => a.address.toLowerCase());
let checks = 0;
function eq(a: unknown, b: unknown, label: string) {
  assert.deepEqual(a, b, label);
  checks++;
}
async function denied(work: Promise<unknown>, label: string) {
  await assert.rejects(work, undefined, label);
  checks++;
}
const call = (i: number, c: EconomyInput) =>
  executeEconomy(w[i], EconomyCommand.parse(c));
async function signed(i: number, action = "social:write") {
  const issuedAt = new Date().toISOString();
  return {
    "x-basedare-wallet": w[i],
    "x-basedare-wallet-issued-at": issuedAt,
    "x-basedare-wallet-signature": await accounts[i].signMessage({
      message: buildWalletActionMessage({
        walletAddress: w[i],
        action,
        resource: "community",
        issuedAt,
      }),
    }),
  };
}
async function main() {
  eq(new URL(process.env.DATABASE_URL!).hostname, "127.0.0.1", "Local DB only");
  assert.match(new URL(process.env.DATABASE_URL!).pathname, /economy_test/);
  eq(
    await prisma.meetupRsvp.count({
      where: { id: "economy-legacy-rsvp", meetupId: "economy-legacy-meetup" },
    }),
    1,
    "Legacy meetup participation preserved by migration"
  );
  globalThis.fetch = async () => {
    throw Error("External network prohibited in fixture test");
  };
  const tags = await Promise.all(
    w.map((walletAddress, i) =>
      prisma.streamerTag.create({
        data: {
          tag: "@fixture-person-" + i,
          walletAddress,
          status: "ACTIVE",
          verificationMethod: "fixture",
        },
      })
    )
  );
  const v = await prisma.venue.create({
    data: {
      slug: "siargao-session-fixture",
      name: "Siargao venue — FIXTURE ONLY",
      latitude: 9.79,
      longitude: 126.15,
      city: "Siargao",
      timezone: "Asia/Manila",
      claimedBy: w[0],
      claimedAt: new Date(),
      claimRequestStatus: "APPROVED",
    },
  });
  const n = await call(1, {
    action: "node.create",
    slug: "bhabie-waves-fixture",
    name: "Bhabie Waves — FIXTURE ONLY",
    about: "Synthetic pilot; no band consent or event is claimed.",
    category: "Music",
    city: "Siargao",
  });
  eq((await readEconomy(null)).nodes.length, 0, "Draft private");
  await denied(
    call(2, { action: "node.publish", id: n.id, consent: true }),
    "Stranger cannot publish"
  );
  await call(1, { action: "node.publish", id: n.id, consent: true });
  const sameNode = await call(1, {
    action: "node.create",
    slug: "bhabie-waves-fixture",
    name: "Bhabie Waves — FIXTURE ONLY",
    about: "Synthetic pilot; no band consent or event is claimed.",
    category: "Music",
    city: "Siargao",
  });
  eq(sameNode.id, n.id, "Identical create retry returns original Node");
  await writeRelationship(w[4], { kind: "NODE", key: n.id }, "follow");
  eq(
    (await relationshipState({ kind: "NODE", key: n.id }, w[4])).following,
    true,
    "Node uses canonical follow ledger"
  );
  const invitation = await call(1, {
    action: "member.invite",
    id: n.id,
    tag: tags[2].tag,
    role: "ADMIN",
  });
  await denied(
    call(3, {
      action: "member.respond",
      id: invitation.id,
      accept: true,
      publicConsent: true,
    }),
    "Invite belongs to recipient"
  );
  await call(2, {
    action: "member.respond",
    id: invitation.id,
    accept: true,
    publicConsent: false,
  });
  eq(
    (await readEconomy(null)).nodes[0].members.length,
    0,
    "Private member never projected"
  );
  await denied(
    call(2, {
      action: "member.invite",
      id: n.id,
      tag: tags[3].tag,
      role: "ADMIN",
    }),
    "Only owner can delegate"
  );
  const startsAt = new Date(Date.now() + 86400000).toISOString(),
    endsAt = new Date(Date.now() + 90000000).toISOString(),
    expiresAt = new Date(Date.now() + 3600000).toISOString();
  const terms = {
    action: "opportunity.create" as const,
    venueId: v.id,
    kind: "GIG" as const,
    title: "Pilot performance — fixture",
    description: "Synthetic direct gig; no real booking.",
    compensation: "PAID" as const,
    amountMinor: 250000,
    currency: "PHP" as const,
    exchangeTerms:
      "One original acoustic set; no media rights included. Cancellation by mutual agreement.",
    startsAt,
    endsAt,
    expiresAt,
    capacity: 1,
    placePermission: true as const,
  };
  await denied(call(3, terms), "Unmanaged venue cannot post official offer");
  const direct = await call(0, { ...terms, targetNodeId: n.id });
  eq(
    (await readEconomy(null)).opportunities.length,
    0,
    "Direct offers private"
  );
  const directRow = await prisma.localOpportunity.findUniqueOrThrow({
    where: { id: direct.id },
  });
  await denied(
    call(3, {
      action: "opportunity.request",
      id: direct.id,
      message: "Forged",
      termsHash: directRow.termsHash,
    }),
    "Direct offer requires Node authority"
  );
  const accepted = await call(2, {
    action: "opportunity.request",
    id: direct.id,
    message: "Accept exact terms",
    termsHash: directRow.termsHash,
  });
  eq(
    (
      await prisma.opportunityRequest.findUniqueOrThrow({
        where: { id: accepted.id },
      })
    ).status,
    "CONFIRMED",
    "Authorized admin accepts direct offer"
  );
  await denied(
    call(1, {
      action: "opportunity.request",
      id: direct.id,
      message: "Second admin",
      termsHash: directRow.termsHash,
    }),
    "Cannot double-book a Node"
  );
  await denied(
    call(2, { action: "booking.complete", id: accepted.id }),
    "Future booking cannot be attested"
  );
  await call(1, { action: "member.remove", id: invitation.id });
  const direct2 = await call(0, {
    ...terms,
    targetNodeId: n.id,
    startsAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    endsAt: new Date(Date.now() + 2 * 86400000 + 3600000).toISOString(),
  });
  const d2 = await prisma.localOpportunity.findUniqueOrThrow({
    where: { id: direct2.id },
  });
  await denied(
    call(2, {
      action: "opportunity.request",
      id: direct2.id,
      message: "Revoked",
      termsHash: d2.termsHash,
    }),
    "Revoked admin loses authority"
  );
  await call(0, { action: "booking.cancel", id: accepted.id });
  const open = await call(0, {
    ...terms,
    compensation: "BARTER",
    amountMinor: undefined,
    currency: undefined,
    exchangeTerms:
      "Photos in exchange for a surf lesson. Confirm scope directly.",
  });
  const o = await prisma.localOpportunity.findUniqueOrThrow({
    where: { id: open.id },
  });
  await denied(
    call(2, {
      action: "opportunity.request",
      id: o.id,
      message: "Stale",
      termsHash: "0".repeat(64),
    }),
    "Exact terms required"
  );
  const r1 = await call(2, {
    action: "opportunity.request",
    id: o.id,
    message: "Private fixture note 1",
    termsHash: o.termsHash,
  });
  const retry = await call(2, {
    action: "opportunity.request",
    id: o.id,
    message: "Retry does not change immutable request",
    termsHash: o.termsHash,
  });
  eq(r1.id, retry.id, "Request retry idempotent");
  const r2 = await call(3, {
    action: "opportunity.request",
    id: o.id,
    message: "Private fixture note 2",
    termsHash: o.termsHash,
  });
  const race = await Promise.allSettled([
    call(0, { action: "opportunity.decide", id: r1.id, decision: "CONFIRMED" }),
    call(0, { action: "opportunity.decide", id: r2.id, decision: "CONFIRMED" }),
  ]);
  eq(
    race.filter((r) => r.status === "fulfilled").length,
    1,
    "Capacity race has one winner"
  );
  eq(
    await prisma.opportunityRequest.count({
      where: { opportunityId: o.id, status: "CONFIRMED" },
    }),
    1,
    "No overbooking"
  );
  const snapshot = await readEconomy(null, {
    lat: 9.79,
    lng: 126.15,
    radiusKm: 5,
  });
  const publicJson = JSON.stringify(snapshot);
  eq(
    publicJson.includes("Private fixture note"),
    false,
    "No private request text"
  );
  eq(publicJson.includes(w[0]), false, "No author wallet in public inventory");
  eq(
    (await readEconomy(null, { lat: -33.8, lng: 151.2, radiusKm: 5 }))
      .opportunities.length,
    0,
    "Geographic filter"
  );
  const sess = await call(1, {
    action: "session.create",
    nodeId: n.id,
    venueId: v.id,
    title: "Bhabie jam — FIXTURE ONLY",
    description: "Synthetic jam-podcast test only",
    startsAt: new Date(Date.now() + 4 * 3600000).toISOString(),
    endsAt: new Date(Date.now() + 5 * 3600000).toISOString(),
    guestCapacity: 1,
    recordingPolicy: "SEPARATE_CONSENT",
    placePermission: true,
  });
  const sameSession = await call(1, {
    action: "session.create",
    nodeId: n.id,
    venueId: v.id,
    title: "A separate no-recording fixture",
    description: "Fixture only",
    startsAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    endsAt: new Date(Date.now() + 2 * 86400000 + 3600000).toISOString(),
    guestCapacity: 1,
    recordingPolicy: "NO_RECORDING",
    placePermission: true,
  });
  const following = await followingProjection(w[4], {
    lat: 9.79,
    lng: 126.15,
    radiusKm: 5,
  });
  eq(
    following.items.some((i) => i.kind === "ACTIVITY"),
    true,
    "Following Node projects a current canonical Session"
  );
  const s = await prisma.baseDareSession.findUniqueOrThrow({
    where: { id: sess.id },
  });
  eq(
    await prisma.meetup.count({ where: { id: s.meetupId } }),
    1,
    "One canonical Meetup"
  );
  eq(
    await prisma.meetupRsvp.count({ where: { meetupId: s.meetupId } }),
    1,
    "Host audience intent only"
  );
  await prisma.meetupRsvp.create({
    data: { meetupId: s.meetupId, baretagId: tags[4].id },
  });
  eq(
    await prisma.sessionGuest.count({ where: { sessionId: s.id } }),
    0,
    "Audience RSVP never grants guest role"
  );
  const g1 = await call(2, {
    action: "session.apply",
    id: s.id,
    role: "Guitar",
    application: "Private application one",
  });
  const g2 = await call(3, {
    action: "session.apply",
    id: s.id,
    role: "Storyteller",
    application: "Private application two",
  });
  await denied(
    call(0, { action: "session.decide", id: g1.id, decision: "APPROVED" }),
    "Venue owner cannot approve another host Session"
  );
  const guestRace = await Promise.allSettled([
    call(1, { action: "session.decide", id: g1.id, decision: "APPROVED" }),
    call(1, { action: "session.decide", id: g2.id, decision: "APPROVED" }),
  ]);
  eq(
    guestRace.filter((r) => r.status === "fulfilled").length,
    1,
    "Guest capacity race has one winner"
  );
  eq(
    JSON.stringify(await readEconomy(null)).includes("Private application"),
    false,
    "Private applications never public"
  );
  await denied(
    call(2, { action: "session.attest", id: g1.id }),
    "Future Session cannot be attested"
  );
  const recording = await prisma.adventureSubmission.create({
    data: {
      wallet: w[4],
      activityId: "session-recording",
      sessionId: s.id,
      runId: "fixture-recording-original",
      venueSlug: v.slug,
      caption: "Original recording — fixture",
      hashtag: "basedaresession",
      mediaType: "VIDEO",
      privateMediaMime: "video/mp4",
      privateMediaCid: "bafy" + "a".repeat(50),
      sourceKey: process.env.ECONOMY_MEDIA_FIXTURE
        ? createHash("sha256")
            .update(readFileSync(process.env.ECONOMY_MEDIA_FIXTURE))
            .digest("hex")
        : "b".repeat(64),
      publicConsentVersion: "session-original-review-v1",
      status: "APPROVED",
    },
  });
  eq(
    publicMomentAllowed(recording),
    false,
    "Session originals quarantined after generic review"
  );
  const grant = await call(4, {
    action: "recording.grant",
    id: s.id,
    submissionId: recording.id,
    processing: true,
    publication: false,
    destinations: [],
    requiredCredit: "Fixture credit",
    rightsVersion: "session-recording-v1",
    rightsConfirmed: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  });
  await denied(
    sessionRecordingPayload(grant.id, w[4]),
    "Default closed upload/provider gate"
  );
  process.env.MOMENT_SUBMISSIONS_ENABLED = "true";
  process.env.MOMENT_ORIGINAL_MEDIA_ENABLED = "true";
  process.env.PINATA_JWT = "fixture-no-provider-requests";
  process.env.BASEDARE_MEDIA_TENANT = "fixture-local-tenant";
  await denied(
    sessionRecordingPayload(grant.id, w[4]),
    "Host approval required"
  );
  await denied(
    call(0, { action: "recording.approve", id: grant.id }),
    "Unrelated venue owner cannot approve recording"
  );
  await call(1, { action: "recording.approve", id: grant.id });
  const payload = await sessionRecordingPayload(grant.id, w[4]);
  eq(
    payload.payload.target.type,
    "moment",
    "Actual supported BaseClips target"
  );
  eq(
    payload.payload.grant.publication,
    false,
    "Processing-only remains processing-only"
  );
  eq(payload.payload.grant.training, false, "No training grant");
  eq(payload.payload.grant.evaluation, false, "No evaluation grant");
  eq(payload.payload.grant.destinations, [], "No implied destinations");
  eq(payload.payload.media_sha256, recording.sourceKey, "Bound original hash");
  await denied(
    sessionRecordingPayload(grant.id, w[1]),
    "Host cannot export contributor original"
  );
  const fs = require("node:fs");
  if (process.env.ECONOMY_CONTRACT_OUTPUT)
    fs.writeFileSync(
      process.env.ECONOMY_CONTRACT_OUTPUT,
      JSON.stringify(payload)
    );
  await denied(
    call(4, {
      action: "recording.grant",
      id: sameSession.id,
      submissionId: recording.id,
      processing: true,
      publication: false,
      destinations: [],
      requiredCredit: "Fixture",
      rightsVersion: "session-recording-v1",
      rightsConfirmed: true,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    }),
    "Cannot attach a recording to another or no-recording Session"
  );
  await call(4, { action: "recording.withdraw", id: grant.id });
  eq(
    (await recordingWithdrawalPayload(grant.id, w[4])).payload.action,
    "revoke",
    "Terminal withdrawal instruction remains accessible"
  );
  await denied(
    sessionRecordingPayload(grant.id, w[4]),
    "Withdrawal stops future exports"
  );
  await denied(
    call(1, { action: "recording.approve", id: grant.id }),
    "Withdrawal terminal"
  );
  await prisma.meetupBlock.create({
    data: { blockerBaretagId: tags[0].id, blockedBaretagId: tags[4].id },
  });
  await denied(
    call(4, {
      action: "opportunity.request",
      id: o.id,
      termsHash: o.termsHash,
      message: "Blocked",
    }),
    "Bilateral block"
  );
  const req = (
    query = "",
    h: Record<string, string> = {},
    body?: unknown,
    origin = "http://localhost"
  ) =>
    new NextRequest("http://localhost/api/local-economy" + query, {
      method: body ? "POST" : "GET",
      headers: { origin, "content-type": "application/json", ...h },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  eq(
    (await route.GET(req("?wallet=" + w[0]))).status,
    401,
    "Query wallet never authorizes"
  );
  const signedRead = await route.GET(
    req("?wallet=" + w[0], await signed(0, "social:read"))
  );
  eq(signedRead.status, 200, "Real signed private read");
  eq(
    signedRead.headers.get("cache-control"),
    "private, no-store",
    "Private responses uncached"
  );
  eq(
    (await route.GET(req("?wallet=" + w[1], await signed(0, "social:read"))))
      .status,
    401,
    "Wrong account cannot read"
  );
  eq(
    (
      await route.POST(
        req("", {}, { wallet: w[0], action: "node.withdraw", id: n.id })
      )
    ).status,
    401,
    "Unsigned write denied"
  );
  eq(
    (
      await route.POST(
        req(
          "",
          await signed(0),
          { wallet: w[0], action: "node.withdraw", id: n.id },
          "https://foreign.test"
        )
      )
    ).status,
    403,
    "Cross origin denied"
  );
  const response = await route.POST(
    req("", await signed(4), {
      wallet: w[4],
      action: "node.create",
      slug: "signed-fixture",
      name: "Signed fixture",
      about: "Local only",
      category: "Music",
      city: "Siargao",
    })
  );
  eq(response.status, 200, "Actual signed mutation");
  const beforeTransfer = await prisma.localNode.findUniqueOrThrow({
    where: { id: n.id },
  });
  await prisma.streamerTag.update({
    where: { id: tags[1].id },
    data: { walletAddress: w[4] },
  });
  eq(
    (await readEconomy(null)).nodes.some((p) => p.id === n.id),
    false,
    "Transferred tag cannot carry Node public identity"
  );
  await denied(
    call(4, { action: "node.withdraw", id: n.id }),
    "New tag owner cannot inherit Node authority"
  );
  await denied(
    call(1, { action: "node.withdraw", id: n.id }),
    "Old wallet no longer has active tag authority"
  );
  eq(beforeTransfer.ownerWallet, w[1], "Ownership snapshot remains immutable");
  // Explicit test clock shift through fixture data, not a production time override.
  const winner = await prisma.sessionGuest.findFirstOrThrow({
    where: { sessionId: s.id, status: "APPROVED" },
  });
  await prisma.streamerTag.update({
    where: { id: tags[1].id },
    data: { walletAddress: w[1] },
  });
  await prisma.baseDareSession.update({
    where: { id: s.id },
    data: { endsAt: new Date(Date.now() - 1000) },
  });
  await prisma.meetup.update({
    where: { id: s.meetupId },
    data: { startTime: new Date(Date.now() - 3600000) },
  });
  const winnerIndex = w.indexOf(winner.wallet);
  await call(1, { action: "session.attest", id: winner.id });
  await call(winnerIndex, { action: "session.attest", id: winner.id });
  const attendance = await prisma.sessionGuest.findUniqueOrThrow({
    where: { id: winner.id },
  });
  eq(
    Boolean(attendance.hostAttestedAt && attendance.participantAttestedAt),
    true,
    "Two-sided participation evidence"
  );
  eq(
    await prisma.venueCheckIn.count(),
    0,
    "RSVP/application/attestation never becomes secure presence"
  );
  eq(await prisma.pointsEvent.count(), 0, "No invented XP or paid reputation");
  eq(await prisma.dare.count(), 0, "No invented payout");
  const completedBooking = await prisma.opportunityRequest.findFirstOrThrow({
    where: { opportunityId: o.id, status: "CONFIRMED" },
  });
  await prisma.localOpportunity.update({
    where: { id: o.id },
    data: {
      startsAt: new Date(Date.now() - 7200000),
      endsAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() - 86400000),
    },
  });
  await call(0, { action: "booking.complete", id: completedBooking.id });
  await call(w.indexOf(completedBooking.wallet), {
    action: "booking.complete",
    id: completedBooking.id,
  });
  const done = await prisma.opportunityRequest.findUniqueOrThrow({
    where: { id: completedBooking.id },
  });
  eq(
    Boolean(done.hostCompletedAt && done.participantCompletedAt),
    true,
    "Mutual completed work evidence"
  );
  await denied(
    call(4, {
      action: "opportunity.request",
      id: o.id,
      termsHash: o.termsHash,
      message: "Expired request",
    }),
    "Expired opportunity rejects new requests"
  );
  const reportsRoute = require("../app/api/admin/local-economy/route");
  eq(
    (await reportsRoute.GET(req())).status,
    401,
    "Moderator read requires existing admin authority"
  );
  process.env.ADMIN_SECRET = "fixture-economy-admin-secret-at-least-32-chars";
  const report = await call(3, {
    action: "report",
    kind: "SESSION",
    id: s.id,
    reason: "Fixture report",
  });
  eq(Boolean(report.id), true, "Report reaches canonical audit ledger");
  const adminHeaders = {
    "x-admin-secret": process.env.ADMIN_SECRET!,
    origin: "http://localhost",
    "content-type": "application/json",
  };
  const adminRequest = new NextRequest(
    "http://localhost/api/admin/local-economy",
    {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        reportId: report.id,
        decision: "DISMISS",
        reason: "Fixture review only",
      }),
    }
  );
  eq(
    (await reportsRoute.POST(adminRequest)).status,
    200,
    "Actual protected moderator decision"
  );
  eq(
    (await prisma.founderEvent.findUniqueOrThrow({ where: { id: report.id } }))
      .status,
    "DISMISSED",
    "Moderation audit retained"
  );
  await call(1, { action: "node.withdraw", id: n.id });
  eq(
    (await prisma.meetup.findUniqueOrThrow({ where: { id: s.meetupId } }))
      .status,
    "cancelled",
    "Node withdrawal removes linked Session from map"
  );
  const policies = await prisma.$queryRaw<
    Array<{ count: bigint }>
  >`SELECT count(*) FROM pg_class WHERE relname IN ('LocalNode','NodeMembership','LocalOpportunity','OpportunityRequest','BaseDareSession','SessionGuest','SessionRecordingGrant') AND relrowsecurity`;
  eq(Number(policies[0].count), 7, "RLS enabled on every new table");
  console.log(
    `Living economy PostgreSQL checks passed: ${checks} assertions covering actual signed routes, privacy, membership, terms, capacity races, canonical Meetup, consent, terminal withdrawal and non-financial participation. Fixtures do not prove real consent, physical attendance, provider execution or payment.`
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    Module._load = original;
    await prisma.$disconnect();
    process.exit(process.exitCode || 0);
  });
