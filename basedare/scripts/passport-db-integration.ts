import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPassportEvidence } from '@/lib/passport-evidence-server';
import { ACTIVITY_SUGGESTIONS } from '@/lib/home-activities';
import { LIVE_PLAN_ATTENDANCE_EVENT } from '@/lib/live-plan-retention';
const target = new URL(process.env.DATABASE_URL || '');
if (target.hostname !== '127.0.0.1' || !target.pathname.includes('_test')) throw Error('Disposable database required');
const Module = require('node:module');
const original = Module._load;
Module._load = function(name: string, ...args: unknown[]) {
  if (name === '@/lib/wallet-action-auth-server') return { getAuthorizedWalletForRequest: async (req: NextRequest, input: { walletAddress: string }) => req.headers.get('x-test-wallet') === input.walletAddress ? input.walletAddress : null };
  return original.call(this, name, ...args);
};
const routes = require('@/app/api/adventures/passport/route');
const a = '0x1111111111111111111111111111111111111111', b = '0x2222222222222222222222222222222222222222';
const now = new Date(), area = { lat: 9.79, lng: 126.15 };
const activity = ACTIVITY_SUGGESTIONS[0];
const run = { runId: 'integration-run', activityId: activity.id, startedAt: now.getTime()-2000, completedAt: now.getTime()-1000, steps: activity.steps.map((_,i)=>i), area: { ...area, label: 'Local test only' }, verified: true };
function req(method: string, body?: unknown, wallet?: string, query = '') {
  return new NextRequest('https://example.com/api/adventures/passport' + query, { method, headers: { 'Content-Type': 'application/json', ...(wallet ? { 'x-test-wallet': wallet } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
async function main() {
  const venues = await Promise.all([0,1,2,3].map((n)=>prisma.venue.create({data:{slug:'passport-test-'+n,name:'Local test '+n,latitude:area.lat,longitude:area.lng}})));
  assert.equal((await routes.GET(req('GET',undefined,undefined,'?wallet='+a))).status,401);
  assert.equal((await routes.PUT(req('PUT',{wallet:a,revision:0,progress:{runs:[run]}},b))).status,401);
  const saved = await routes.PUT(req('PUT',{wallet:a,revision:0,progress:{runs:[run]}},a));
  assert.equal(saved.status,200);
  assert.equal((await saved.json()).data.progress.runs[0].verified,undefined);
  const concurrent = await Promise.all([1,2].map(()=>routes.PUT(req('PUT',{wallet:a,revision:1,progress:{runs:[run]}},a))));
  assert.deepEqual(concurrent.map((r)=>r.status).sort(),[200,409]);
  const privateRead = await routes.GET(req('GET',undefined,a,'?wallet='+a));
  assert.equal(privateRead.headers.get('Cache-Control'),'private, no-store');
  assert.equal((await privateRead.json()).data.journal.revision,2);
  const guest = await (await routes.GET(req('GET'))).json();
  assert.equal(guest.data.journal,null);
  assert.equal(guest.data.evidence.stamps.length,0);
  assert.equal((await routes.DELETE(req('DELETE',{wallet:a,revision:2},a))).status,200);
  assert.equal((await routes.PUT(req('PUT',{wallet:a,revision:2,progress:{runs:[run]}},a))).status,409);
  assert.deepEqual((await prisma.adventureJournal.findUniqueOrThrow({where:{walletAddress:a}})).progressJson,{runs:[]});
  const future = {...run,completedAt:Date.now()+100000};
  assert.equal((await routes.PUT(req('PUT',{wallet:a,revision:3,progress:{runs:[future]}},a))).status,400);
  await assert.rejects(()=>prisma.$transaction(async(tx)=>{await tx.$executeRawUnsafe('SET LOCAL ROLE anon');await tx.$queryRawUnsafe('SELECT * FROM "AdventureJournal"');}));
  await assert.rejects(()=>prisma.$transaction(async(tx)=>{await tx.$executeRawUnsafe('SET LOCAL ROLE authenticated');await tx.$queryRawUnsafe('SELECT * FROM "AdventureJournal"');}));
  const sessions = await Promise.all(venues.slice(0,3).map((venue)=>prisma.venueQrSession.create({data:{venueId:venue.id,sessionKey:'local-test-'+venue.id,endsAt:new Date(now.getTime()+60000)}})));
  await Promise.all(venues.slice(0,3).map((venue,index)=>prisma.venueCheckIn.create({data:{venueId:venue.id,walletAddress:a,scannedAt:now,venueSessionId:sessions[index].id,qrTokenHash:'local-test-token-hash',geoDistanceMeters:10}})));
  await prisma.venueCheckIn.create({data:{venueId:venues[3].id,walletAddress:a}}); // defaults alone aren't presence evidence
  await prisma.venueCheckIn.create({data:{venueId:venues[3].id,walletAddress:a,proofLevel:'QR_ONLY'}});
  let evidence = await getPassportEvidence(a,area);
  assert.equal(evidence.stamps.length,3);
  assert.ok(evidence.achievements.find((item)=>item.id==='pathfinder')?.earnedAt);
  assert.equal(evidence.achievements.find((item)=>item.id==='storyteller')?.earnedAt,null);
  const post = await prisma.adventureSubmission.create({data:{wallet:a,activityId:activity.id,runId:'post-run',venueSlug:venues[0].slug,caption:'Test only',hashtag:'test',mediaUrl:'https://example.com/test.jpg',mediaType:'IMAGE',publicConsentVersion:'test',status:'APPROVED',reviewedAt:now}});
  const tags = await Promise.all([0,1,2].map(()=>prisma.placeTag.create({data:{venueId:venues[0].id,walletAddress:a,status:'APPROVED',reviewedAt:now,proofMediaUrl:'https://example.com/test.jpg'}})));
  await prisma.placeTag.create({data:{venueId:venues[0].id,walletAddress:a,status:'APPROVED',reviewedAt:now,source:'SEEDED_MEMORY',proofMediaUrl:'https://example.com/test.jpg'}});
  evidence = await getPassportEvidence(a,area);
  assert.ok(evidence.achievements.find((item)=>item.id==='storyteller')?.earnedAt);
  assert.ok(evidence.achievements.find((item)=>item.id==='helpful-local')?.earnedAt);
  assert.equal(evidence.community.accepted,3);assert.equal(evidence.community.yours,3);
  await prisma.adventureSubmission.update({where:{id:post.id},data:{status:'WITHDRAWN'}});
  await prisma.placeTag.update({where:{id:tags[0].id},data:{status:'REJECTED'}});
  await prisma.venueCheckIn.updateMany({where:{venueId:venues[2].id},data:{status:'REVOKED'}});
  evidence = await getPassportEvidence(a,area);
  assert.equal(evidence.achievements.find((item)=>item.id==='storyteller')?.earnedAt,null);
  assert.equal(evidence.achievements.find((item)=>item.id==='helpful-local')?.earnedAt,null);
  assert.equal(evidence.achievements.find((item)=>item.id==='pathfinder')?.earnedAt,null);
  const identities = await Promise.all([a,a,b].map((walletAddress,i)=>prisma.streamerTag.create({data:{walletAddress,tag:'@passport-test-'+i,status:'ACTIVE',verificationMethod:'test'}})));
  const plan = await prisma.meetup.create({data:{creatorBaretagId:identities[0].id,title:'Local test meetup',type:'custom',placeLabel:'Test public place',approxLat:area.lat,approxLng:area.lng,startTime:new Date(now.getTime()-10000)}});
  async function attend(index:number) {
    await prisma.meetupRsvp.create({data:{meetupId:plan.id,baretagId:identities[index].id}});
    return prisma.attributionEvent.create({data:{dedupeKey:'passport-test-'+index,eventType:LIVE_PLAN_ATTENDANCE_EVENT,targetType:'MEETUP',targetId:plan.id,participantKey:'baretag:'+identities[index].id,metadataJson:{evidence:'participant_self_attestation'}}});
  }
  await attend(0);await attend(1);
  assert.equal((await getPassportEvidence(a,area)).achievements.find((item)=>item.id==='together')?.earnedAt,null);
  await attend(2);
  assert.ok((await getPassportEvidence(a,area)).achievements.find((item)=>item.id==='together')?.earnedAt);
  await prisma.meetup.update({where:{id:plan.id},data:{status:'cancelled'}});
  assert.equal((await getPassportEvidence(a,area)).achievements.find((item)=>item.id==='together')?.earnedAt,null);
  const checkIn = await prisma.venueCheckIn.findFirstOrThrow({where:{walletAddress:a,status:'CONFIRMED',proofLevel:'QR_AND_GPS'}});
  const perk = {title:'Test allocated offer',checkInId:checkIn.id,redemptionCode:'TEST12',expiresAt:new Date(now.getTime()+60000).toISOString(),conditions:'Test only, one per eligible check-in'};
  await prisma.venueCheckIn.update({where:{id:checkIn.id},data:{metadataJson:{venuePerk:perk}}});
  assert.equal((await getPassportEvidence(a,area)).perks.length,1);
  assert.equal((await getPassportEvidence(b,area)).perks.length,0);
  await prisma.venueCheckIn.update({where:{id:checkIn.id},data:{metadataJson:{venuePerk:{...perk,redeemedAt:now.toISOString()}}}});
  assert.equal((await getPassportEvidence(a,area)).perks.length,0);
  assert.equal(await prisma.pointsEvent.count(),0);
  assert.equal(await prisma.dare.count(),0);
  console.log('PASS: private auth, optimistic conflicts, clear tombstone, RLS, future rejection, QR/GPS vs QR-only, approval and revocation, non-seeded goal, distinct-wallet buddies, cancelled plans, private allocated perks; no reputation or paid work created.');
}
// The app rate limiter owns a housekeeping interval. End this standalone test
// only after all assertions and database disconnect complete so the shell can
// stop its disposable PostgreSQL cluster.
main().catch((error)=>{console.error(error);process.exitCode=1;})
  .finally(()=>prisma.$disconnect()).then(()=>process.exit(process.exitCode ?? 0));
