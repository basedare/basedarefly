import { createHash } from 'node:crypto';
import { z } from 'zod';

export type CanonicalJsonPrimitive = null | boolean | number | string;
export type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | CanonicalJsonValue[]
  | { [key: string]: CanonicalJsonValue };

function serializeCanonical(value: unknown, seen: Set<object>): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Canonical JSON rejects non-finite numbers.');
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value !== 'object') throw new TypeError(`Canonical JSON rejects ${typeof value} values.`);
  if (seen.has(value)) throw new TypeError('Canonical JSON rejects cyclic values.');
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((entry, index) => {
        if (!(index in value)) throw new TypeError('Canonical JSON rejects sparse arrays.');
        return serializeCanonical(entry, seen);
      }).join(',')}]`;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('Canonical JSON accepts only plain objects.');
    }
    const objectValue = value as Record<string, unknown>;
    return `{${Object.keys(objectValue)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${serializeCanonical(objectValue[key], seen)}`)
      .join(',')}}`;
  } finally {
    seen.delete(value);
  }
}

export function canonicalJson(value: unknown): string {
  return serializeCanonical(value, new Set<object>());
}

export function canonicalJsonValue(value: unknown): CanonicalJsonValue {
  return JSON.parse(canonicalJson(value)) as CanonicalJsonValue;
}

export function domainHash(domain: string, value: unknown): string {
  return createHash('sha256')
    .update(domain, 'utf8')
    .update('\0', 'utf8')
    .update(canonicalJson(value), 'utf8')
    .digest('hex');
}

export function placeValueHash(input: {
  kind: string;
  subjectKey: string;
  valueSchemaVersion: number;
  value: unknown;
}): string {
  return domainHash('basedare:place-value:v1', input);
}

export function observationHash(input: {
  valueHash: string;
  proofAttemptId: string;
  observedAt: Date | string;
}): string {
  const observedAt = input.observedAt instanceof Date ? input.observedAt : new Date(input.observedAt);
  if (!Number.isFinite(observedAt.getTime())) throw new TypeError('Observation time must be a valid date.');
  return domainHash('basedare:place-observation:v1', {
    valueHash: input.valueHash,
    proofAttemptId: input.proofAttemptId,
    observedAt: observedAt.toISOString(),
  });
}

export const PLACE_ASSERTION_KINDS = [
  'OPENING_WINDOW',
  'ITEM_PRICE',
  'PAYMENT_METHOD',
] as const;

export type PlaceAssertionKindName = (typeof PLACE_ASSERTION_KINDS)[number];

function containsSensitiveIdentifier(value: string): boolean {
  const normalized = value.toLowerCase();
  if (/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(value)) return true;
  if (/(?:\d[\s-]?){10,}/.test(value)) return true;
  return /\b(?:cvv|cvc|password|passcode|card\s*(?:number|no)|account\s*(?:number|no)|transaction\s*(?:id|number|no)|reference\s*(?:id|number|no)|receipt\s*(?:id|number|no)|signature)\b/.test(normalized);
}

function safeText(max: number) {
  return z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !containsSensitiveIdentifier(value), 'Do not include contact, account, card, receipt, or credential details.');
}

const boundedNote = safeText(240).optional();
const clockTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm time.');

function validTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export const openingWindowV1Schema = z
  .object({
    closed: z.boolean(),
    opens: clockTime.nullable(),
    closes: clockTime.nullable(),
    timezone: z.string().trim().min(1).max(80).refine(validTimezone, 'Use a valid IANA timezone.'),
    note: boundedNote,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.closed && (value.opens !== null || value.closes !== null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Closed days cannot include opening or closing times.',
      });
    }
    if (!value.closed && (value.opens === null || value.closes === null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Open days require both opening and closing times.',
      });
    }
  });

export const itemPriceV1Schema = z
  .object({
    itemLabel: safeText(120),
    amountMinor: z.number().int().nonnegative().max(1_000_000_000),
    currency: z.string().regex(/^[A-Z]{3}$/, 'Use a three-letter uppercase currency code.'),
    unit: safeText(60).optional(),
    available: z.boolean().optional(),
  })
  .strict();

export const PAYMENT_METHOD_CODES = [
  'cash',
  'card',
  'credit_card',
  'debit_card',
  'contactless',
  'visa',
  'mastercard',
  'amex',
  'gcash',
  'maya',
  'bank_transfer',
  'qr_ph',
  'apple_pay',
  'google_pay',
] as const;

const paymentMethodCodeSet = new Set<string>(PAYMENT_METHOD_CODES);

export const paymentMethodV1Schema = z
  .object({
    methodCode: z.enum(PAYMENT_METHOD_CODES),
    accepted: z.boolean(),
    evidenceContext: boundedNote,
  })
  .strict();

const weekdaySubjects = new Set([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

const stableSubjectPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

export function normalizeSubjectKey(subjectKey: string): string {
  return subjectKey.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function validateSubjectKey(kind: PlaceAssertionKindName, subjectKey: string): string {
  const normalized = normalizeSubjectKey(subjectKey);
  if (!stableSubjectPattern.test(normalized) || normalized.length > 80) {
    throw new Error('Subject key must be a stable lowercase identifier.');
  }
  if (kind === 'OPENING_WINDOW' && !weekdaySubjects.has(normalized)) {
    throw new Error('Opening-window subjects must be lowercase weekdays.');
  }
  if (kind === 'PAYMENT_METHOD' && !paymentMethodCodeSet.has(normalized)) {
    throw new Error('Payment-method subjects must use the server allowlist.');
  }
  return normalized;
}

export function parseStructuredValue(input: {
  kind: PlaceAssertionKindName;
  subjectKey: string;
  valueSchemaVersion: number;
  value: unknown;
}): CanonicalJsonValue {
  if (input.valueSchemaVersion !== 1) {
    throw new Error(`Unsupported ${input.kind} schema version ${input.valueSchemaVersion}.`);
  }

  const subjectKey = validateSubjectKey(input.kind, input.subjectKey);
  if (input.kind === 'OPENING_WINDOW') {
    return canonicalJsonValue(openingWindowV1Schema.parse(input.value));
  }
  if (input.kind === 'ITEM_PRICE') {
    return canonicalJsonValue(itemPriceV1Schema.parse(input.value));
  }

  const parsed = paymentMethodV1Schema.parse(input.value);
  if (parsed.methodCode !== subjectKey) {
    throw new Error('Payment method answer must match the configured method target.');
  }
  return canonicalJsonValue(parsed);
}

export const rawStructuredAnswerSchema = z
  .object({
    targetId: z.string().trim().min(1).max(128),
    value: z.unknown(),
  })
  .strict();

export const rawStructuredAnswersSchema = z.array(rawStructuredAnswerSchema).max(24);

export const PROOF_POLICY_DEFINITIONS = {
  OPENING_WINDOW: {
    id: 'policy-opening-window-v1',
    identifier: 'place.opening_window',
    version: 1,
    policy: {
      assertionKind: 'OPENING_WINDOW',
      mediaRequired: true,
      proximity: { mode: 'REUSE_DARE_POLICY' },
      structuredAnswer: { schemaVersion: 1 },
      trustedObservationTime: 'PROOF_CAPTURE_OR_RECEIVE',
    },
  },
  ITEM_PRICE: {
    id: 'policy-item-price-v1',
    identifier: 'place.item_price',
    version: 1,
    policy: {
      assertionKind: 'ITEM_PRICE',
      mediaRequired: true,
      proximity: { mode: 'REUSE_DARE_POLICY' },
      structuredAnswer: { schemaVersion: 1 },
      trustedObservationTime: 'PROOF_CAPTURE_OR_RECEIVE',
    },
  },
  PAYMENT_METHOD: {
    id: 'policy-payment-method-v1',
    identifier: 'place.payment_method',
    version: 1,
    policy: {
      assertionKind: 'PAYMENT_METHOD',
      mediaRequired: true,
      proximity: { mode: 'REUSE_DARE_POLICY' },
      structuredAnswer: { schemaVersion: 1 },
      trustedObservationTime: 'PROOF_CAPTURE_OR_RECEIVE',
    },
  },
} as const satisfies Record<PlaceAssertionKindName, unknown>;

export function proofPolicyHash(policy: unknown): string {
  return domainHash('basedare:proof-policy:v1', policy);
}

export type StructuredTargetContract = {
  id: string;
  kind: PlaceAssertionKindName;
  subjectKey: string;
  valueSchemaVersion: number;
  required: boolean;
  position: number;
  displayConfigJson: unknown;
  proofPolicyVersion: {
    identifier: string;
    version: number;
    canonicalPolicyJson: unknown;
    policyHash: string;
  };
};

export type ValidatedStructuredAnswer = {
  targetId: string;
  kind: PlaceAssertionKindName;
  subjectKey: string;
  valueSchemaVersion: number;
  value: CanonicalJsonValue;
  valueHash: string;
};

export type StructuredSubmissionSnapshots = {
  answers: ValidatedStructuredAnswer[];
  structuredAnswersJson: CanonicalJsonValue;
  structuredAnswersHash: string;
  proofPolicySnapshotJson: CanonicalJsonValue;
  proofPolicySnapshotHash: string;
};

function assertPolicy(target: StructuredTargetContract): void {
  const expected = PROOF_POLICY_DEFINITIONS[target.kind];
  const actualHash = proofPolicyHash(target.proofPolicyVersion.canonicalPolicyJson);
  const expectedHash = proofPolicyHash(expected.policy);

  if (
    target.proofPolicyVersion.identifier !== expected.identifier ||
    target.proofPolicyVersion.version !== expected.version ||
    target.proofPolicyVersion.policyHash !== actualHash ||
    actualHash !== expectedHash
  ) {
    throw new Error(`Target ${target.id} references an invalid or retired proof policy.`);
  }
}

export function buildStructuredSubmissionSnapshots(
  targets: StructuredTargetContract[],
  rawAnswers: unknown,
): StructuredSubmissionSnapshots | null {
  const submitted = rawAnswers === undefined ? [] : rawStructuredAnswersSchema.parse(rawAnswers);
  if (targets.length === 0) {
    if (submitted.length > 0) throw new Error('This Dare does not accept structured answers.');
    return null;
  }

  const targetById = new Map(targets.map((target) => [target.id, target]));
  const submittedById = new Map<string, unknown>();
  for (const answer of submitted) {
    if (!targetById.has(answer.targetId)) throw new Error(`Unknown assertion target: ${answer.targetId}`);
    if (submittedById.has(answer.targetId)) throw new Error(`Duplicate assertion target: ${answer.targetId}`);
    submittedById.set(answer.targetId, answer.value);
  }

  for (const target of targets) {
    assertPolicy(target);
    if (target.required && !submittedById.has(target.id)) {
      throw new Error(`Missing required answer for target ${target.id}.`);
    }
  }

  const answers = targets
    .filter((target) => submittedById.has(target.id))
    .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
    .map((target): ValidatedStructuredAnswer => {
      const subjectKey = validateSubjectKey(target.kind, target.subjectKey);
      const value = parseStructuredValue({
        kind: target.kind,
        subjectKey,
        valueSchemaVersion: target.valueSchemaVersion,
        value: submittedById.get(target.id),
      });
      return {
        targetId: target.id,
        kind: target.kind,
        subjectKey,
        valueSchemaVersion: target.valueSchemaVersion,
        value,
        valueHash: placeValueHash({
          kind: target.kind,
          subjectKey,
          valueSchemaVersion: target.valueSchemaVersion,
          value,
        }),
      };
    });

  const structuredAnswersJson = canonicalJsonValue({ version: 1, answers });
  const proofPolicySnapshotJson = canonicalJsonValue({
    version: 1,
    targets: targets
      .slice()
      .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
      .map((target) => ({
        targetId: target.id,
        kind: target.kind,
        subjectKey: validateSubjectKey(target.kind, target.subjectKey),
        valueSchemaVersion: target.valueSchemaVersion,
        required: target.required,
        policyIdentifier: target.proofPolicyVersion.identifier,
        policyVersion: target.proofPolicyVersion.version,
        policyHash: target.proofPolicyVersion.policyHash,
        evaluatedPolicy: canonicalJsonValue(target.proofPolicyVersion.canonicalPolicyJson),
      })),
  });

  return {
    answers,
    structuredAnswersJson,
    structuredAnswersHash: domainHash('basedare:structured-answers:v1', structuredAnswersJson),
    proofPolicySnapshotJson,
    proofPolicySnapshotHash: domainHash('basedare:evaluated-proof-policies:v1', proofPolicySnapshotJson),
  };
}

export function readStructuredAnswersSnapshot(value: unknown): ValidatedStructuredAnswer[] {
  const answerSchema = z
    .object({
      targetId: z.string().min(1),
      kind: z.enum(PLACE_ASSERTION_KINDS),
      subjectKey: z.string().min(1),
      valueSchemaVersion: z.number().int().positive(),
      value: z.unknown(),
      valueHash: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict();
  const snapshot = z.object({ version: z.literal(1), answers: z.array(answerSchema).max(24) }).strict().parse(value);

  return snapshot.answers.map((answer) => {
    const value = parseStructuredValue(answer);
    const expectedHash = placeValueHash({
      kind: answer.kind,
      subjectKey: answer.subjectKey,
      valueSchemaVersion: answer.valueSchemaVersion,
      value,
    });
    if (expectedHash !== answer.valueHash) throw new Error(`Structured answer hash mismatch for ${answer.targetId}.`);
    return { ...answer, subjectKey: validateSubjectKey(answer.kind, answer.subjectKey), value };
  });
}
