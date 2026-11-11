/* eslint-disable @typescript-eslint/no-require-imports -- Only ambient session is controlled; handlers and canonical PostgreSQL projections are real. */
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { STORY_CONSENT } from "@/lib/community-stories";

const database = new URL(process.env.DATABASE_URL || "");
if (database.hostname !== "127.0.0.1" || !database.pathname.includes("_test"))
  throw Error("Disposable local PostgreSQL only.");
process.env.BASE_MAINNET_RPC_URL = "http://127.0.0.1:9";
process.env.BASE_SEPOLIA_RPC_URL = "http://127.0.0.1:9";
let sessionWallet: string | null = null;
const Module = require("node:module"),
  original = Module._load;
Module._load = function (name: string, ...args: unknown[]) {
  if (name === "next-auth")
    return {
      getServerSession: async () =>
        sessionWallet ? { walletAddress: sessionWallet } : null,
    };
  return original.call(this, name, ...args);
};
const api = require("@/app/api/discovery/related/route");
Module._load = original;
const origin = "https://www.basedare.xyz";
const authorWallet = "0x7474747474747474747474747474747474747474";
const readerWallet = "0x7575757575757575757575757575757575757575";
const otherWallet = "0x7676767676767676767676767676767676767676";
let sequence = 0;
function request(
  body: unknown,
  options: { origin?: string; raw?: string; ip?: string } = {}
) {
  return new NextRequest(origin + "/api/discovery/related", {
    method: "POST",
    headers: {
      Origin: options.origin ?? origin,
      "Content-Type": "application/json",
      "x-forwarded-for": options.ip ?? `198.51.100.${++sequence}`,
    },
    body: options.raw ?? JSON.stringify(body),
  });
}
const read = (kind: string, key: string) => api.POST(request({ kind, key }));
type Node = {
  kind: string;
  key: string;
  title: string;
  summary: string;
  label: string;
  href: string;
};
type Projection = {
  source: Pick<Node, "kind" | "key" | "title" | "href">;
  nodes: Node[];
  limited: boolean;
};
async function ok(response: Response): Promise<Projection> {
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  return (await response.json()).data;
}
async function unavailable(kind: string, key: string) {
  const response = await read(kind, key);
  assert.equal(response.status, 404, await response.clone().text());
  assert.deepEqual(await response.json(), {
    success: false,
    error: "This item is unavailable.",
  });
}
/** Interleave a real committed fixture change after a real query returns. */
async function interleave(
  delegate: object,
  method: "findUnique" | "findMany",
  when: (args: Record<string, unknown>) => boolean,
  mutate: () => Promise<unknown>,
  project: () => Promise<Response>
) {
  const originalQuery = Reflect.get(delegate, method) as (
    args: Record<string, unknown>
  ) => Promise<unknown>;
  let triggered = false;
  Reflect.set(delegate, method, async (args: Record<string, unknown>) => {
    const rows = await originalQuery(args);
    if (!triggered && when(args)) {
      triggered = true;
      await mutate();
    }
    return rows;
  });
  try {
    const response = await project();
    assert.equal(
      triggered,
      true,
      "The real fixture mutation must interleave with this read."
    );
    return response;
  } finally {
    Reflect.set(delegate, method, originalQuery);
  }
}
async function main() {
  const author = await prisma.streamerTag.create({
    data: {
      tag: "@related-local-author",
      walletAddress: authorWallet,
      status: "ACTIVE",
      verificationMethod: "fixture-only",
      bio: "Public local fixture biography",
    },
  });
  const viewer = await prisma.streamerTag.create({
    data: {
      tag: "@related-local-reader",
      walletAddress: readerWallet,
      status: "ACTIVE",
      verificationMethod: "fixture-only",
    },
  });
  const venue = await prisma.venue.create({
    data: {
      slug: "related-local-place",
      name: "Related local fixture place only",
      latitude: 9.790123456,
      longitude: 126.150987654,
      timezone: "Asia/Manila",
      claimedBy: authorWallet,
      claimedAt: new Date(),
      claimRequestStatus: "APPROVED",
      moderatorNote: "PRIVATE_RELATED_MODERATOR_CANARY",
    },
  });
  const hiddenVenue = await prisma.venue.create({
    data: {
      slug: "related-local-hidden",
      name: "Hidden fixture place only",
      latitude: 9.79,
      longitude: 126.15,
      status: "SUSPENDED",
    },
  });
  const story = await prisma.founderEvent.create({
    data: {
      eventType: "LOCAL_SIGNAL",
      subjectType: "community_story",
      subjectId: author.id,
      dedupeKey: "related-local-story",
      source: "community",
      status: "APPROVED",
      venueId: venue.id,
      venueSlug: venue.slug,
      title: "Related fixture story only",
      metadataJson: {
        postType: "story",
        title: "Related fixture story only",
        notes: "A public fixture experience.",
        authorTagId: author.id,
        authorWallet,
        publicConsentVersion: STORY_CONSENT,
        latitude: venue.latitude,
        longitude: venue.longitude,
        operatorNote: "PRIVATE_RELATED_OPERATOR_CANARY",
        contact: "private-related@example.com",
      },
    },
  });
  const makeMoment = (runId: string, extra: object = {}) =>
    prisma.adventureSubmission.create({
      data: {
        wallet: authorWallet,
        activityId: "three-details",
        runId,
        venueSlug: venue.slug,
        caption: "Related fixture Moment " + runId,
        hashtag: "fixture",
        mediaType: "IMAGE",
        privateMediaCid: "PRIVATE_RELATED_CID_CANARY",
        privateMediaMime: "image/jpeg",
        publicConsentVersion: "adventure-display-v2",
        creatorCreditConsent: true,
        status: "APPROVED",
        ...extra,
      },
    });
  const moment = await makeMoment("related-local-credit");
  const anonymous = await makeMoment("related-local-anonymous", {
    creatorCreditConsent: false,
  });
  const withheld = await makeMoment("related-local-withheld", {
    status: "WITHDRAWN",
  });
  const noConsent = await makeMoment("related-local-no-consent", {
    publicConsentVersion: "invalid-consent",
  });
  const hiddenMoment = await makeMoment("related-local-hidden-place", {
    venueSlug: hiddenVenue.slug,
  });
  const raceWallet = "0x7777777777777777777777777777777777777777";
  const raceAuthor = await prisma.streamerTag.create({
    data: {
      tag: "@related-local-race",
      walletAddress: raceWallet,
      status: "ACTIVE",
      verificationMethod: "fixture-only",
    },
  });
  const raceMoment = await makeMoment("related-local-race", {
    wallet: raceWallet,
  });
  const later = (hours: number) => new Date(Date.now() + hours * 3600000);
  const event = await prisma.venueEvent.create({
    data: {
      venueId: venue.id,
      slug: "related-local-event",
      title: "Related fixture event only",
      category: "community",
      timezone: "Asia/Manila",
      sourceLabel: "Fixture only",
      trustLevel: "SOURCE_CHECKED",
      lastConfirmedAt: new Date(),
      startsAt: later(1),
      endsAt: later(2),
      expiresAt: later(3),
      status: "PUBLISHED",
    },
  });
  const meetup = await prisma.meetup.create({
    data: {
      creatorBaretagId: author.id,
      venueId: venue.id,
      title: "Related fixture meetup only",
      type: "jam",
      placeLabel: venue.name,
      approxLat: venue.latitude,
      approxLng: venue.longitude,
      startTime: later(2),
      status: "active",
    },
  });

  const counts = () =>
    Promise.all([
      prisma.venue.count(),
      prisma.founderEvent.count(),
      prisma.adventureSubmission.count(),
      prisma.streamerTag.count(),
      prisma.socialFollow.count(),
      prisma.savedItem.count(),
      prisma.attributionEvent.count(),
      prisma.attributionJourney.count(),
    ]);
  const before = await counts();
  const place = await ok(await read("VENUE", venue.slug));
  assert.equal(
    place.source.key,
    venue.id,
    "Slugs resolve to canonical place IDs."
  );
  const has = (data: Projection, key: string) =>
    data.nodes.some((node) => node.key === key);
  for (const key of [
    story.id,
    moment.id,
    anonymous.id,
    author.id,
    "venue_event:" + event.id,
    "meetup:" + meetup.id,
  ])
    assert.ok(has(place, key), "Missing eligible relation " + key);
  for (const key of [withheld.id, noConsent.id, hiddenMoment.id])
    assert.ok(!has(place, key));
  const serialized = JSON.stringify(place);
  for (const secret of [
    authorWallet,
    readerWallet,
    "PRIVATE_RELATED_",
    "private-related@example.com",
    String(venue.latitude),
    String(venue.longitude),
  ])
    assert.ok(!serialized.includes(secret), "Public DTO leaked " + secret);
  for (const node of place.nodes)
    assert.deepEqual(Object.keys(node).sort(), [
      "href",
      "key",
      "kind",
      "label",
      "summary",
      "title",
    ]);
  assert.ok(place.nodes.every((node) => node.href.startsWith("/")));
  const profile = await ok(await read("PERSON", author.tag));
  assert.equal(profile.source.key, author.id);
  assert.ok(has(profile, moment.id));
  assert.ok(
    !has(profile, anonymous.id),
    "Creator discovery cannot reveal anonymous authorship."
  );
  assert.ok(
    has(profile, venue.id),
    "Places are attached to eligible public posts."
  );
  assert.deepEqual(
    await counts(),
    before,
    "Discovery reads must not create data or attribution."
  );

  const revokeRaceCredit = () =>
    prisma.adventureSubmission.update({
      where: { id: raceMoment.id },
      data: { creatorCreditConsent: false },
    });
  await prisma.adventureSubmission.update({
    where: { id: raceMoment.id },
    data: { venueSlug: null },
  });
  const sourceRace = await ok(
    await interleave(
      prisma.adventureSubmission,
      "findUnique",
      (args) => (args.where as { id?: string })?.id === raceMoment.id,
      revokeRaceCredit,
      () => read("MOMENT", raceMoment.id)
    )
  );
  assert.deepEqual(
    sourceRace.nodes,
    [],
    "Credit withdrawn during a source read must remove creator-origin edges."
  );
  await prisma.adventureSubmission.update({
    where: { id: raceMoment.id },
    data: { creatorCreditConsent: true, venueSlug: venue.slug },
  });
  const profileRace = await ok(
    await interleave(
      prisma.adventureSubmission,
      "findMany",
      (args) => Boolean((args.where as { wallet?: unknown })?.wallet),
      revokeRaceCredit,
      () => read("PERSON", raceAuthor.id)
    )
  );
  assert.deepEqual(
    profileRace.nodes,
    [],
    "Creator-origin Moments and their place edges need current credit."
  );
  await prisma.adventureSubmission.update({
    where: { id: raceMoment.id },
    data: { creatorCreditConsent: true },
  });
  const derivedRace = await ok(
    await interleave(
      prisma.adventureSubmission,
      "findMany",
      (args) =>
        (args.where as { venueSlug?: string })?.venueSlug === venue.slug,
      revokeRaceCredit,
      () => read("VENUE", venue.id)
    )
  );
  assert.ok(
    has(derivedRace, raceMoment.id),
    "Anonymous public display remains eligible."
  );
  assert.ok(
    !has(derivedRace, raceAuthor.id),
    "A current anonymous Moment cannot retain a derived creator edge."
  );
  await prisma.adventureSubmission.update({
    where: { id: raceMoment.id },
    data: { creatorCreditConsent: true },
  });
  const transferRace = await interleave(
    prisma.streamerTag,
    "findMany",
    (args) => JSON.stringify(args).includes(raceAuthor.id),
    () =>
      prisma.streamerTag.update({
        where: { id: raceAuthor.id },
        data: { walletAddress: otherWallet },
      }),
    () => read("PERSON", raceAuthor.id)
  );
  assert.equal(
    transferRace.status,
    404,
    "A source ownership change must invalidate the graph assembled for its former wallet."
  );
  await prisma.streamerTag.update({
    where: { id: raceAuthor.id },
    data: { walletAddress: raceWallet },
  });

  assert.equal(
    (
      await api.POST(
        request(
          { kind: "VENUE", key: venue.id },
          { origin: "https://evil.example" }
        )
      )
    ).status,
    403
  );
  assert.equal(
    (
      await api.POST(
        request({ kind: "VENUE", key: venue.id, wallet: readerWallet })
      )
    ).status,
    400
  );
  assert.equal(
    (await api.POST(request({ kind: "VENUE", key: "x".repeat(192) }))).status,
    400
  );
  assert.equal((await api.POST(request({}, { raw: "{" }))).status, 400);
  assert.equal(
    (await api.POST(request({}, { raw: "x".repeat(4097) }))).status,
    413
  );
  for (let i = 0; i < 60; i++)
    assert.equal(
      (await api.POST(request({}, { ip: "192.0.2.249" }))).status,
      400
    );
  assert.equal(
    (await api.POST(request({}, { ip: "192.0.2.249" }))).status,
    429
  );
  await unavailable("VENUE", hiddenVenue.id);
  await unavailable("MOMENT", withheld.id);
  await unavailable("MOMENT", noConsent.id);

  // An anonymous source may show its place, but not use its private wallet to
  // discover the author's unrelated stories or creations.
  await prisma.adventureSubmission.update({
    where: { id: anonymous.id },
    data: { venueSlug: null },
  });
  const anonymousSource = await ok(await read("MOMENT", anonymous.id));
  assert.deepEqual(anonymousSource.nodes, []);
  await prisma.adventureSubmission.update({
    where: { id: moment.id },
    data: { creatorCreditConsent: false },
  });
  assert.ok(!has(await ok(await read("PERSON", author.id)), moment.id));
  await prisma.adventureSubmission.update({
    where: { id: moment.id },
    data: { creatorCreditConsent: true },
  });

  sessionWallet = readerWallet;
  for (const reverse of [false, true]) {
    const block = await prisma.meetupBlock.create({
      data: {
        blockerBaretagId: reverse ? author.id : viewer.id,
        blockedBaretagId: reverse ? viewer.id : author.id,
      },
    });
    for (const [kind, key] of [
      ["VENUE", venue.id],
      ["PERSON", author.id],
      ["STORY", story.id],
      ["MOMENT", moment.id],
    ])
      await unavailable(kind, key);
    await prisma.meetupBlock.delete({ where: { id: block.id } });
  }
  sessionWallet = null;
  await prisma.streamerTag.update({
    where: { id: author.id },
    data: { revokedAt: new Date() },
  });
  for (const [kind, key] of [
    ["PERSON", author.id],
    ["STORY", story.id],
    ["MOMENT", moment.id],
  ])
    await unavailable(kind, key);
  const revoked = await ok(await read("VENUE", venue.id));
  for (const key of [story.id, moment.id, author.id, "meetup:" + meetup.id])
    assert.ok(!has(revoked, key));
  await prisma.streamerTag.update({
    where: { id: author.id },
    data: { revokedAt: null, walletAddress: otherWallet },
  });
  await unavailable("STORY", story.id);
  await unavailable("MOMENT", moment.id);
  const transferred = await ok(await read("PERSON", author.id));
  assert.ok(!has(transferred, story.id));
  assert.ok(
    !has(transferred, moment.id),
    "Current tag owner cannot inherit another wallet's Moment credit."
  );
  await prisma.streamerTag.update({
    where: { id: author.id },
    data: { walletAddress: authorWallet },
  });
  await prisma.founderEvent.update({
    where: { id: story.id },
    data: { status: "WITHDRAWN" },
  });
  await unavailable("STORY", story.id);
  await prisma.adventureSubmission.update({
    where: { id: moment.id },
    data: { status: "WITHDRAWN" },
  });
  await unavailable("MOMENT", moment.id);
  await prisma.venueEvent.update({
    where: { id: event.id },
    data: { status: "CANCELLED" },
  });
  await prisma.meetup.update({
    where: { id: meetup.id },
    data: { startTime: later(-2) },
  });
  const removed = await ok(await read("VENUE", venue.id));
  for (const key of [
    story.id,
    moment.id,
    "venue_event:" + event.id,
    "meetup:" + meetup.id,
  ])
    assert.ok(!has(removed, key));
  await prisma.venue.update({
    where: { id: venue.id },
    data: { status: "SUSPENDED" },
  });
  await unavailable("VENUE", venue.id);
  await prisma.venue.update({
    where: { id: venue.id },
    data: { status: "ACTIVE" },
  });
  await prisma.venueEvent.createMany({
    data: Array.from({ length: 12 }, (_, i) => ({
      venueId: venue.id,
      slug: "related-local-overflow-" + i,
      title: "Overflow fixture only " + i,
      category: "community",
      timezone: "Asia/Manila",
      sourceLabel: "Fixture only",
      trustLevel: "SOURCE_CHECKED",
      lastConfirmedAt: new Date(),
      startsAt: later(1),
      endsAt: later(2),
      expiresAt: later(3),
      status: "PUBLISHED",
    })),
  });
  const bounded = await ok(await read("VENUE", venue.id));
  assert.equal(bounded.limited, true);
  assert.ok(bounded.nodes.length <= 24);
  assert.ok(
    bounded.nodes.filter((node) => node.kind === "ACTIVITY").length <= 8
  );
  console.log(
    "PASS: real read-only canonical related discovery, request/origin/body/rate bounds, public DTO, credit/ownership, session-only reciprocal blocks, revocation/withdrawal/place suspension, current plans and bounded results. Disposable local fixtures only."
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
