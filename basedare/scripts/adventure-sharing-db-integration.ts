import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { changeFriend } from "@/lib/friends-server";
import {
  ADVENTURE_DISPLAY_CONSENT,
  adventureHashtag,
} from "@/lib/adventure-sharing";
import { validateMomentFile } from '@/lib/moment-media';
import { ACTIVITY_SUGGESTIONS } from "@/lib/home-activities";
const target = new URL(process.env.DATABASE_URL || "");
if (target.hostname !== "127.0.0.1" || !target.pathname.includes("_test"))
  throw Error("Disposable database required");
const Module = require("node:module");
const original = Module._load;
let mediaRace: null | (() => Promise<unknown>) = null;
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
  if (name === "@/lib/moment-media") return {
    validateMomentFile,
    uploadPrivateMoment: async () => ({ cid: 'bafy' + 'a'.repeat(50), mime: 'image/jpeg', mediaType: 'IMAGE' }),
    privateMomentResponse: async () => { if (mediaRace) await mediaRace(); return new Response('fixture-media', { headers: { 'Cache-Control': 'private, no-store' } }); },
  };
  return original.call(this, name, ...args);
};
const routes = require("@/app/api/adventure-submissions/route");
const admin = require("@/app/api/admin/adventures/route");
const a = "0x1111111111111111111111111111111111111111",
  b = "0x2222222222222222222222222222222222222222",
  c = "0x3333333333333333333333333333333333333333";
const activityId = ACTIVITY_SUGGESTIONS[0].id;
let requestNumber = 0;
function upload(runId: string, auth = true, consent = true) {
  const form = new FormData();
  form.set("wallet", a);
  form.set("activityId", activityId);
  form.set("runId", runId);
  form.set("venueSlug", "social-test");
  form.set("caption", "Test only");
  form.set("file", new File([new Uint8Array([255,216,255]), runId], "test.jpg", { type: "image/jpeg" }));
  if (consent) form.set("consent", ADVENTURE_DISPLAY_CONSENT);
  return new NextRequest("https://example.com/api/adventure-submissions", {
    method: "POST",
    headers: auth ? { "x-test-wallet": a, "x-forwarded-for": `192.0.2.${++requestNumber}` } : {},
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
  const legacy = await prisma.adventureSubmission.findUniqueOrThrow({ where: { id: 'legacy-fixture-row' } });
  assert.equal(legacy.publicConsentVersion, 'adventure-display-v1'); assert.equal(legacy.mediaUrl, 'https://example.com/legacy.jpg'); assert.equal(legacy.socialUrl, null); assert.equal(legacy.creatorCreditConsent, null);
  await prisma.adventureSubmission.delete({ where: { id: legacy.id } });
  const grants = await prisma.$queryRaw<Array<{ priv: boolean }>>`SELECT has_table_privilege('anon', '"AdventureSubmission"', 'SELECT') AS priv`;
  assert.equal(grants[0].priv, false);

  await prisma.venue.create({
    data: {
      slug: "social-test",
      name: "Test",
      latitude: 9.79,
      longitude: 126.15,
    },
  });
  delete process.env.MOMENT_SUBMISSIONS_ENABLED;
  delete process.env.MOMENT_ORIGINAL_MEDIA_ENABLED;
  assert.equal((await routes.POST(upload('paused-fixture-run'))).status, 503);
  assert.equal(await prisma.adventureSubmission.count(), 0);
  process.env.MOMENT_SUBMISSIONS_ENABLED = 'true';
  process.env.PINATA_JWT = 'isolated-fixture-not-a-provider-key';
  assert.equal((await routes.POST(upload('files-paused-fixture-run'))).status, 503);
  assert.equal(await prisma.adventureSubmission.count(), 0);
  process.env.MOMENT_ORIGINAL_MEDIA_ENABLED = 'true';
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
  process.env.MOMENT_SUBMISSIONS_ENABLED = 'false';
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
  process.env.MOMENT_SUBMISSIONS_ENABLED = 'true';
  await routes.POST(upload("test-run-0002"));
  await routes.POST(upload("test-run-0003"));
  assert.equal((await routes.POST(upload("test-run-0004"))).status, 429);
  await socialMomentScenarios();
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
async function socialMomentScenarios() {
  const d = '0x4444444444444444444444444444444444444444', e = '0x5555555555555555555555555555555555555555';
  const activity = 'wave-or-ex';
  const social = (runId: string, wallet = d, fields: Record<string,string> = {}) => {
    const form = new FormData();
    for (const [key, value] of Object.entries({ wallet, activityId: activity, runId, caption: 'Fixture only. An independent take.', socialUrl: 'https://www.instagram.com/reel/Fixture01/?utm_source=test', consent: ADVENTURE_DISPLAY_CONSENT, ...fields })) form.set(key, value);
    return new NextRequest('https://example.com/api/adventure-submissions', { method: 'POST', headers: { 'x-test-wallet': wallet, 'x-forwarded-for': `192.0.2.${++requestNumber}` }, body: form });
  };
  const created = await routes.POST(social('moment-fixture-run-001')); assert.equal(created.status, 200, await created.clone().text());
  const post = await prisma.adventureSubmission.findUniqueOrThrow({ where: { wallet_runId: { wallet: d, runId: 'moment-fixture-run-001' } } });
  assert.equal(post.venueSlug, null); assert.equal(post.mediaUrl, null); assert.equal(post.privateMediaCid, null); assert.equal(post.socialUrl, 'https://www.instagram.com/reel/Fixture01/');
  assert.equal((await read('?activityId=' + activity)).length, 0);
  assert.equal((await routes.POST(social('moment-fixture-run-002', d, { socialUrl: 'https://instagram.com/p/Fixture01/' }))).status, 409);
  assert.equal((await routes.POST(social('moment-cross-wallet-duplicate', e))).status, 409);
  assert.equal((await routes.POST(social('moment-fixture-run-003', d, { socialUrl: 'https://evil.invalid/reel/Fixture02' }))).status, 400);
  assert.equal((await routes.POST(social('moment-fixture-run-004', d, { consent: 'adventure-display-v1' }))).status, 400);
  const isolation = await routes.GET(new NextRequest('https://example.com/api/adventure-submissions?mine=1&wallet=' + a + '&creator=fixture-maker', { headers: { 'x-test-wallet': a } }));
  assert.ok((await isolation.json()).data.every((row: { id: string }) => row.id !== post.id));
  const own = await routes.GET(new NextRequest('https://example.com/api/adventure-submissions?mine=1&wallet=' + d, { headers: { 'x-test-wallet': d } })); assert.equal((await own.json()).data.length, 1);
  assert.equal((await review(post.id, 'APPROVED')).status, 200);
  const publicPosts = await read('?activityId=' + activity + '&lat=0&lng=0&radiusKm=1'); assert.equal(publicPosts.length, 1); assert.equal(publicPosts[0].venue, null); assert.equal(publicPosts[0].creatorTag, null);
  for (const field of ['wallet','sourceKey','privateMediaCid','promotionContact','reviewedBy','publicConsentVersion']) assert.equal(publicPosts[0][field], undefined);
  assert.equal((await routes.POST(social('moment-fixture-run-005', d, { socialUrl: 'https://x.com/d/status/1234512345', parentMomentId: post.id }))).status, 400);
  assert.equal((await routes.POST(social('moment-fixture-run-006', e, { socialUrl: 'https://x.com/e/status/9876598765', parentMomentId: post.id, creatorCreditConsent: 'true', spotlightConsent: 'true' }))).status, 200);
  const child = await prisma.adventureSubmission.findFirstOrThrow({ where: { wallet: e } }); assert.equal(child.parentMomentId, post.id);
  assert.equal((await review(child.id, 'APPROVED')).status, 200);
  const feature = () => admin.PUT(new NextRequest('https://example.com/api/admin/adventures', { method: 'PUT', headers: { 'x-test-admin': 'yes' }, body: JSON.stringify({ id: child.id, featured: true, reason: 'Fixture editorial choice' }) }));
  assert.equal((await feature()).status, 409); // no authorized public creator identity yet
  await prisma.streamerTag.create({ data: { tag: '@fixture-maker', walletAddress: e, status: 'ACTIVE', verificationMethod: 'fixture' } });
  assert.equal((await feature()).status, 200);
  assert.equal((await read('?creator=fixture-maker'))[0].featured, true);
  await prisma.streamerTag.updateMany({ where: { walletAddress: e }, data: { revokedAt: new Date() } });
  assert.equal((await read('?id=' + child.id))[0].featured, false);
  assert.equal((await read('?id=' + child.id))[0].creatorTag, null);
  const report = require('@/app/api/adventure-submissions/[id]/report/route');
  const reportResponse = await report.POST(new NextRequest('https://example.com/report', { method: 'POST', headers: { 'x-test-wallet': e }, body: JSON.stringify({ wallet: e, reason: 'Fixture: source was removed.' }) }), { params: Promise.resolve({ id: post.id }) }); assert.equal(reportResponse.status, 200);
  assert.equal((await read('?id=' + post.id)).length, 0); assert.equal((await prisma.adventureSubmission.findUniqueOrThrow({ where: { id: post.id } })).status, 'FLAGGED');
  assert.equal((await review(post.id, 'APPROVED')).status, 200);
  const repeatReport = await report.POST(new NextRequest('https://example.com/report', { method: 'POST', headers: { 'x-test-wallet': e }, body: JSON.stringify({ wallet: e, reason: 'Fixture repeated report after resolution.' }) }), { params: Promise.resolve({ id: post.id }) });
  assert.equal((await repeatReport.json()).hidden, false);
  assert.equal((await prisma.adventureSubmission.findUniqueOrThrow({ where: { id: post.id } })).status, 'APPROVED');
  assert.equal(await prisma.founderEvent.count({ where: { eventType: 'ADVENTURE_REPORT', status: 'NEEDS_REVIEW' } }), 0);
  assert.equal(await prisma.attributionEvent.count({ where: { dedupeKey: 'moment:MOMENT_APPROVED:' + post.id } }), 1);
  // The actual media route must enforce private reads, including revocation during storage I/O.
  const media = require('@/app/api/adventure-submissions/[id]/media/route');
  const filePost = await prisma.adventureSubmission.findFirstOrThrow({ where: { wallet: a, status: 'PENDING' } });
  const mediaRequest = () => new NextRequest('https://example.com/media');
  assert.equal((await media.GET(mediaRequest(), { params: Promise.resolve({ id: filePost.id }) })).status, 404);
  assert.equal((await media.GET(new NextRequest('https://example.com/media?wallet=' + a, { headers: { 'x-test-wallet': a } }), { params: Promise.resolve({ id: filePost.id }) })).status, 200);
  assert.equal((await review(filePost.id, 'APPROVED')).status, 200);
  mediaRace = () => prisma.adventureSubmission.update({ where: { id: filePost.id }, data: { status: 'WITHDRAWN' } });
  assert.equal((await media.GET(mediaRequest(), { params: Promise.resolve({ id: filePost.id }) })).status, 404); mediaRace = null;
  const race = await Promise.all([routes.POST(social('moment-source-race-001', '0x7777777777777777777777777777777777777777', { socialUrl: 'https://instagram.com/reel/SourceRace01/' })), routes.POST(social('moment-source-race-002', '0x8888888888888888888888888888888888888888', { socialUrl: 'https://instagram.com/reel/SourceRace01/?utm=test' }))]);
  assert.deepEqual(race.map((r) => r.status).sort(), [200,409]);
  await attributionAndDraftScenarios(post.id, activity);
  console.log('PASS: nullable venue, canonical social dedupe, consent v2, private pending, no leaked fields, independent relay, credit/spotlight revocation, report/re-review, media revocation race.');
}
async function attributionAndDraftScenarios(momentId: string, activityId: string) {
  const tries = require('@/app/moments/[id]/try/route'); const events = require('@/app/api/adventures/events/route');
  const first = await tries.GET(new NextRequest('https://example.com/moments/' + momentId + '/try'), { params: Promise.resolve({ id: momentId }) });
  assert.equal(first.status, 303); assert.match(first.headers.get('location'), /wave-or-ex/); assert.doesNotMatch(first.headers.get('location'), /steps|completed|wallet/);
  const cookie = first.headers.get('set-cookie')!.split(';')[0];
  const eventReq = (event: string) => new NextRequest('https://example.com/api/adventures/events', { method: 'POST', headers: { Cookie: cookie }, body: JSON.stringify({ activityId, runId: 'funnel-fixture-run-001', event }) });
  assert.equal((await events.POST(eventReq('STARTED'))).status, 200);
  assert.equal((await events.POST(eventReq('STARTED'))).status, 200);
  assert.equal((await events.POST(eventReq('COMPLETED_SELF_REPORTED'))).status, 200);
  assert.equal(await prisma.attributionEvent.count({ where: { eventType: 'ADVENTURE_STARTED' } }), 1);
  const intent = await prisma.actionIntent.findFirstOrThrow({ where: { targetId: activityId } }); assert.equal(intent.state, 'LOCKED'); assert.equal(intent.completedAt, null); assert.equal(intent.walletAddress, null);
  const form = new FormData(); const contributor = '0x6666666666666666666666666666666666666666';
  for (const [key,value] of Object.entries({ wallet: contributor, activityId, runId: 'referred-contribution-run', caption: 'Fixture: independent referred attempt', socialUrl: 'https://instagram.com/reel/Fixture03/', consent: ADVENTURE_DISPLAY_CONSENT, parentMomentId: momentId })) form.set(key,value);
  const submitted = await routes.POST(new NextRequest('https://example.com/api/adventure-submissions', { method: 'POST', headers: { Cookie: cookie, 'x-test-wallet': contributor, 'x-forwarded-for': '192.0.2.220' }, body: form }));
  assert.equal(submitted.status, 200); const contribution = (await submitted.json()).data;
  assert.equal((await review(contribution.id, 'APPROVED')).status, 200);
  const approved = await prisma.attributionEvent.findUniqueOrThrow({ where: { dedupeKey: 'moment:MOMENT_APPROVED:' + contribution.id } });
  assert.equal(approved.actionIntentId, intent.id); assert.equal(approved.touchId, intent.primaryTouchId); assert.equal(approved.participantKey, 'wallet:' + contributor);
  const drafts = require('@/app/api/admin/sponsored-briefs/route');
  const draft = { requestId: 'acb0a576-6a7e-4d56-8f70-f2b14251b918', sponsor: 'Fixture only', objective: 'Proposed creator campaign', activityId, audience: 'Local creators', deliverable: 'One original vertical video', platforms: ['INSTAGRAM'], evidencePolicy: 'Original post + rights review', reviewCriteria: 'Human review before contract acceptance', rightsTerms: 'Proposed terms only; no license accepted', startsOn: '2026-11-01', endsOn: '2026-11-07', model: 'FUTURE_VERIFIED_VIEWS', proposedBudgetUsd: 100, proposedPerCreatorUsd: 10, creatorCap: 2, postCap: 4 };
  assert.equal((await drafts.POST(new NextRequest('https://example.com/api/admin/sponsored-briefs', { method: 'POST', body: JSON.stringify(draft) }))).status, 401);
  for (let i = 0; i < 2; i++) assert.equal((await drafts.POST(new NextRequest('https://example.com/api/admin/sponsored-briefs', { method: 'POST', headers: { 'x-test-admin': 'yes' }, body: JSON.stringify(draft) }))).status, 200);
  assert.equal(await prisma.founderEvent.count({ where: { eventType: 'SPONSORED_BRIEF_DRAFT' } }), 1);
  assert.equal(await prisma.campaign.count(), 0); assert.equal(await prisma.campaignSlot.count(), 0); assert.equal(await prisma.contentRightsAcceptance.count(), 0); assert.equal(await prisma.dare.count(), 0); assert.equal(await prisma.pointsEvent.count(), 0); assert.equal(await prisma.venueCheckIn.count(), 0);
  const growth = require('@/app/api/admin/moment-growth/route');
  await prisma.attributionEvent.createMany({data:Array.from({length:10001},(_,i)=>({eventType:'MOMENT_TRY',dedupeKey:'growth-overflow-fixture:'+i,touchId:intent.primaryTouchId}))});
  const growthResult = await growth.GET(new NextRequest('https://example.com/api/admin/moment-growth',{headers:{'x-test-admin':'yes'}}));
  assert.equal(growthResult.status,200);
  assert.equal((await growthResult.json()).data.metrics['Starts linked to a Moment touch'],null,'A truncated touch query must be unavailable, not a partial total');
  await prisma.attributionEvent.deleteMany({where:{dedupeKey:{startsWith:'growth-overflow-fixture:'}}});
  console.log('PASS: actual Moment → fresh challenge redirect → self-reported start/finish → existing frozen intent (no payment completion); private idempotent sponsor draft creates no campaign/slot/rights/payment/points/presence.');
}
main()
  .finally(async () => { await prisma.$disconnect(); setTimeout(() => process.exit(process.exitCode ?? 0), 20); })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
