import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';

import {
  buildActivationCloseRoomToken,
  recordActivationCloseRoomDecision,
} from '@/lib/activation-close-room';
import { FIRST_NODE_TERMS_VERSION } from '@/lib/first-node-conversion';
import { prisma } from '@/lib/prisma';
import {
  beginVerifiedFieldSprintCollection,
  buildVerifiedFieldSprintReceipt,
  completeVerifiedFieldSprint,
  confirmVerifiedFieldSprintFunding,
  linkVerifiedFieldSprintMission,
  recordVerifiedFieldSprintBuyerDecision,
  replaceVerifiedFieldSprintMission,
  startVerifiedFieldSprint,
  startVerifiedFieldSprintRouting,
  syncVerifiedFieldSprint,
} from '@/lib/verified-field-sprint-server';
import {
  compileFieldSprintContracts,
  FIELD_SPRINT_REPEAT_TERMS_VERSION,
} from '@/lib/verified-field-sprint-policy';

const runId = `sprint-smoke-${Date.now()}-${randomUUID().slice(0, 8)}`;
const campaignCode = `${runId}-campaign`;
const intakeDedupeKey = `${runId}-intake`;
const createdDareIds: string[] = [];
let sprintId: string | null = null;
let intakeId: string | null = null;
let venueId: string | null = null;

async function main() {
  const database = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assert.match(database[0]?.name ?? '', /^basedare_sprint_vertical_/, 'refusing to run destructive smoke outside a disposable Sprint database');

  const venue = await prisma.venue.create({
    data: {
      slug: `${runId}-venue`,
      name: 'Sprint Smoke Venue',
      city: 'General Luna',
      country: 'Philippines',
      latitude: 9.8001,
      longitude: 126.1551,
      categories: ['test'],
      status: 'ACTIVE',
    },
  });
  venueId = venue.id;

  const stationLinks = await Promise.all([1, 2].map((ordinal) => prisma.creatorAttributionLink.create({
    data: {
      slug: `${runId}-station-${ordinal}`,
      creatorCode: 'basedare',
      contentCode: `station-${ordinal}`,
      campaignCode,
      targetType: 'VENUE',
      targetId: venue.id,
      targetHref: `/map?place=${venue.slug}`,
      stationCode: `${runId.toUpperCase()}-${ordinal}`,
      stationHostVenueId: venue.id,
      attentionMode: 'nearby',
      active: true,
    },
  })));

  const intake = await prisma.founderEvent.create({
    data: {
      eventType: 'ACTIVATION_INTAKE',
      source: 'verified-field-sprint-db-smoke',
      subjectType: 'buyer',
      subjectId: runId,
      dedupeKey: intakeDedupeKey,
      title: 'Database-backed Sprint lifecycle smoke',
      amount: 2500,
      status: 'READY_TO_INVOICE',
      metadataJson: {
        company: 'Smoke Design Partner',
        venue: venue.name,
        city: venue.city,
        operator: {},
      },
    },
  });
  intakeId = intake.id;

  const approval = await recordActivationCloseRoomDecision({
    token: buildActivationCloseRoomToken(intake.id),
    requestId: `${runId}-approval`,
    decision: 'APPROVE_SCOPE',
    contactName: 'Smoke Buyer',
    responderRole: 'Owner',
    authority: 'Authorized buyer',
    channel: 'test',
    email: 'smoke@example.com',
    termsVersion: FIRST_NODE_TERMS_VERSION,
  });
  assert.equal(approval.recorded, true, 'buyer approval should be recorded');
  await prisma.founderEvent.update({ where: { id: intake.id }, data: { status: 'PAYMENT_SENT' } });

  const sprint = await startVerifiedFieldSprint({
    activationIntakeId: intake.id,
    buyerName: 'Smoke Buyer',
    buyerOrganization: 'Smoke Design Partner',
    buyerEmail: 'smoke@example.com',
    buyerQuestion: `Is ${venue.name} open and serving visitors during the test window?`,
    areaLabel: 'General Luna, Siargao',
    freshnessWindowHours: 6,
    campaignCode,
    stationLinkIds: stationLinks.map((link) => link.id),
    createdBy: 'db-smoke',
  });
  sprintId = sprint.id;
  assert.equal(sprint.status, 'DRAFT');
  assert.equal(sprint.missions.length, 4);

  const duplicate = await startVerifiedFieldSprint({
    activationIntakeId: intake.id,
    buyerName: 'Smoke Buyer',
    buyerOrganization: 'Smoke Design Partner',
    buyerEmail: 'smoke@example.com',
    buyerQuestion: sprint.buyerQuestion,
    areaLabel: sprint.areaLabel,
    freshnessWindowHours: 6,
    campaignCode,
    stationLinkIds: stationLinks.map((link) => link.id),
    createdBy: 'db-smoke',
  });
  assert.equal(duplicate.id, sprint.id, 'repeated compile should return the linked Sprint');

  const fundingResults = await Promise.allSettled([
    confirmVerifiedFieldSprintFunding({
      sprintId: sprint.id,
      serviceFeeConfirmedUsd: 2000,
      rewardPoolConfirmedUsd: 500,
      designPartnerException: false,
      fundingReference: `${runId}-payment`,
      actor: 'db-smoke',
    }),
    confirmVerifiedFieldSprintFunding({
      sprintId: sprint.id,
      serviceFeeConfirmedUsd: 2000,
      rewardPoolConfirmedUsd: 500,
      designPartnerException: false,
      fundingReference: `${runId}-payment`,
      actor: 'db-smoke-racer',
    }),
  ]);
  assert.equal(fundingResults.filter((result) => result.status === 'fulfilled').length, 1, 'exactly one funding CAS should win');
  assert.equal(fundingResults.filter((result) => result.status === 'rejected').length, 1, 'the racing funding confirmation should lose');
  assert.equal((await prisma.founderEvent.findUniqueOrThrow({ where: { id: intake.id } })).status, 'PAID_CONFIRMED');

  await startVerifiedFieldSprintRouting(sprint.id);
  const compiledContracts = compileFieldSprintContracts({
    buyerQuestion: sprint.buyerQuestion,
    areaLabel: sprint.areaLabel,
    freshnessWindowHours: sprint.freshnessWindowHours,
  });
  for (const contract of compiledContracts) {
    const dare = await prisma.dare.create({
      data: {
        shortId: `${runId.slice(-8)}${contract.ordinal}`,
        onChainDareId: `${Date.now()}${contract.ordinal}`,
        title: contract.snapshot.mission.do,
        missionMode: 'IRL',
        tag: 'field-truth',
        bounty: 125,
        status: 'PENDING',
        isSimulated: false,
        isNearbyDare: true,
        latitude: venue.latitude,
        longitude: venue.longitude,
        locationLabel: venue.name,
        venueId: venue.id,
        discoveryRadiusKm: 0.5,
        outcomeContractFamily: contract.snapshot.family,
        outcomeContractVersion: contract.snapshot.version,
        outcomeContractSnapshot: contract.snapshot as unknown as Prisma.InputJsonValue,
        stakerAddress: `0x${'a'.repeat(39)}${contract.ordinal}`,
      },
    });
    createdDareIds.push(dare.id);
    await linkVerifiedFieldSprintMission({ sprintId: sprint.id, ordinal: contract.ordinal, dareId: dare.id, actor: 'db-smoke' });
  }

  const collectionResults = await Promise.allSettled([
    beginVerifiedFieldSprintCollection(sprint.id),
    beginVerifiedFieldSprintCollection(sprint.id),
  ]);
  assert.equal(collectionResults.filter((result) => result.status === 'fulfilled').length, 1, 'exactly one collection CAS should win');
  assert.equal(collectionResults.filter((result) => result.status === 'rejected').length, 1, 'the racing collection start should lose');
  assert.equal((await prisma.founderEvent.findUniqueOrThrow({ where: { id: intake.id } })).status, 'LAUNCHED');

  const observedAt = new Date(Date.now() - 15 * 60_000);

  // Deliberately reject the first proof. This evidence remains durable after
  // the one allowed replacement and must be disclosed on the buyer receipt.
  const rejectedDareId = createdDareIds[0];
  const rejectedWallet = `0x${'9'.repeat(40)}`;
  await prisma.dare.update({
    where: { id: rejectedDareId },
    data: {
      status: 'FAILED',
      targetWalletAddress: rejectedWallet,
      evidenceDecision: 'REJECTED',
      proofCid: `${runId}-cid-rejected`,
      videoUrl: `https://example.invalid/${runId}/rejected.jpg`,
    },
  });
  await prisma.dareProofAttempt.create({
    data: {
      dareId: rejectedDareId,
      submitterWallet: rejectedWallet,
      beneficiaryWallet: rejectedWallet,
      source: 'web',
      targetLatitude: venue.latitude,
      targetLongitude: venue.longitude,
      allowedRadiusKm: 0.5,
      submittedLatitude: venue.latitude + 0.02,
      submittedLongitude: venue.longitude + 0.02,
      accuracyM: 12,
      capturedAt: observedAt,
      receivedAt: new Date(observedAt.getTime() + 30_000),
      distanceKm: 3.1,
      proximityDecision: 'OUTSIDE',
      mediaCid: `${runId}-cid-rejected`,
      verificationConfidence: 0.99,
      decision: 'REJECTED',
      evidenceDecision: 'REJECTED',
      decidedAt: new Date(observedAt.getTime() + 60_000),
      submissionKey: `${rejectedDareId}:${runId}-cid-rejected`,
    },
  });
  const rejectedReview = await syncVerifiedFieldSprint(sprint.id);
  assert.equal(rejectedReview?.status, 'REVIEW');
  assert.equal(rejectedReview?.missions[0]?.status, 'REJECTED');

  const replacementContract = compiledContracts[0];
  const replacementDare = await prisma.dare.create({
    data: {
      shortId: `${runId.slice(-7)}r1`,
      onChainDareId: `${Date.now()}91`,
      title: `${replacementContract.snapshot.mission.do} (replacement)`,
      missionMode: 'IRL',
      tag: 'field-truth',
      bounty: 125,
      status: 'PENDING',
      isSimulated: false,
      isNearbyDare: true,
      latitude: venue.latitude,
      longitude: venue.longitude,
      locationLabel: venue.name,
      venueId: venue.id,
      discoveryRadiusKm: 0.5,
      outcomeContractFamily: replacementContract.snapshot.family,
      outcomeContractVersion: replacementContract.snapshot.version,
      outcomeContractSnapshot: replacementContract.snapshot as unknown as Prisma.InputJsonValue,
      stakerAddress: `0x${'b'.repeat(40)}`,
    },
  });
  createdDareIds.push(replacementDare.id);
  const replaced = await replaceVerifiedFieldSprintMission({
    sprintId: sprint.id,
    ordinal: 1,
    dareId: replacementDare.id,
    replacementKind: 'REJECTED',
    replacementReason: 'The first device submission was clearly outside the agreed evidence radius.',
    fundingTreatment: 'SUPPLEMENTAL_125',
    fundingReference: `${runId}-supplemental-125`,
    actor: 'db-smoke',
  });
  assert.equal(replaced.missions[0]?.links.length, 2, 'one replacement should preserve two escrow links');
  await assert.rejects(
    replaceVerifiedFieldSprintMission({
      sprintId: sprint.id,
      ordinal: 1,
      dareId: createdDareIds[1],
      replacementKind: 'REJECTED',
      replacementReason: 'A second replacement must remain impossible.',
      fundingTreatment: 'SUPPLEMENTAL_125',
      fundingReference: `${runId}-forbidden-second-topup`,
      actor: 'db-smoke',
    }),
    /one replacement maximum|requires an authoritative failed\/rejected first mission/i,
  );

  const acceptedDareIds = [replacementDare.id, ...createdDareIds.slice(1, 4)];
  for (let index = 0; index < acceptedDareIds.length; index += 1) {
    const dareId = acceptedDareIds[index];
    const wallet = `0x${String(index + 1).repeat(40)}`;
    const decidedAt = new Date(observedAt.getTime() + (index + 1) * 60_000);
    await prisma.dare.update({
      where: { id: dareId },
      data: {
        status: 'VERIFIED',
        targetWalletAddress: wallet,
        evidenceDecision: 'ACCEPTED',
        reportedOutcome: {
          kind: index === 0 ? 'YES' : index === 1 ? 'NO' : index === 2 ? 'PARTIAL' : 'INCONCLUSIVE',
          summary: `Independent observation ${index + 1} recorded for the bounded buyer question.`,
          observedAt: observedAt.toISOString(),
        },
        proofCid: `${runId}-cid-${index + 1}`,
        videoUrl: `https://example.invalid/${runId}/${index + 1}.jpg`,
        verifiedAt: decidedAt,
        verifyTxHash: `0x${String(index + 5).repeat(64)}`,
      },
    });
    await prisma.dareProofAttempt.create({
      data: {
        dareId,
        submitterWallet: wallet,
        beneficiaryWallet: wallet,
        source: 'web',
        targetLatitude: venue.latitude,
        targetLongitude: venue.longitude,
        allowedRadiusKm: 0.5,
        submittedLatitude: venue.latitude,
        submittedLongitude: venue.longitude,
        accuracyM: 10,
        capturedAt: observedAt,
        receivedAt: new Date(observedAt.getTime() + 30_000),
        distanceKm: 0,
        proximityDecision: 'INSIDE',
        mediaCid: `${runId}-cid-${index + 1}`,
        verificationConfidence: 0.95,
        decision: 'AUTO_APPROVED',
        evidenceDecision: 'ACCEPTED',
        decidedAt,
        submissionKey: `${dareId}:${runId}-cid-${index + 1}`,
      },
    });
  }

  const reviewed = await syncVerifiedFieldSprint(sprint.id);
  assert.equal(reviewed?.status, 'REVIEW');
  assert.equal(reviewed?.missions.every((mission) => mission.status === 'ACCEPTED'), true);
  await prisma.dare.update({ where: { id: replacementDare.id }, data: { targetWalletAddress: rejectedWallet } });
  await syncVerifiedFieldSprint(sprint.id);
  await assert.rejects(
    completeVerifiedFieldSprint(sprint.id),
    /different contributor than its rejected or abandoned first escrow/i,
    'a replacement cannot recycle the contributor from the rejected first escrow',
  );
  await prisma.dare.update({ where: { id: replacementDare.id }, data: { targetWalletAddress: `0x${'1'.repeat(40)}` } });
  await syncVerifiedFieldSprint(sprint.id);
  const completed = await completeVerifiedFieldSprint(sprint.id);
  assert.equal(completed.status, 'COMPLETE');
  assert.equal(completed.missions.filter((mission) => mission.placeObservation).length, 4);

  const receipt = await buildVerifiedFieldSprintReceipt(sprint.receiptCode);
  assert(receipt?.summary, 'complete receipt should contain a conservative outcome distribution');
  assert.deepEqual(receipt.summary.distribution, { YES: 1, NO: 1, PARTIAL: 1, INCONCLUSIVE: 1 });
  assert.equal(receipt.summary.contributorPayoutUsd, 480);
  assert.equal(receipt.missions[0]?.escrowHistory.length, 2, 'receipt must disclose the rejected first escrow and replacement');
  assert.equal(receipt.missions[0]?.escrowHistory[0]?.evidenceReference?.evidenceDecision, 'REJECTED');
  assert.equal(receipt.rights.sponsorCommercialReuse, 'NOT_GRANTED');
  assert.equal(receipt.missions.every((mission) => mission.evidenceReference?.reference.startsWith('ev_')), true);
  assert.equal(JSON.stringify(receipt).includes('submittedLatitude'), false, 'public receipt must not expose submitted coordinates');
  assert.equal(JSON.stringify(receipt).includes('targetLatitude'), false, 'public receipt must not expose target coordinates');
  const completedIntake = await prisma.founderEvent.findUniqueOrThrow({ where: { id: intake.id } });
  const completedMetadata = completedIntake.metadataJson as { verifiedFieldSprint?: { status?: string; receiptCode?: string; receiptHref?: string } } | null;
  assert.equal(completedMetadata?.verifiedFieldSprint?.status, 'COMPLETE');
  assert.equal(completedMetadata?.verifiedFieldSprint?.receiptCode, sprint.receiptCode);
  assert.equal(completedMetadata?.verifiedFieldSprint?.receiptHref, `/field-sprints/${sprint.receiptCode}`);

  const repeatDecision = await recordVerifiedFieldSprintBuyerDecision({
    receiptCode: sprint.receiptCode,
    requestId: `${runId}-repeat-decision`,
    decision: 'REPEAT',
    contactName: 'Smoke Buyer',
    email: 'smoke@example.com',
    note: 'Run the same bounded question once the current place memory expires.',
    termsVersion: FIELD_SPRINT_REPEAT_TERMS_VERSION,
  });
  const duplicateRepeatDecision = await recordVerifiedFieldSprintBuyerDecision({
    receiptCode: sprint.receiptCode,
    requestId: `${runId}-repeat-decision`,
    decision: 'REPEAT',
    contactName: 'Smoke Buyer',
    email: 'smoke@example.com',
    note: 'This retry must not create a second decision.',
    termsVersion: FIELD_SPRINT_REPEAT_TERMS_VERSION,
  });
  assert.equal(duplicateRepeatDecision.id, repeatDecision.id, 'repeat decision must be idempotent');
  assert.equal(await prisma.verifiedFieldSprintBuyerDecision.count({ where: { sprintId: sprint.id } }), 1);
  const firstMissionLink = await prisma.verifiedFieldSprintMissionLink.findFirstOrThrow({
    where: { sprintMission: { sprintId: sprint.id } },
    orderBy: [{ sprintMissionId: 'asc' }, { sequence: 'asc' }],
  });
  await assert.rejects(
    prisma.verifiedFieldSprintMissionLink.update({
      where: { id: firstMissionLink.id },
      data: { linkedBy: 'tamper-attempt' },
    }),
    /append-only|Raw query failed|P2010/i,
    'escrow-link history must be database-enforced append-only',
  );
  await assert.rejects(
    prisma.verifiedFieldSprintBuyerDecision.update({
      where: { id: repeatDecision.id },
      data: { note: 'tamper-attempt' },
    }),
    /append-only|Raw query failed|P2010/i,
    'buyer repeat decisions must be database-enforced append-only',
  );

  const repeatSprint = await startVerifiedFieldSprint({
    buyerName: 'Smoke Buyer',
    buyerOrganization: 'Smoke Design Partner',
    buyerEmail: 'smoke@example.com',
    buyerQuestion: sprint.buyerQuestion,
    areaLabel: sprint.areaLabel,
    freshnessWindowHours: 6,
    campaignCode: `${campaignCode}-repeat`,
    stationLinkIds: await Promise.all(stationLinks.map(async (link, index) => {
      const repeated = await prisma.creatorAttributionLink.create({
        data: {
          slug: `${runId}-repeat-station-${index + 1}`,
          creatorCode: 'basedare',
          contentCode: `repeat-station-${index + 1}`,
          campaignCode: `${campaignCode}-repeat`,
          targetType: 'VENUE',
          targetId: venue.id,
          targetHref: `/map?place=${venue.slug}`,
          stationCode: `${runId.toUpperCase()}-R${index + 1}`,
          stationHostVenueId: venue.id,
          attentionMode: 'nearby',
          active: true,
        },
      });
      return repeated.id;
    })),
    createdBy: 'db-smoke-repeat',
  });
  assert.equal(repeatSprint.status, 'DRAFT', 'receipt should support a clean Sprint #2 compile');

  console.log(JSON.stringify({
    ok: true,
    lifecycle: ['report', 'approval', 'funding', 'routing', 'four-real-escrows', 'collection', 'rejected-first-proof', 'one-disclosed-replacement', 'truthful-negative-and-inconclusive', 'accepted-payout-state', 'receipt-rights-and-privacy', 'buyer-repeat-decision', 'repeat-draft'],
    fundingConcurrency: 'one-winner',
    collectionConcurrency: 'one-winner',
    receiptDistribution: receipt.summary.distribution,
    escrowLinksOnReplacedMission: receipt.missions[0]?.escrowHistory.length,
    sponsorCommercialReuse: receipt.rights.sponsorCommercialReuse,
  }, null, 2));
}

async function cleanup() {
  const database = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  if (!/^basedare_sprint_vertical_/.test(database[0]?.name ?? '')) return;
  await prisma.$executeRawUnsafe('SET session_replication_role = replica');
  try {
    if (sprintId) await prisma.placeMemoryObservation.deleteMany({ where: { sprintId } });
    await prisma.verifiedFieldSprint.deleteMany({ where: { campaignCode: { startsWith: campaignCode } } });
    await prisma.dare.deleteMany({ where: { id: { in: createdDareIds } } });
    await prisma.founderEvent.deleteMany({ where: { OR: [{ dedupeKey: { startsWith: runId } }, { subjectId: runId }, ...(intakeId ? [{ id: intakeId }, { subjectId: intakeId }] : [])] } });
    await prisma.creatorAttributionLink.deleteMany({ where: { slug: { startsWith: runId } } });
    if (venueId) await prisma.venue.deleteMany({ where: { id: venueId } });
  } finally {
    await prisma.$executeRawUnsafe('SET session_replication_role = origin');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await cleanup(); } finally { await prisma.$disconnect(); }
  });
