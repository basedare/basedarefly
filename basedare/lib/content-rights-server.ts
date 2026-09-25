import 'server-only';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { CONTENT_RIGHTS_VERSION, CONTENT_USAGE_TERMS, readContentDelivery, validPublicationUrl } from '@/lib/content-delivery';
import { requiresSponsorCommercialReuseConsent } from '@/lib/creator-mission-policy';

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

export function contentRightsFingerprint(snapshot: unknown): string {
  const brief = readContentDelivery(snapshot);
  if (!brief) throw new Error('This mission needs a complete content and rights brief.');
  return createHash('sha256').update(canonicalJson({ contract: snapshot, terms: CONTENT_USAGE_TERMS })).digest('hex');
}

export function contentRightsReleaseEnabled() {
  return process.env.CONTENT_RIGHTS_APPROVED_VERSION === CONTENT_RIGHTS_VERSION;
}

export async function recordContentRightsAcceptance(tx: Prisma.TransactionClient, input: {
  dareId: string; wallet: string; snapshot: unknown; accepted?: boolean; fingerprint?: string;
}) {
  const brief = readContentDelivery(input.snapshot);
  const fingerprint = contentRightsFingerprint(input.snapshot);
  if (!input.accepted || input.fingerprint !== fingerprint) throw new Error('Read and accept the current content usage terms before requesting this mission.');
  // A grant belongs to one wallet and one immutable funded brief. Repeated
  // requests are idempotent; a replacement contributor needs their own grant.
  await tx.contentRightsAcceptance.createMany({
    data: [{ dareId: input.dareId, wallet: input.wallet, fingerprint, termsVersion: CONTENT_RIGHTS_VERSION,
      termsSnapshot: { contract: input.snapshot, brief, terms: CONTENT_USAGE_TERMS } as unknown as Prisma.InputJsonValue }],
    skipDuplicates: true,
  });
}

export async function hasContentRightsAcceptance(dare: {
  id: string; outcomeContractSnapshot: unknown; claimedBy?: string | null; targetWalletAddress?: string | null;
}) {
  if (!requiresSponsorCommercialReuseConsent(dare.outcomeContractSnapshot)) return true;
  const wallet = (dare.claimedBy || dare.targetWalletAddress)?.toLowerCase();
  if (!wallet || !readContentDelivery(dare.outcomeContractSnapshot)) return false;
  const row = await prisma.contentRightsAcceptance.findUnique({ where: { dareId_wallet_fingerprint: {
    dareId: dare.id, wallet, fingerprint: contentRightsFingerprint(dare.outcomeContractSnapshot),
  } }, select: { id: true } });
  return Boolean(row);
}

export function contentSubmissionProblem(dare: { outcomeContractSnapshot: unknown; contentSubmittedAt?: Date | null; reportedOutcome?: unknown }, requirePublication = false): string | null {
  const brief = readContentDelivery(dare.outcomeContractSnapshot);
  if (!brief) return null;
  if (!dare.contentSubmittedAt || dare.contentSubmittedAt.getTime() > Date.parse(brief.deadline)) return 'This content mission needs an asset received before its delivery deadline.';
  if (requirePublication && brief.posting === 'PUBLIC_POST' && !validPublicationUrl((dare.reportedOutcome as { publicationUrl?: unknown } | null)?.publicationUrl)) return 'The agreed public post URL must be recorded and reviewed before payout.';
  return null;
}
