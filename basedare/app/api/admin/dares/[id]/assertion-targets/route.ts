import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import {
  PLACE_ASSERTION_KINDS,
  PROOF_POLICY_DEFINITIONS,
  canonicalJsonValue,
  proofPolicyHash,
  validateSubjectKey,
  type PlaceAssertionKindName,
} from '@/lib/place-memory/contracts';
import { prisma } from '@/lib/prisma';

const safeDisplaySchema = z
  .object({
    label: z.string().trim().min(1).max(100).optional(),
    helpText: z.string().trim().min(1).max(240).optional(),
    timezone: z.string().trim().min(1).max(80).optional(),
    itemLabel: z.string().trim().min(1).max(120).optional(),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    unit: z.string().trim().min(1).max(60).optional(),
    minorUnitScale: z.number().int().min(0).max(3).optional(),
  })
  .strict();

const targetSchema = z
  .object({
    kind: z.enum(PLACE_ASSERTION_KINDS),
    subjectKey: z.string().trim().min(1).max(80),
    required: z.boolean().default(true),
    display: safeDisplaySchema.optional(),
  })
  .strict();

const replaceTargetsSchema = z
  .object({ targets: z.array(targetSchema).min(1).max(24) })
  .strict();

async function loadTargets(dareId: string) {
  return prisma.dareAssertionTarget.findMany({
    where: { dareId },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    include: {
      proofPolicyVersion: {
        select: { identifier: true, version: true, policyHash: true, retiredAt: true },
      },
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  const { id } = await params;
  return NextResponse.json({ success: true, data: await loadTargets(id) });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);

  try {
    const { id } = await params;
    const parsed = replaceTargetsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid targets.' },
        { status: 400 },
      );
    }
    const normalized = parsed.data.targets.map((target, position) => ({
      ...target,
      position,
      subjectKey: validateSubjectKey(target.kind, target.subjectKey),
    }));
    const duplicate = normalized.find((target, index) =>
      normalized.some(
        (candidate, candidateIndex) =>
          candidateIndex < index &&
          candidate.kind === target.kind &&
          candidate.subjectKey === target.subjectKey,
      ),
    );
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: `Duplicate target ${duplicate.kind}:${duplicate.subjectKey}.` },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Dare" WHERE id = ${id} FOR UPDATE`;
      const dare = await tx.dare.findUnique({
        where: { id },
        select: {
          id: true,
          venueId: true,
          status: true,
          approvedProofAttemptId: true,
          _count: { select: { proofAttempts: true } },
        },
      });
      if (!dare) throw new Error('Dare not found.');
      if (!dare.venueId) throw new Error('Structured Place Memory requires a canonical Venue.');
      if (dare.status !== 'PENDING' || dare.approvedProofAttemptId || dare._count.proofAttempts > 0) {
        throw new Error('Targets are locked once proof processing starts.');
      }

      const policyByKind = new Map<PlaceAssertionKindName, string>();
      for (const kind of [...new Set(normalized.map((target) => target.kind))]) {
        const expected = PROOF_POLICY_DEFINITIONS[kind];
        const policy = await tx.proofPolicyVersion.findUnique({
          where: {
            identifier_version: { identifier: expected.identifier, version: expected.version },
          },
        });
        const expectedHash = proofPolicyHash(expected.policy);
        if (
          !policy ||
          policy.retiredAt ||
          policy.policyHash !== expectedHash ||
          proofPolicyHash(policy.canonicalPolicyJson) !== expectedHash
        ) {
          throw new Error(`Active server proof policy is unavailable for ${kind}. Deploy the migration first.`);
        }
        policyByKind.set(kind, policy.id);
      }

      await tx.dareAssertionTarget.deleteMany({ where: { dareId: id } });
      await tx.dareAssertionTarget.createMany({
        data: normalized.map((target) => ({
          dareId: id,
          kind: target.kind,
          subjectKey: target.subjectKey,
          valueSchemaVersion: 1,
          required: target.required,
          proofPolicyVersionId: policyByKind.get(target.kind)!,
          displayConfigJson: target.display
            ? (canonicalJsonValue(target.display) as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          position: target.position,
        })),
      });
    });

    return NextResponse.json({ success: true, data: await loadTargets(id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to configure targets.';
    const status = message === 'Dare not found.' ? 404 : message.includes('locked') ? 409 : 400;
    console.error('[ADMIN_PLACE_MEMORY_TARGETS] Replace failed:', message);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
