import 'server-only';

import { Prisma, type Dare } from '@prisma/client';

import { nextReceiptSerial } from '@/lib/receipt-serial';

import {
  buildStructuredSubmissionSnapshots,
  canonicalJsonValue,
  domainHash,
  observationHash,
  readStructuredAnswersSnapshot,
  type PlaceAssertionKindName,
  type StructuredTargetContract,
} from './contracts';
import { computePulseV1, refreshDueAt } from './pulse';
import { aggregateReceiptOutcome, planAssertionTransition, type ReceiptContribution } from './state-machine';

const ACTIVE_CONFLICT_STATUSES = ['OPEN', 'NEEDS_CORROBORATION'] as const;

function asInputJson(value: unknown): Prisma.InputJsonValue {
  return canonicalJsonValue(value) as Prisma.InputJsonValue;
}

function trustedObservedAt(attempt: { capturedAt: Date | null; receivedAt: Date }): Date {
  if (
    attempt.capturedAt &&
    Number.isFinite(attempt.capturedAt.getTime()) &&
    attempt.capturedAt.getTime() <= attempt.receivedAt.getTime() + 2 * 60 * 1000
  ) {
    return attempt.capturedAt;
  }
  return attempt.receivedAt;
}

function assertionLockKey(venueId: string, kind: string, subjectKey: string): string {
  return `place-assertion:${venueId}:${kind}:${subjectKey}`;
}

async function lockAssertion(
  tx: Prisma.TransactionClient,
  venueId: string,
  kind: string,
  subjectKey: string,
): Promise<void> {
  const key = assertionLockKey(venueId, kind, subjectKey);
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`;
}

export type StructuredPlaceMemoryFinalization = {
  structured: true;
  venueId: string;
  proofAttemptId: string;
  receiptId: string;
  serialNumber: number;
  outcome: ReceiptContribution;
};

export type LegacyPlaceMemoryFinalization = {
  structured: false;
};

export async function finalizeStructuredPlaceMemory(
  tx: Prisma.TransactionClient,
  input: {
    dare: Dare;
    approvedProofAttemptId: string | null;
    verifiedAt: Date;
    settlementTxHash: string | null;
  },
): Promise<StructuredPlaceMemoryFinalization | LegacyPlaceMemoryFinalization> {
  const targets = await tx.dareAssertionTarget.findMany({
    where: { dareId: input.dare.id },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    include: { proofPolicyVersion: true },
  });

  if (targets.length === 0) return { structured: false };
  if (!input.dare.venueId) throw new Error('Structured Place Memory Dare is missing canonical venueId.');
  if (!input.approvedProofAttemptId) throw new Error('Structured Dare has no authoritative proof attempt.');

  const attempt = await tx.dareProofAttempt.findFirst({
    where: { id: input.approvedProofAttemptId, dareId: input.dare.id },
  });
  if (!attempt) throw new Error('Approved proof attempt does not belong to the structured Dare.');
  if (
    !attempt.structuredAnswersJson ||
    !attempt.structuredAnswersHash ||
    !attempt.proofPolicySnapshotJson ||
    !attempt.proofPolicySnapshotHash
  ) {
    throw new Error('Structured proof attempt is missing immutable answer or policy snapshots.');
  }

  const storedAnswersHash = domainHash('basedare:structured-answers:v1', attempt.structuredAnswersJson);
  const storedPolicyHash = domainHash('basedare:evaluated-proof-policies:v1', attempt.proofPolicySnapshotJson);
  if (storedAnswersHash !== attempt.structuredAnswersHash || storedPolicyHash !== attempt.proofPolicySnapshotHash) {
    throw new Error('Structured proof snapshot integrity check failed.');
  }

  const answers = readStructuredAnswersSnapshot(attempt.structuredAnswersJson);
  const targetContracts: StructuredTargetContract[] = targets.map((target) => ({
    id: target.id,
    kind: target.kind,
    subjectKey: target.subjectKey,
    valueSchemaVersion: target.valueSchemaVersion,
    required: target.required,
    position: target.position,
    displayConfigJson: target.displayConfigJson,
    proofPolicyVersion: {
      identifier: target.proofPolicyVersion.identifier,
      version: target.proofPolicyVersion.version,
      canonicalPolicyJson: target.proofPolicyVersion.canonicalPolicyJson,
      policyHash: target.proofPolicyVersion.policyHash,
    },
  }));
  const reconstructed = buildStructuredSubmissionSnapshots(
    targetContracts,
    answers.map((answer) => ({ targetId: answer.targetId, value: answer.value })),
  );
  if (
    !reconstructed ||
    reconstructed.structuredAnswersHash !== attempt.structuredAnswersHash ||
    reconstructed.proofPolicySnapshotHash !== attempt.proofPolicySnapshotHash
  ) {
    throw new Error('Structured proof no longer matches its server-owned target contract.');
  }

  const observedAt = trustedObservedAt(attempt);
  const receiptContributions: ReceiptContribution[] = [];
  const observationIds: string[] = [];
  const receiptVersions = new Map<string, string>();

  for (const answer of reconstructed.answers) {
    await lockAssertion(tx, input.dare.venueId, answer.kind, answer.subjectKey);

    const assertion = await tx.placeAssertion.upsert({
      where: {
        venueId_kind_subjectKey: {
          venueId: input.dare.venueId,
          kind: answer.kind,
          subjectKey: answer.subjectKey,
        },
      },
      create: {
        venueId: input.dare.venueId,
        kind: answer.kind,
        subjectKey: answer.subjectKey,
      },
      update: {},
      include: {
        currentVersion: true,
        refreshSchedule: true,
        conflicts: {
          where: { status: { in: [...ACTIVE_CONFLICT_STATUSES] } },
          orderBy: { openedAt: 'asc' },
          take: 1,
        },
      },
    });

    const observation = await tx.assertionObservation.upsert({
      where: {
        proofAttemptId_targetId: {
          proofAttemptId: attempt.id,
          targetId: answer.targetId,
        },
      },
      create: {
        assertionId: assertion.id,
        proofAttemptId: attempt.id,
        targetId: answer.targetId,
        valueJson: asInputJson(answer.value),
        valueSchemaVersion: answer.valueSchemaVersion,
        valueHash: answer.valueHash,
        observationHash: observationHash({
          valueHash: answer.valueHash,
          proofAttemptId: attempt.id,
          observedAt,
        }),
        observedAt,
      },
      update: {},
    });
    observationIds.push(observation.id);

    const activeConflict = assertion.conflicts[0] ?? null;
    const refreshDue =
      assertion.state === 'STALE' ||
      Boolean(assertion.refreshSchedule && assertion.refreshSchedule.dueAt.getTime() <= observedAt.getTime());
    const plan = planAssertionTransition({
      state: assertion.state,
      currentVersionHash: assertion.currentVersion?.valueHash ?? null,
      observationValueHash: observation.valueHash,
      refreshDue,
      hasActiveConflict: Boolean(activeConflict),
    });
    receiptContributions.push(plan.receiptContribution);

    let linkedVersionId: string;
    if (plan.transition === 'CREATE_FIRST_VERSION' || plan.transition === 'CREATE_SUCCESSOR_VERSION') {
      if (plan.closePriorSystemInterval && assertion.currentVersion) {
        const closed = await tx.assertionVersion.updateMany({
          where: { id: assertion.currentVersion.id, supersededAt: null },
          data: { supersededAt: observedAt },
        });
        if (closed.count !== 1) throw new Error('Assertion version changed during successor creation.');
      }

      const successor = await tx.assertionVersion.create({
        data: {
          assertionId: assertion.id,
          valueJson: asInputJson(answer.value),
          valueSchemaVersion: answer.valueSchemaVersion,
          valueHash: answer.valueHash,
          observedAt,
          validTimeBasis: 'OBSERVED',
          supportingObservations: {
            create: { observationId: observation.id },
          },
        },
      });
      linkedVersionId = successor.id;

      await tx.placeAssertion.update({
        where: { id: assertion.id },
        data: { currentVersionId: successor.id, state: 'CURRENT' },
      });
      await tx.refreshSchedule.upsert({
        where: { assertionId: assertion.id },
        create: {
          assertionId: assertion.id,
          status: 'SCHEDULED',
          dueAt: refreshDueAt(answer.kind, observedAt),
          reason: 'TYPE_DECAY_PRIOR_V1',
        },
        update: {
          status: 'SCHEDULED',
          dueAt: refreshDueAt(answer.kind, observedAt),
          reason: 'TYPE_DECAY_PRIOR_V1',
          missionDraftJson: Prisma.JsonNull,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });
    } else if (plan.transition === 'CONFIRM_CURRENT_VERSION') {
      if (!assertion.currentVersion) throw new Error('Confirmation transition has no current version.');
      linkedVersionId = assertion.currentVersion.id;
      await tx.assertionVersionObservation.upsert({
        where: {
          versionId_observationId: {
            versionId: assertion.currentVersion.id,
            observationId: observation.id,
          },
        },
        create: { versionId: assertion.currentVersion.id, observationId: observation.id },
        update: {},
      });
      await tx.refreshSchedule.upsert({
        where: { assertionId: assertion.id },
        create: {
          assertionId: assertion.id,
          status: activeConflict ? 'NEEDS_REVIEW' : 'SCHEDULED',
          dueAt: activeConflict ? observedAt : refreshDueAt(answer.kind, observedAt),
          reason: activeConflict ? 'ACTIVE_CONFLICT' : 'CONFIRMED_AT_TYPE_DECAY_PRIOR_V1',
        },
        update: {
          status: activeConflict ? 'NEEDS_REVIEW' : 'SCHEDULED',
          dueAt: activeConflict ? observedAt : refreshDueAt(answer.kind, observedAt),
          reason: activeConflict ? 'ACTIVE_CONFLICT' : 'CONFIRMED_AT_TYPE_DECAY_PRIOR_V1',
        },
      });
    } else {
      if (!assertion.currentVersion) throw new Error('Conflict transition has no current version.');
      linkedVersionId = assertion.currentVersion.id;
      const conflict =
        activeConflict ??
        (await tx.assertionConflict.create({
          data: {
            assertionId: assertion.id,
            previousVersionId: assertion.currentVersion.id,
            status: 'OPEN',
            severity: 2,
            reason: 'FRESH_VALUE_DISAGREEMENT',
          },
        }));
      await tx.assertionConflictObservation.upsert({
        where: {
          conflictId_observationId: {
            conflictId: conflict.id,
            observationId: observation.id,
          },
        },
        create: { conflictId: conflict.id, observationId: observation.id },
        update: {},
      });
      await tx.placeAssertion.update({ where: { id: assertion.id }, data: { state: 'CONFLICTED' } });
      await tx.refreshSchedule.upsert({
        where: { assertionId: assertion.id },
        create: {
          assertionId: assertion.id,
          status: 'NEEDS_REVIEW',
          dueAt: observedAt,
          reason: 'ASSERTION_CONFLICT',
          priority: 100,
        },
        update: {
          status: 'NEEDS_REVIEW',
          dueAt: observedAt,
          reason: 'ASSERTION_CONFLICT',
          priority: 100,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });
    }

    receiptVersions.set(linkedVersionId, plan.transition.includes('CONFLICT') ? 'CURRENT_UNCHANGED' : 'CURRENT');
  }

  const outcome = aggregateReceiptOutcome(receiptContributions);
  const existingTag = await tx.placeTag.findFirst({
    where: { linkedDareId: input.dare.id },
    select: { serialNumber: true },
  });
  const serialNumber = existingTag?.serialNumber ?? (await nextReceiptSerial(tx));
  const venue = await tx.venue.findUniqueOrThrow({
    where: { id: input.dare.venueId },
    select: { id: true, slug: true, name: true },
  });
  const publicPayload = canonicalJsonValue({
    version: 1,
    serialNumber,
    outcome,
    issuedAt: input.verifiedAt.toISOString(),
    venue: { slug: venue.slug, name: venue.name },
    dare: { id: input.dare.id, title: input.dare.title },
    proof: {
      observedAt: observedAt.toISOString(),
      proximityDecision: attempt.proximityDecision,
      proximityCode: attempt.proximityCode,
    },
    facts: reconstructed.answers.map((answer, index) => ({
      kind: answer.kind,
      subjectKey: answer.subjectKey,
      valueSchemaVersion: answer.valueSchemaVersion,
      value: answer.value,
      outcome: receiptContributions[index],
    })),
  });
  const contentHash = domainHash('basedare:place-receipt:v1', publicPayload);

  const receipt = await tx.placeReceipt.create({
    data: {
      venueId: venue.id,
      dareId: input.dare.id,
      proofAttemptId: attempt.id,
      serialNumber,
      outcome,
      contentHash,
      settlementTxHash: input.settlementTxHash,
      publicPayloadVersion: 1,
      publicPayloadJson: asInputJson(publicPayload),
      issuedAt: input.verifiedAt,
      observations: {
        create: observationIds.map((observationId) => ({ observationId })),
      },
      assertionVersions: {
        create: [...receiptVersions].map(([versionId, role]) => ({ versionId, role })),
      },
    },
  });

  return {
    structured: true,
    venueId: venue.id,
    proofAttemptId: attempt.id,
    receiptId: receipt.id,
    serialNumber,
    outcome,
  };
}

export async function rebuildVenuePulse(
  tx: Prisma.TransactionClient,
  venueId: string,
  now: Date,
): Promise<ReturnType<typeof computePulseV1>> {
  const assertions = await tx.placeAssertion.findMany({
    where: { venueId },
    include: {
      currentVersion: {
        include: {
          supportingObservations: {
            include: { observation: { select: { observedAt: true } } },
          },
        },
      },
      conflicts: {
        where: { status: { in: [...ACTIVE_CONFLICT_STATUSES] } },
        select: { id: true },
      },
    },
  });
  const recentSparkCount = await tx.placeTag.count({
    where: {
      venueId,
      status: 'APPROVED',
      submittedAt: { gte: new Date(now.getTime() - 30 * 86_400_000) },
    },
  });
  const projection = computePulseV1({
    assertions: assertions.map((assertion) => {
      const supportTimes = assertion.currentVersion?.supportingObservations.map(
        (support) => support.observation.observedAt,
      ) ?? [];
      const observedAt = supportTimes.length
        ? new Date(Math.max(...supportTimes.map((value) => value.getTime())))
        : assertion.currentVersion?.observedAt ?? null;
      return {
        kind: assertion.kind as PlaceAssertionKindName,
        hasCurrentVersion: Boolean(assertion.currentVersion),
        observedAt,
        supportCount: assertion.currentVersion?.supportingObservations.length ?? 0,
        conflicted: assertion.conflicts.length > 0,
      };
    }),
    recentSparkCount,
    now,
  });

  await tx.fieldStationProfile.upsert({
    where: { venueId },
    create: {
      venueId,
      status: 'LATENT',
      pulseState: projection.state,
      pulseScore: projection.score,
      pulseComputedAt: now,
      pulseModelVersion: projection.modelVersion,
      pulseComponentsJson: asInputJson(projection.components),
    },
    update: {
      // Do not graduate station capability status in Stage 1.
      pulseState: projection.state,
      pulseScore: projection.score,
      pulseComputedAt: now,
      pulseModelVersion: projection.modelVersion,
      pulseComponentsJson: asInputJson(projection.components),
    },
  });

  return projection;
}
