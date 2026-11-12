/* eslint-disable @typescript-eslint/no-require-imports -- Only ambient sessions and chain readiness are controlled; real query policies, handlers and PostgreSQL are exercised. */
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
const db = new URL(process.env.DATABASE_URL || "");
if (db.hostname !== "127.0.0.1" || !db.pathname.includes("_test"))
  throw Error("Disposable local PostgreSQL only.");
let wallet: string | null = null,
  chainReady = false;
const Module = require("node:module"),
  original = Module._load;
Module._load = function (name: string, ...args: unknown[]) {
  if (name === "next-auth")
    return {
      getServerSession: async () => (wallet ? { walletAddress: wallet } : null),
    };
  if (name.endsWith("payment-readiness-server"))
    return { getPaymentReadiness: async () => ({ ready: chainReady }) };
  return original.call(this, name, ...args);
};
const {
  discoverPublicExperiences,
} = require("@/lib/discovery-intelligence-server");
const api = require("@/app/api/discovery/route");
const universal = require("@/app/api/search/route");
Module._load = original;
const origin = "https://www.basedare.xyz";
const globalSearch = async (query: string) =>
  (
    await universal.GET(
      new NextRequest(origin + "/api/search?q=" + encodeURIComponent(query), {
        headers: { "x-forwarded-for": "192.0.2.241" },
      })
    )
  ).json();
const now = new Date("2026-11-10T04:00:00Z");
const area = {
  lat: 9.79,
  lng: 126.15,
  radiusKm: 8,
  label: "General Luna, Siargao",
  timeZone: "Asia/Manila",
};
let seq = 0;
const request = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(origin + "/api/discovery", {
    method: "POST",
    headers: {
      origin,
      "Content-Type": "application/json",
      "x-forwarded-for": "192.0.2." + ((++seq % 200) + 1),
      ...headers,
    },
    body: JSON.stringify(body),
  });
async function main() {
  const authorWallet = "0x7878787878787878787878787878787878787878";
  const viewerWallet = "0x7979797979797979797979797979797979797979";
  const author = await prisma.streamerTag.create({
    data: {
      tag: "@discovery-local-author",
      walletAddress: authorWallet,
      status: "ACTIVE",
      verificationMethod: "fixture-only",
    },
  });
  const viewer = await prisma.streamerTag.create({
    data: {
      tag: "@discovery-local-viewer",
      walletAddress: viewerWallet,
      status: "ACTIVE",
      verificationMethod: "fixture-only",
    },
  });
  const venue = await prisma.venue.create({
    data: {
      slug: "discovery-local-music-corner",
      name: "Discovery local music corner",
      latitude: 9.79123456,
      longitude: 126.15123456,
      timezone: "Asia/Manila",
      city: "General Luna",
      categories: ["music", "coffee"],
      claimedBy: authorWallet,
      claimedAt: now,
      claimRequestStatus: "APPROVED",
      moderatorNote: "PRIVATE_DISCOVERY_OPERATOR_CANARY",
    },
  });
  const event = await prisma.venueEvent.create({
    data: {
      slug: "discovery-local-evening-gig",
      venueId: venue.id,
      title: "Local acoustic band concert",
      summary: "A real local fixture, not production inventory.",
      category: "music",
      startsAt: new Date("2026-11-10T11:00:00Z"),
      endsAt: new Date("2026-11-10T13:00:00Z"),
      expiresAt: new Date("2026-11-11T00:00:00Z"),
      timezone: "Asia/Manila",
      priceLabel: "₱400",
      sourceLabel: "Local fixture only",
      lastConfirmedAt: now,
      status: "PUBLISHED",
    },
  });
  const cancelled = await prisma.venueEvent.create({
    data: {
      slug: "discovery-local-cancelled",
      venueId: venue.id,
      title: "Cancelled band concert",
      category: "music",
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      expiresAt: event.expiresAt,
      timezone: "Asia/Manila",
      sourceLabel: "Local fixture only",
      lastConfirmedAt: now,
      status: "CANCELLED",
    },
  });
  const moment = await prisma.adventureSubmission.create({
    data: {
      wallet: authorWallet,
      activityId: "postcard",
      runId: "discovery-local-moment",
      venueSlug: venue.slug,
      caption: "Discovery fixture story at the music corner",
      hashtag: "fixture",
      mediaType: "IMAGE",
      privateMediaCid: "PRIVATE_DISCOVERY_CID_CANARY",
      privateMediaMime: "image/jpeg",
      publicConsentVersion: "adventure-display-v2",
      creatorCreditConsent: true,
      status: "APPROVED",
    },
  });
  const meetup = await prisma.meetup.create({
    data: {
      creatorBaretagId: author.id,
      title: "Discovery local photo walk",
      type: "custom",
      venueId: venue.id,
      placeLabel: venue.name,
      approxLat: 9.791,
      approxLng: 126.151,
      startTime: new Date(now.getTime() + 3600000),
    },
  });
  const dare = await prisma.dare.create({
    data: {
      shortId: "discovery-local-free",
      title: "Try a community photo challenge",
      bounty: 0,
      tag: "community",
      status: "PENDING",
      isSimulated: true,
      venueId: venue.id,
      latitude: venue.latitude,
      longitude: venue.longitude,
      streamerHandle: "@everyone",
    },
  });
  const paid = await prisma.dare.create({
    data: {
      shortId: "discovery-local-paid",
      title: "Record a local place story",
      bounty: 10,
      status: "PENDING",
      isSimulated: false,
      venueId: venue.id,
      latitude: venue.latitude,
      longitude: venue.longitude,
      txHash: "0x" + "8".repeat(64),
      onChainDareId: "987654321",
      streamerHandle: "@everyone",
    },
  });
  const unfunded = await prisma.dare.create({
    data: {
      shortId: "discovery-local-unfunded",
      title: "Unfunded local creator opportunity",
      bounty: 100,
      status: "PENDING",
      venueId: venue.id,
    },
  });
  const surfEvents = await Promise.all(
    ["day", "night"].map((period, index) =>
      prisma.venueEvent.create({
        data: {
          slug: "discovery-local-surf-" + period,
          venueId: venue.id,
          title: "Surf lesson " + period,
          category: "surf",
          startsAt: new Date(
            index ? "2026-11-11T15:00:00Z" : "2026-11-11T02:00:00Z"
          ),
          endsAt: new Date(
            index ? "2026-11-11T17:00:00Z" : "2026-11-11T04:00:00Z"
          ),
          expiresAt: new Date("2026-11-12T00:00:00Z"),
          timezone: "Asia/Manila",
          sourceLabel: "Fixture only",
          lastConfirmedAt: now,
        },
      })
    )
  );
  const counts = () =>
    Promise.all([
      prisma.founderEvent.count(),
      prisma.attributionEvent.count(),
      prisma.attributionTouch.count(),
      prisma.venue.count(),
      prisma.adventureSubmission.count(),
      prisma.pointsEvent.count(),
    ]);
  const before = await counts();
  assert(
    (await globalSearch(dare.title)).results.dares.some((d: { url: string }) =>
      d.url.includes(dare.shortId!)
    )
  );
  assert(
    !(await globalSearch(unfunded.title)).results.dares.some(
      (d: { url: string }) => d.url.includes(unfunded.shortId!)
    )
  );
  assert(
    !JSON.stringify(await globalSearch("discovery-local-author")).includes(
      authorWallet
    )
  );
  let data = await discoverPublicExperiences(
    "live music tonight under ₱500",
    area,
    now
  );
  assert(data.results.some((r: { key: string }) => r.key === event.id));
  assert(!data.results.some((r: { key: string }) => r.key === cancelled.id));
  assert(data.results.every((r: { kind: string }) => r.kind === "EVENT"));
  assert(
    data.results
      .find((r: { key: string }) => r.key === event.id)
      .href.includes("timeZone=Asia%2FManila")
  );
  assert(!JSON.stringify(data).includes("PRIVATE_DISCOVERY"));
  assert(!JSON.stringify(data).includes(authorWallet));
  data = await discoverPublicExperiences("surf tomorrow", area, now);
  assert(data.results.some((r: { key: string }) => r.key === surfEvents[0].id));
  assert(
    !data.results.some((r: { key: string }) => r.key === surfEvents[1].id)
  );
  data = await discoverPublicExperiences("adventure", area, now);
  assert(data.results.some((r: { key: string }) => r.key === dare.id));
  assert(data.results.some((r: { kind: string }) => r.kind === "ADVENTURE"));
  data = await discoverPublicExperiences("community stories", area, now);
  assert(data.results.some((r: { key: string }) => r.key === moment.id));
  await prisma.adventureSubmission.update({
    where: { id: moment.id },
    data: { status: "WITHDRAWN" },
  });
  assert(
    !(
      await discoverPublicExperiences("community stories", area, now)
    ).results.some((r: { key: string }) => r.key === moment.id)
  );
  wallet = viewerWallet;
  await prisma.meetupBlock.create({
    data: { blockerBaretagId: author.id, blockedBaretagId: viewer.id },
  });
  assert(
    !(await globalSearch(venue.name)).results.places.some(
      (p: { title: string }) => p.title === venue.name
    )
  );
  assert(
    !(await discoverPublicExperiences("meet people", area, now)).results.some(
      (r: { key: string }) => r.key === meetup.id
    )
  );
  assert(
    !(
      await discoverPublicExperiences("live music tonight", area, now)
    ).results.some((r: { key: string }) => r.key === event.id)
  );
  wallet = null;
  data = await discoverPublicExperiences(
    "paid creator opportunities",
    area,
    now
  );
  assert.equal(data.results.length, 0);
  assert(data.notices.some((s: string) => s.includes("payment setup")));
  chainReady = true;
  data = await discoverPublicExperiences(
    "paid creator opportunities",
    area,
    now
  );
  assert(data.results.some((r: { key: string }) => r.key === paid.id));
  assert(
    !data.results.some(
      (r: { key: string }) => r.key === unfunded.id || r.key === dare.id
    )
  );
  await prisma.dare.update({
    where: { id: paid.id },
    data: { targetWalletAddress: authorWallet },
  });
  assert(
    !(await globalSearch(paid.title)).results.dares.some((d: { url: string }) =>
      d.url.includes(paid.shortId!)
    )
  );
  assert(
    !(
      await discoverPublicExperiences("paid creator opportunities", area, now)
    ).results.some((r: { key: string }) => r.key === paid.id)
  );
  await prisma.dare.update({
    where: { id: paid.id },
    data: { targetWalletAddress: null },
  });
  await prisma.venue.update({
    where: { id: venue.id },
    data: { status: "SUSPENDED" },
  });
  assert(
    !(await globalSearch(dare.title)).results.dares.some((d: { url: string }) =>
      d.url.includes(dare.shortId!)
    )
  );
  assert(
    !(await globalSearch(paid.title)).results.dares.some((d: { url: string }) =>
      d.url.includes(paid.shortId!)
    )
  );
  assert(
    !(await discoverPublicExperiences("music tonight", area, now)).results.some(
      (r: { key: string }) => r.key === event.id
    )
  );
  const empty = await discoverPublicExperiences(
    "music tonight",
    {
      lat: -33.8688,
      lng: 151.2093,
      radiusKm: 8,
      label: "Sydney",
      timeZone: "Australia/Sydney",
    },
    now
  );
  assert(!empty.results.some((r: { key: string }) => r.key === event.id));
  assert.equal(empty.area.label, "Sydney");
  const base = {
    query: "free adventure",
    lat: area.lat,
    lng: area.lng,
    radiusKm: 8,
    areaLabel: area.label,
    timeZone: area.timeZone,
  };
  let response = await api.POST(request(base));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Cache-Control") || "", /no-store/);
  const publicBody = JSON.stringify(await response.json());
  assert(!publicBody.includes("PRIVATE_DISCOVERY"));
  assert.equal((await api.POST(request({ ...base, lat: 91 }))).status, 400);
  assert.equal(
    (await api.POST(request({ ...base, wallet: authorWallet }))).status,
    400
  );
  assert.equal(
    (await api.POST(request({ ...base, query: "X".repeat(5000) }))).status,
    400
  );
  assert.equal(
    (await api.POST(request(base, { origin: "https://other.example" }))).status,
    403
  );
  process.env.DISCOVERY_INTELLIGENCE_ENABLED = "false";
  assert.equal((await api.POST(request(base))).status, 503);
  delete process.env.DISCOVERY_INTELLIGENCE_ENABLED;
  for (let i = 0; i < 30; i++)
    response = await api.POST(
      request({ ...base, query: "" }, { "x-forwarded-for": "192.0.2.250" })
    );
  assert.equal(
    (await api.POST(request(base, { "x-forwarded-for": "192.0.2.250" })))
      .status,
    429
  );
  // Only deliberate fixture mutations above may change source rows. Discovery itself creates no records.
  assert.deepEqual(await counts(), before);
  await prisma.venue.createMany({
    data: Array.from({ length: 82 }, (_, i) => ({
      slug: "discovery-local-overflow-" + i,
      name: "Overflow local fixture only " + i,
      latitude: area.lat,
      longitude: area.lng,
      timezone: area.timeZone,
    })),
  });
  const boundedBefore = await counts();
  assert.equal(
    (await discoverPublicExperiences("music tonight", area, now)).complete,
    false
  );
  assert.deepEqual(await counts(), boundedBefore);
  console.log(
    "Discovery intelligence: actual canonical queries, guest API, eligibility/privacy and read-only checks passed. Chain readiness was a local fixture, not real payment acceptance."
  );
}
main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
