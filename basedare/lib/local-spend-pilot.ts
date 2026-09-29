import { z } from 'zod';

export const PilotConfigSchema = z.object({
  enabled: z.boolean(),
  merchantQrTested: z.boolean(),
  merchantReceiptConfirmed: z.boolean(),
  testedAt: z.string().datetime().nullable(),
  testReference: z.string().trim().max(100),
}).superRefine((data, ctx) => {
  if (data.enabled && (!data.merchantQrTested || !data.merchantReceiptConfirmed || !data.testedAt || !data.testReference)) ctx.addIssue({ code: 'custom', message: 'Test the merchant QR, confirm PHP receipt and record the test reference first.' });
  if (data.enabled && data.testedAt && (Date.parse(data.testedAt) > Date.now() || Date.now() - Date.parse(data.testedAt) > 30 * 86400000)) ctx.addIssue({ code: 'custom', message: 'Use a successful test from the last 30 days.' });
});
export type PilotConfig = z.infer<typeof PilotConfigSchema>;
export function activeLocalSpendPilot(metadata: unknown, now = Date.now()) {
  const root = metadata && typeof metadata === 'object' ? metadata as Record<string, unknown> : {};
  const result = PilotConfigSchema.safeParse(root.localSpendPilot);
  const value = result.success ? result.data : null;
  return value?.enabled && value.testedAt && Date.parse(value.testedAt) <= now && now - Date.parse(value.testedAt) <= 30 * 86400000 ? { testedAt: value.testedAt } : null;
}
const money = z.string().trim().regex(/^\d{1,7}(\.\d{1,6})?$/, 'Enter a positive decimal amount.').refine((v) => Number(v) > 0);
export const PilotRecordSchema = z.object({
  recordId: z.string().uuid(),
  consent: z.literal(true, { error: 'Participant permission is required to record this pilot purchase.' }),
  outcome: z.enum(['COMPLETED', 'PENDING', 'FAILED', 'CANCELLED']),
  evidence: z.enum(['PARTICIPANT_REPORTED', 'MERCHANT_CONFIRMED']),
  stablecoin: z.enum(['USDC', 'USDT']),
  amountSpent: money.or(z.literal('0')),
  phpReceived: money.optional().nullable(),
  quotedPhp: money.optional().nullable(),
  elapsedSeconds: z.number().int().min(0).max(86400),
  planReference: z.string().trim().max(120).optional(),
  receiptReference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(300).optional(),
}).superRefine((data, ctx) => {
  if (data.outcome === 'COMPLETED' && Number(data.amountSpent) <= 0) ctx.addIssue({ code: 'custom', message: 'A completed purchase needs the actual amount spent.' });
  if (data.evidence === 'MERCHANT_CONFIRMED' && (data.outcome !== 'COMPLETED' || !data.phpReceived || !data.receiptReference?.trim())) ctx.addIssue({ code: 'custom', message: 'Merchant confirmation needs a completed purchase, PHP received and a receipt reference.' });
});
