import assert from 'node:assert/strict';

import { NextRequest } from 'next/server';

import {
  consumeMissionPass,
  ensureAttributionJourney,
  issueMissionPass,
  issueRecoveryMissionPass,
  listSavedMissions,
  lockActionIntent,
} from '@/lib/creator-attribution-server';
import {
  JOURNEY_COOKIE_NAME,
  PARTICIPANT_COOKIE_NAME,
  createParticipantCookieValue,
  getMissionPassSecret,
  hashOpaqueToken,
} from '@/lib/mission-pass-crypto';
import { prisma } from '@/lib/prisma';

function requestWithMissionIdentity(journeyToken: string, participantKey: string): NextRequest {
  const participantCookie = createParticipantCookieValue(participantKey, getMissionPassSecret());
  return new NextRequest('https://www.basedare.xyz/missions', {
    headers: {
      cookie: [
        `${JOURNEY_COOKIE_NAME}=${encodeURIComponent(journeyToken)}`,
        `${PARTICIPANT_COOKIE_NAME}=${encodeURIComponent(participantCookie)}`,
      ].join('; '),
    },
  });
}

function requestWithJourney(journeyToken: string): NextRequest {
  return new NextRequest('https://www.basedare.xyz/map', {
    headers: {
      cookie: `${JOURNEY_COOKIE_NAME}=${encodeURIComponent(journeyToken)}`,
    },
  });
}

function tokenFromContinueUrl(continueUrl: string): string {
  const token = new URL(continueUrl).pathname.split('/').filter(Boolean).at(-1);
  assert.ok(token, 'Mission Pass continuation URL must contain an opaque token.');
  return token;
}

async function main() {
  const runId = `${Date.now()}-${crypto.randomUUID()}`;
  const targetId = `mission-pass-db-${runId}`;
  const email = `mission-pass-${runId}@example.com`;
  const firstBrowser = new NextRequest(`https://www.basedare.xyz/map?place=${targetId}`, {
    headers: { 'user-agent': 'Instagram 330.0 iPhone' },
  });

  const locked = await lockActionIntent(firstBrowser, {
    targetType: 'PAGE',
    targetId,
    targetHref: `/map?place=${targetId}`,
    title: 'Mission Pass database integration',
  });
  assert.equal(locked.intent.state, 'LOCKED');

  const issued = await issueMissionPass({
    request: requestWithJourney(locked.journeyToken),
    actionIntentId: locked.intent.id,
    deliveryMethod: 'EMAIL',
    email,
  });
  const actionToken = tokenFromContinueUrl(issued.continueUrl);
  const storedActionPass = await prisma.missionPass.findUniqueOrThrow({
    where: { id: issued.missionPass.id },
  });
  assert.notEqual(storedActionPass.tokenHash, actionToken, 'Raw Mission Pass tokens must never be stored.');
  assert.equal(storedActionPass.tokenHash, hashOpaqueToken(actionToken));
  assert.ok(storedActionPass.emailHmac, 'Email recovery must store a keyed digest.');

  const openedActionPass = await consumeMissionPass(actionToken);
  assert.equal(openedActionPass.status, 'OPENED');
  assert.ok(openedActionPass.participantKey);
  const secondBrowser = requestWithMissionIdentity(
    openedActionPass.journeyToken,
    openedActionPass.participantKey
  );
  const secondBrowserMissions = await listSavedMissions(secondBrowser);
  assert.ok(
    secondBrowserMissions.some((mission) => mission.id === locked.intent.id),
    'Opening the Mission Pass must recover the saved mission in a new browser.'
  );

  // A different browser's unrelated activity must not hijack email recovery.
  const unrelated = await lockActionIntent(new NextRequest('https://www.basedare.xyz/map'), {
    targetType: 'PAGE', targetId: `${targetId}-unrelated`, targetHref: '/map', title: 'Unrelated browser activity',
  });
  const countBeforeUnknown = await prisma.missionPass.count();
  const unknownRecovery = await issueRecoveryMissionPass(requestWithJourney(unrelated.journeyToken), `unknown-${runId}@example.com`);
  assert.equal(unknownRecovery.sent, false);
  assert.equal(await prisma.missionPass.count(), countBeforeUnknown, 'Unknown email must not create or send a recovery pass.');
  const recovery = await issueRecoveryMissionPass(requestWithJourney(unrelated.journeyToken), email);
  assert.ok(recovery.sent);
  const recoveryToken = tokenFromContinueUrl(recovery.continueUrl);
  const openedRecoveryPass = await consumeMissionPass(recoveryToken);
  assert.equal(openedRecoveryPass.status, 'OPENED');
  assert.equal(openedRecoveryPass.participantKey, openedActionPass.participantKey);
  const thirdBrowser = requestWithMissionIdentity(
    openedRecoveryPass.journeyToken,
    openedRecoveryPass.participantKey
  );
  const recoveredMissions = await listSavedMissions(thirdBrowser);
  assert.ok(
    recoveredMissions.some((mission) => mission.id === locked.intent.id),
    'A recovery Mission Pass must restore the same saved mission across browsers.'
  );

  assert.ok(!recoveredMissions.some(mission => mission.id === unrelated.intent.id), 'Recovery must not adopt the requesting browser history.');

  const [intentEvents, issuedEvents, openedEvents] = await Promise.all([
    prisma.attributionEvent.count({
      where: { actionIntentId: locked.intent.id, eventType: 'INTENT_LOCKED' },
    }),
    prisma.attributionEvent.count({
      where: { missionPassId: { in: [issued.missionPass.id, recovery.missionPass.id] }, eventType: 'MISSION_PASS_ISSUED' },
    }),
    prisma.attributionEvent.count({
      where: { missionPassId: { in: [issued.missionPass.id, recovery.missionPass.id] }, eventType: 'MISSION_PASS_OPENED' },
    }),
  ]);
  assert.equal(intentEvents, 1, 'Intent locking must be recorded once.');
  assert.equal(issuedEvents, 2, 'Action and recovery Mission Pass issuance must both be recorded.');
  assert.equal(openedEvents, 2, 'Action and recovery Mission Pass opens must both be recorded.');

  const leakedEmail = await prisma.$queryRaw<Array<{ leaked: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM "MissionPass"
      WHERE "id" IN (${issued.missionPass.id}, ${recovery.missionPass.id})
        AND row_to_json("MissionPass")::text ILIKE ${`%${email}%`}
    ) AS leaked
  `;
  assert.equal(leakedEmail[0]?.leaked, false, 'Mission Pass rows must not contain a raw email address.');

  const otherEmail = `isolated-${runId}@example.com`;
  const browserA = await lockActionIntent(new NextRequest('https://www.basedare.xyz/map'), { targetType: 'PAGE', targetId: `${targetId}-A`, targetHref: '/map' });
  const browserB = await lockActionIntent(new NextRequest('https://www.basedare.xyz/map'), { targetType: 'PAGE', targetId: `${targetId}-B`, targetHref: '/map' });
  const hidden = await lockActionIntent(requestWithJourney(browserB.journeyToken), { targetType: 'PAGE', targetId: `${targetId}-private`, targetHref: '/map' });
  const emailA = await issueMissionPass({ request: requestWithJourney(browserA.journeyToken), actionIntentId: browserA.intent.id, deliveryMethod: 'EMAIL', email: otherEmail });
  await issueMissionPass({ request: requestWithJourney(browserB.journeyToken), actionIntentId: browserB.intent.id, deliveryMethod: 'EMAIL', email: otherEmail });
  const openedA = await consumeMissionPass(tokenFromContinueUrl(emailA.continueUrl));
  assert.equal(openedA.status, 'OPENED');
  assert.ok(openedA.participantKey);
  const originalB = await ensureAttributionJourney(requestWithJourney(browserB.journeyToken));
  assert.equal(originalB.journey.participantKey, null, 'Sending to an email must not upgrade another browser session.');
  const emailRecovery = await issueRecoveryMissionPass(new NextRequest('https://www.basedare.xyz/missions'), otherEmail);
  assert.ok(emailRecovery.sent);
  const openedEmailRecovery = await consumeMissionPass(tokenFromContinueUrl(emailRecovery.continueUrl));
  assert.equal(openedEmailRecovery.status, 'OPENED');
  assert.ok(openedEmailRecovery.participantKey);
  const emailMissions = await listSavedMissions(requestWithMissionIdentity(openedEmailRecovery.journeyToken, openedEmailRecovery.participantKey));
  assert.ok(emailMissions.some(m => m.id === browserA.intent.id));
  assert.ok(emailMissions.some(m => m.id === browserB.intent.id));
  assert.ok(!emailMissions.some(m => m.id === hidden.intent.id), 'Only explicitly emailed activities are recoverable.');

  const concurrent = await Promise.allSettled(Array.from({ length: 5 }, () => issueMissionPass({
    request: secondBrowser, actionIntentId: locked.intent.id, deliveryMethod: 'EMAIL', email: `race-${runId}@example.com`,
  })));
  assert.equal(concurrent.filter(r => r.status === 'fulfilled').length, 3, 'Email throttling must serialize across concurrent requests.');
  console.log('Mission Pass DB integration passed: recovery, unknown email, browser isolation, explicit-email scope and concurrent rate limits.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
