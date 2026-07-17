import 'server-only';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import { canonicalJsonValue } from './contracts';
import { buildCorroborationMissionDraft, type ConflictActionInput } from './conflict-policy';
import { rebuildVenuePulse } from './finalize';
import { refreshDueAt } from './pulse';

const ACTIVE = ['OPEN', 'NEEDS_CORROBORATION'] as const;

async function lockAssertion(tx: Prisma.TransactionClient, assertionId: string): Promise<void> {
  const key = `place-assertion-id:${assertionId}`;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`;
}

export async function resolveAssertionConflict(
  input: ConflictActionInput & { reviewerIdentity: string },
) {
  return prisma.$transaction(
    async (tx) => {
      const initial = await tx.assertionConflict.findUnique({
        where: { id: input.conflictId },
        select: { assertionId: true },
      });
      if (!initial) throw new Error('Conflict not found.');
      await lockAssertion(tx, initial.assertionId);

      const conflict = await tx.assertionConflict.findUnique({
        where: { id: input.conflictId },
        include: {
          assertion: {
            include: {
              venue: { select: { id: true, name: true, slug: true } },
              currentVersion: true,
            },
          },
          observations: { include: { observation: true } },
        },
      });
      if (!conflict || !ACTIVE.includes(conflict.status as (typeof ACTIVE)[number])) {
        throw new Error('Conflict has already changed. Refresh the queue.');
      }
      const now = new Date();
      const assertion = conflict.assertion;
      const current = assertion.currentVersion;
      if (!current) throw new Error('Conflicted assertion has no current version.');

      if (input.action === 'REQUEST_CORROBORATION') {
        const missionDraft = buildCorroborationMissionDraft({
          conflictId: conflict.id,
          venueId: assertion.venue.id,
          venueName: assertion.venue.name,
          kind: assertion.kind,
          subjectKey: assertion.subjectKey,
          requestedBy: input.reviewerIdentity,
          requestedAt: now,
          note: input.note,
        });
        const won = await tx.assertionConflict.updateMany({
          where: { id: conflict.id, status: { in: [...ACTIVE] } },
          data: {
            status: 'NEEDS_CORROBORATION',
            reviewedAt: now,
            reviewerIdentity: input.reviewerIdentity,
            resolution: input.note ?? 'Additional independent proof requested.',
            missionDraftJson: canonicalJsonValue(missionDraft) as Prisma.InputJsonValue,
          },
        });
        if (won.count !== 1) throw new Error('Conflict changed during review.');
        await tx.refreshSchedule.upsert({
          where: { assertionId: assertion.id },
          create: {
            assertionId: assertion.id,
            status: 'NEEDS_REVIEW',
            dueAt: now,
            reason: 'CORROBORATION_REQUESTED',
            priority: 100,
            missionDraftJson: canonicalJsonValue(missionDraft) as Prisma.InputJsonValue,
          },
          update: {
            status: 'NEEDS_REVIEW',
            dueAt: now,
            reason: 'CORROBORATION_REQUESTED',
            priority: 100,
            missionDraftJson: canonicalJsonValue(missionDraft) as Prisma.InputJsonValue,
            leaseOwner: null,
            leaseExpiresAt: null,
          },
        });
        const pulse = await rebuildVenuePulse(tx, assertion.venueId, now);
        return { conflictId: conflict.id, status: 'NEEDS_CORROBORATION' as const, pulse };
      }

      if (input.action === 'DISMISS_OBSERVATION') {
        const won = await tx.assertionConflict.updateMany({
          where: { id: conflict.id, status: { in: [...ACTIVE] } },
          data: {
            status: 'DISMISSED',
            reviewedAt: now,
            resolvedAt: now,
            reviewerIdentity: input.reviewerIdentity,
            resolution: input.note ?? 'Challenger retained as evidence; current fact preserved.',
          },
        });
        if (won.count !== 1) throw new Error('Conflict changed during review.');
        await tx.placeAssertion.update({ where: { id: assertion.id }, data: { state: 'CURRENT' } });
        await tx.refreshSchedule.upsert({
          where: { assertionId: assertion.id },
          create: {
            assertionId: assertion.id,
            status: 'SCHEDULED',
            dueAt: refreshDueAt(assertion.kind, current.observedAt),
            reason: 'CONFLICT_DISMISSED',
          },
          update: {
            status: 'SCHEDULED',
            dueAt: refreshDueAt(assertion.kind, current.observedAt),
            reason: 'CONFLICT_DISMISSED',
            priority: 0,
            missionDraftJson: Prisma.JsonNull,
            leaseOwner: null,
            leaseExpiresAt: null,
          },
        });
        const pulse = await rebuildVenuePulse(tx, assertion.venueId, now);
        return { conflictId: conflict.id, status: 'DISMISSED' as const, pulse };
      }

      const selected = conflict.observations.find(
        (candidate) => candidate.observationId === input.selectedObservationId,
      )?.observation;
      if (!selected || selected.assertionId !== assertion.id) {
        throw new Error('Selected observation is not a challenger in this conflict.');
      }

      let resolvedVersionId = current.id;
      if (selected.valueHash === current.valueHash) {
        await tx.assertionVersionObservation.upsert({
          where: {
            versionId_observationId: { versionId: current.id, observationId: selected.id },
          },
          create: { versionId: current.id, observationId: selected.id },
          update: {},
        });
      } else {
        const closed = await tx.assertionVersion.updateMany({
          where: { id: current.id, supersededAt: null },
          data: { supersededAt: now },
        });
        if (closed.count !== 1) throw new Error('Current version changed during conflict review.');
        const successor = await tx.assertionVersion.create({
          data: {
            assertionId: assertion.id,
            valueJson: selected.valueJson as Prisma.InputJsonValue,
            valueSchemaVersion: selected.valueSchemaVersion,
            valueHash: selected.valueHash,
            observedAt: selected.observedAt,
            validTimeBasis: 'OBSERVED',
            supportingObservations: { create: { observationId: selected.id } },
          },
        });
        resolvedVersionId = successor.id;
        await tx.placeAssertion.update({
          where: { id: assertion.id },
          data: { currentVersionId: successor.id, state: 'CURRENT' },
        });
      }

      const won = await tx.assertionConflict.updateMany({
        where: { id: conflict.id, status: { in: [...ACTIVE] } },
        data: {
          status: 'RESOLVED',
          resolvedVersionId,
          reviewedAt: now,
          resolvedAt: now,
          reviewerIdentity: input.reviewerIdentity,
          resolution: input.note ?? 'Selected challenger accepted as the current fact.',
        },
      });
      if (won.count !== 1) throw new Error('Conflict changed during review.');
      await tx.placeAssertion.update({ where: { id: assertion.id }, data: { state: 'CURRENT' } });
      await tx.refreshSchedule.upsert({
        where: { assertionId: assertion.id },
        create: {
          assertionId: assertion.id,
          status: 'SCHEDULED',
          dueAt: refreshDueAt(assertion.kind, selected.observedAt),
          reason: 'CORRECTION_ACCEPTED',
        },
        update: {
          status: 'SCHEDULED',
          dueAt: refreshDueAt(assertion.kind, selected.observedAt),
          reason: 'CORRECTION_ACCEPTED',
          priority: 0,
          missionDraftJson: Prisma.JsonNull,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });
      const pulse = await rebuildVenuePulse(tx, assertion.venueId, now);
      return { conflictId: conflict.id, status: 'RESOLVED' as const, resolvedVersionId, pulse };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
