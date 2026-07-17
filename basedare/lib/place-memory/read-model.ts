import { z } from 'zod';

import type { CanonicalJsonValue, PlaceAssertionKindName } from './contracts';

const PUBLIC_PLACE_ASSERTION_KINDS = [
  'OPENING_WINDOW',
  'ITEM_PRICE',
  'PAYMENT_METHOD',
] as const satisfies readonly PlaceAssertionKindName[];

const jsonPrimitiveSchema = z.union([z.null(), z.boolean(), z.number().finite(), z.string()]);
const canonicalJsonSchema: z.ZodType<CanonicalJsonValue> = z.lazy(() =>
  z.union([
    jsonPrimitiveSchema,
    z.array(canonicalJsonSchema),
    z.record(z.string(), canonicalJsonSchema),
  ]),
);

export type PublicPlaceFact = {
  assertionId: string;
  kind: PlaceAssertionKindName;
  subjectKey: string;
  state: 'UNKNOWN' | 'CURRENT' | 'STALE' | 'CONFLICTED';
  value: CanonicalJsonValue | null;
  valueSchemaVersion: number | null;
  observedAt: string | null;
  supportCount: number;
  hasOpenConflict: boolean;
  refreshDueAt: string | null;
  refreshStatus: string | null;
};

export function effectivePublicAssertionState(input: {
  storedState: PublicPlaceFact['state'];
  hasCurrentVersion: boolean;
  hasOpenConflict: boolean;
  refreshDueAt: Date | null;
  now: Date;
}): PublicPlaceFact['state'] {
  if (input.hasOpenConflict) return 'CONFLICTED';
  if (!input.hasCurrentVersion) return 'UNKNOWN';
  if (
    input.storedState === 'STALE' ||
    (input.refreshDueAt && input.refreshDueAt.getTime() <= input.now.getTime())
  ) {
    return 'STALE';
  }
  return 'CURRENT';
}

export type PublicReceiptPayload = {
  version: 1;
  serialNumber: number;
  outcome: 'MEMORY_CONFIRMED' | 'MEMORY_UPDATED' | 'CONFLICT_OPENED';
  issuedAt: string;
  venue: { slug: string; name: string };
  dare: { id: string; title: string };
  proof: {
    observedAt: string;
    proximityDecision: string | null;
    proximityCode: string | null;
  };
  facts: Array<{
    kind: PlaceAssertionKindName;
    subjectKey: string;
    valueSchemaVersion: number;
    value: CanonicalJsonValue;
    outcome: 'MEMORY_CONFIRMED' | 'MEMORY_UPDATED' | 'CONFLICT_OPENED';
  }>;
};

const receiptOutcomeSchema = z.enum(['MEMORY_CONFIRMED', 'MEMORY_UPDATED', 'CONFLICT_OPENED']);
const publicReceiptPayloadSchema = z
  .object({
    version: z.literal(1),
    serialNumber: z.number().int().positive(),
    outcome: receiptOutcomeSchema,
    issuedAt: z.string().datetime({ offset: true }),
    venue: z.object({ slug: z.string().min(1).max(160), name: z.string().min(1).max(240) }).strict(),
    dare: z.object({ id: z.string().min(1).max(160), title: z.string().min(1).max(500) }).strict(),
    proof: z
      .object({
        observedAt: z.string().datetime({ offset: true }),
        proximityDecision: z.string().max(40).nullable(),
        proximityCode: z.string().max(80).nullable(),
      })
      .strict(),
    facts: z
      .array(
        z
          .object({
            kind: z.enum(PUBLIC_PLACE_ASSERTION_KINDS),
            subjectKey: z.string().min(1).max(80),
            valueSchemaVersion: z.number().int().positive(),
            value: canonicalJsonSchema,
            outcome: receiptOutcomeSchema,
          })
          .strict(),
      )
      .min(1)
      .max(24),
  })
  .strict();

export function readPublicReceiptPayload(value: unknown): PublicReceiptPayload {
  const parsed = publicReceiptPayloadSchema.parse(value);
  return parsed;
}

export function assertPublicReceiptContentHash(
  actualContentHash: string,
  expectedContentHash: string,
): void {
  if (actualContentHash !== expectedContentHash) {
    throw new Error('Place Receipt content hash mismatch.');
  }
}

export function assertPrivacySafePublicValue(value: unknown): void {
  const serialized = JSON.stringify(value).toLowerCase();
  const forbiddenKeys = [
    'submittedlatitude',
    'submittedlongitude',
    'targetlatitude',
    'targetlongitude',
    'latitude',
    'longitude',
    'accuracym',
    'accuracymeters',
    'submitterwallet',
    'beneficiarywallet',
    'walletaddress',
    'systemactor',
    'fraud',
    'cardnumber',
    'email',
    'phone',
  ];
  const leaked = forbiddenKeys.find((key) => serialized.includes(`\"${key}\"`));
  if (leaked) throw new Error(`Public Place Memory payload contains private field ${leaked}.`);
}
