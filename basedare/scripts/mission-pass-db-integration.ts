import assert from 'node:assert/strict';

import { NextRequest } from 'next/server';

import {
  consumeMissionPass,
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

  const recovery = await issueRecoveryMissionPass(secondBrowser, email);
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

  const [intentEvents, issuedEvents, openedEvents] = await Promise.all([
    prisma.attributionEvent.count({
      where: { actionIntentId: locked.intent.id, eventType: 'INTENT_LOCKED' },
    }),
    prisma.attributionEvent.count({
      where: { actionIntentId: locked.intent.id, eventType: 'MISSION_PASS_ISSUED' },
    }),
    prisma.attributionEvent.count({
      where: { actionIntentId: locked.intent.id, eventType: 'MISSION_PASS_OPENED' },
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

  console.log('Mission Pass DB integration passed: lock -> issue -> open -> recover -> list.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
