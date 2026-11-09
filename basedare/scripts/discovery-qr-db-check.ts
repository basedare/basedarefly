/* eslint-disable @typescript-eslint/no-require-imports -- Only absent ambient session is stubbed. Real admin authorization, handlers and PostgreSQL are exercised. */
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { discoveryQrReport } from "@/lib/discovery-qr-server";
const target = new URL(process.env.DATABASE_URL || "");
if (target.hostname !== "127.0.0.1" || !target.pathname.includes("_test"))
  throw Error("Disposable local database only.");
process.env.ADMIN_SECRET =
  "local-discovery-qr-test-secret-at-least-32-characters";
const Module = require("node:module"),
  original = Module._load;
Module._load = function (name: string, ...args: unknown[]) {
  if (name === "next-auth") return { getServerSession: async () => null };
  return original.call(this, name, ...args);
};
const api = require("@/app/api/admin/creator-attribution/route");
const go = require("@/app/go/[slug]/route");
const events = require("@/app/api/adventures/events/route");
Module._load = original;
const origin = "https://www.basedare.xyz";
const request = (
  body: unknown,
  method = "POST",
  authenticated = true,
  requestOrigin = origin,
) =>
  new NextRequest(origin + "/api/admin/creator-attribution", {
    method,
    headers: {
      Origin: requestOrigin,
      ...(authenticated ? { "x-admin-secret": process.env.ADMIN_SECRET! } : {}),
    },
    body: JSON.stringify(body),
  });
const patch = (body: unknown) => api.PATCH(request(body, "PATCH"));
const entry = (slug: string, cookie = "") =>
  go.GET(
    new NextRequest(origin + "/go/" + slug, { headers: { Cookie: cookie } }),
    { params: Promise.resolve({ slug }) },
  );
async function main() {
  const venue = await prisma.venue.create({
    data: {
      slug: "qr-local-place",
      name: "QR local fixture only",
      latitude: 9.79,
      longitude: 126.15,
      timezone: "Asia/Manila",
      city: "General Luna",
    },
  });
  const person = await prisma.streamerTag.create({
    data: {
      tag: "@qr-local-person",
      walletAddress: "0x5555555555555555555555555555555555555555",
      status: "ACTIVE",
      verificationMethod: "fixture-only",
    },
  });
  const event = await prisma.venueEvent.create({
    data: {
      slug: "qr-local-event",
      title: "Local event fixture, not a real gathering",
      venueId: venue.id,
      category: "community",
      timezone: "Asia/Manila",
      sourceLabel: "Local fixture only",
      lastConfirmedAt: new Date(),
      sourceUrl: "https://example.com/fixture",
      trustLevel: "SOURCE_CHECKED",
      startsAt: new Date(Date.now() + 3600000),
      expiresAt: new Date(Date.now() + 7200000),
      status: "PUBLISHED",
    },
  });
  const payload = {
    slug: "qr-local-start",
    creatorCode: "basedare",
    contentCode: "fixture-one",
    campaignCode: "fixture-qr-only",
    discoveryQr: {
      kind: "ADVENTURE",
      key: "postcard",
      hostVenueSlug: venue.slug,
      expiresInDays: 7,
    },
  };
  assert.equal((await api.POST(request(payload, "POST", false))).status, 401);
  assert.equal(
    (await api.POST(request(payload, "POST", true, "https://evil.example")))
      .status,
    403,
  );
  assert.equal(
    (
      await api.PATCH(
        request({ linkId: "made-up", active: false }, "PATCH", false),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await api.POST(
        request({
          ...payload,
          discoveryQr: { ...payload.discoveryQr, key: "https://evil.example" },
        }),
      )
    ).status,
    400,
  );
  const created = await api.POST(request(payload));
  assert.equal(created.status, 201, await created.clone().text());
  const link = (await created.json()).data;
  assert.equal(link.active, false);
  assert.equal(
    (await api.POST(request(payload))).status,
    409,
    "A duplicate short name must not overwrite the existing link.",
  );
  assert.equal((await patch({ linkId: link.id, active: true })).status, 409);
  const paused = await entry(payload.slug);
  assert.equal(
    new URL(paused.headers.get("location")!).pathname,
    "/qr/unavailable",
  );
  assert.equal(paused.cookies.get("bd_journey"), undefined);
  assert.equal(
    (await patch({ linkId: link.id, placementPermissionConfirmed: true }))
      .status,
    200,
  );
  assert.equal((await patch({ linkId: link.id, active: true })).status, 200);
  // A stored URL cannot become open-redirect authority even after creation.
  await prisma.creatorAttributionLink.update({
    where: { id: link.id },
    data: { targetHref: "https://evil.example" },
  });
  const open = await entry(payload.slug);
  const destination = new URL(open.headers.get("location")!);
  assert.equal(destination.origin, origin);
  assert.equal(destination.pathname, "/adventures/postcard");
  assert.equal(destination.searchParams.get("place"), venue.slug);
  assert.match(open.headers.get("cache-control")!, /no-store/);
  const cookie = "bd_journey=" + open.cookies.get("bd_journey")!.value;
  const emit = async (eventName: string) =>
    events.POST(
      new NextRequest(origin + "/api/adventures/events", {
        method: "POST",
        headers: { Origin: origin, Cookie: cookie },
        body: JSON.stringify({
          activityId: "postcard",
          runId: "local-qr-run-fixture-123",
          event: eventName,
        }),
      }),
    );
  for (const name of ["LANDING_RENDERED", "STARTED", "COMPLETED_SELF_REPORTED"])
    assert.equal((await emit(name)).status, 200);
  await entry(payload.slug, cookie);
  const report = await discoveryQrReport(7),
    row = report.links.find((l) => l.id === link.id)!;
  assert.equal(row.printable, true);
  assert.deepEqual(
    [
      row.metrics!.entries,
      row.metrics!.browserJourneys,
      row.metrics!.starts,
      row.metrics!.selfReportedFinishes,
      row.metrics!.verifiedCompletions,
    ],
    [2, 1, 1, 1, 0],
  );
  assert.deepEqual(report.observation.counts, {
    entries: 1,
    landings: 1,
    starts: 1,
    selfReportedFinishes: 1,
    shareActions: 0,
    verifiedCompletions: 0,
  });
  assert.doesNotMatch(
    JSON.stringify(report.observation),
    /wallet|fixture-qr-only|qr-local-person|journeyId|linkId|126\.15/,
  );
  assert.match(JSON.stringify(report.note), /not unique people/);
  const exportResponse = await api.GET(
    new NextRequest(
      origin +
        "/api/admin/creator-attribution?view=discovery-qr&format=harness",
      { headers: { "x-admin-secret": process.env.ADMIN_SECRET! } },
    ),
  );
  assert.equal(exportResponse.status, 200);
  assert.equal(
    (await exportResponse.json()).data.source,
    "admin-free-adventure-qr",
  );
  assert.equal(
    (await patch({ linkId: link.id, placementPermissionConfirmed: false }))
      .status,
    200,
  );
  assert.equal(
    (
      await prisma.creatorAttributionLink.findUniqueOrThrow({
        where: { id: link.id },
      })
    ).active,
    false,
  );
  assert.equal(
    (
      await patch({
        linkId: link.id,
        placementPermissionConfirmed: false,
        active: true,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await patch({
        linkId: link.id,
        placementPermissionConfirmed: true,
        active: true,
      })
    ).status,
    200,
  );
  const before = await prisma.attributionTouch.count({
    where: { linkId: link.id },
  });
  const old = await prisma.creatorAttributionLink.findUniqueOrThrow({
    where: { id: link.id },
  });
  await prisma.creatorAttributionLink.update({
    where: { id: link.id },
    data: {
      metadataJson: {
        ...(old.metadataJson as object),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
    },
  });
  const expired = await entry(payload.slug);
  assert.equal(
    new URL(expired.headers.get("location")!).searchParams.get("reason"),
    "expired",
  );
  assert.equal(
    await prisma.attributionTouch.count({ where: { linkId: link.id } }),
    before,
  );
  const add = async (
    slug: string,
    kind: string,
    key: string,
    creatorCode = "basedare",
  ) => {
    const r = await api.POST(
      request({
        ...payload,
        slug,
        creatorCode,
        placementPermissionConfirmed: true,
        discoveryQr: { ...payload.discoveryQr, kind, key },
      }),
    );
    assert.equal(r.status, 201, await r.clone().text());
    return (await r.json()).data;
  };
  const eventLink = await add("qr-local-event-link", "EVENT", event.slug);
  assert.equal(
    (await patch({ linkId: eventLink.id, active: true })).status,
    200,
  );
  await prisma.venueEvent.update({
    where: { id: event.id },
    data: { status: "CANCELLED" },
  });
  assert.equal(
    new URL((await entry("qr-local-event-link")).headers.get("location")!)
      .pathname,
    "/qr/unavailable",
  );
  assert.equal(
    (await patch({ linkId: eventLink.id, active: true })).status,
    409,
  );
  const creator = await add(
    "qr-local-creator-link",
    "CREATOR",
    person.tag,
    person.tag,
  );
  assert.equal((await patch({ linkId: creator.id, active: true })).status, 200);
  await prisma.streamerTag.update({
    where: { id: person.id },
    data: { walletAddress: "0x6666666666666666666666666666666666666666" },
  });
  assert.equal(
    new URL((await entry("qr-local-creator-link")).headers.get("location")!)
      .pathname,
    "/qr/unavailable",
  );
  const place = await add("qr-local-place-link", "VENUE", venue.slug);
  assert.equal((await patch({ linkId: place.id, active: true })).status, 200);
  await prisma.venue.update({
    where: { id: venue.id },
    data: { status: "SUSPENDED" },
  });
  assert.equal(
    new URL((await entry("qr-local-place-link")).headers.get("location")!)
      .pathname,
    "/qr/unavailable",
  );
  await prisma.venue.update({
    where: { id: venue.id },
    data: { status: "ACTIVE" },
  });
  const placeReport = await discoveryQrReport(7);
  assert.equal(placeReport.links.find(l=>l.id===place.id)!.metrics!.starts,null,'Place visits do not pretend to have adventure conversion tracking.');
  const savedSecret=process.env.MISSION_PASS_HMAC_SECRET;
  delete process.env.MISSION_PASS_HMAC_SECRET;
  const missingTracking=await discoveryQrReport(7);
  assert.equal(missingTracking.trackingReady,false);assert.equal(missingTracking.observation.counts,null);assert.equal(missingTracking.links.find(l=>l.id===place.id)!.printable,false);
  assert.equal((await patch({linkId:place.id,active:true})).status,409);
  assert.equal(new URL((await entry('qr-local-place-link')).headers.get('location')!).pathname,'/venues/qr-local-place','Discovery survives analytics outage without creating evidence.');
  process.env.MISSION_PASS_HMAC_SECRET=savedSecret;
  const malformed=await prisma.creatorAttributionLink.create({data:{slug:'qr-local-malformed',creatorCode:'basedare',contentCode:'fixture',targetType:'PAGE',targetId:'fixture',targetHref:'https://evil.example',active:true,metadataJson:{kind:'discovery_qr_v1'}}});
  assert.equal(new URL((await entry(malformed.slug)).headers.get('location')!).pathname,'/qr/unavailable');
  const elsewhere=await prisma.venue.create({data:{slug:'qr-local-outside-island',name:'Outside-island local fixture only',latitude:-33.8688,longitude:151.2093,city:'Sydney',timezone:'Australia/Sydney'}});
  assert.equal((await api.POST(request({...payload,slug:'qr-local-wrong-island',discoveryQr:{...payload.discoveryQr,key:'siargao-verdict',hostVenueSlug:elsewhere.slug}}))).status,400);
  const legacy = await prisma.creatorAttributionLink.create({
    data: {
      slug: "qr-local-legacy",
      creatorCode: "basedare",
      contentCode: "legacy",
      targetType: "PAGE",
      targetId: "postcard",
      targetHref: "/adventures/postcard",
    },
  });
  assert.equal(
    (await patch({ linkId: legacy.id, active: false })).status,
    409,
    "Cannot bypass another rail’s controls with the discovery endpoint.",
  );
  assert.equal(
    new URL((await entry(legacy.slug)).headers.get("location")!).pathname,
    "/adventures/postcard",
  );
  await prisma.creatorAttributionLink.createMany({
    data: Array.from({ length: 51 }, (_, i) => ({
      slug: "qr-local-overflow-" + i,
      creatorCode: "basedare",
      contentCode: "fixture",
      targetType: "PAGE",
      targetId: "postcard",
      targetHref: "/adventures/postcard",
      stationHostVenueId: venue.id,
      metadataJson: old.metadataJson!,
      active: false,
    })),
  });
  const overflow = await discoveryQrReport(7);
  assert.equal(overflow.hasMore, true);
  assert.equal(overflow.observation.complete, false);
  assert.equal(overflow.observation.counts, null);
  console.log(
    "PASS: real admin auth/origin → paused canonical QR → permission/activation → guest start/self-reported finish → repeat-entry separation → aggregate export → revoke/pause/expiry; cancelled source, host suspension, creator transfer, legacy isolation and bounded unknown totals. Local fixtures only; no physical scan or reward.",
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
