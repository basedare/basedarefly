import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import {
  FIELD_SPRINT_REPEAT_DECISIONS,
  FIELD_SPRINT_REPEAT_TERMS_VERSION,
} from '@/lib/verified-field-sprint-policy';
import { recordVerifiedFieldSprintBuyerDecision } from '@/lib/verified-field-sprint-server';

const DecisionSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(FIELD_SPRINT_REPEAT_DECISIONS),
  contactName: z.string().max(120).optional().nullable(),
  email: z.string().email().max(254).optional().nullable(),
  nextQuestion: z.string().max(500).optional().nullable(),
  note: z.string().max(1200).optional().nullable(),
  termsVersion: z.literal(FIELD_SPRINT_REPEAT_TERMS_VERSION),
}).superRefine((value, context) => {
  if (['REPEAT', 'ADJUST', 'ASK'].includes(value.decision) && (!value.contactName?.trim() || !value.email?.trim())) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Add a name and reply email.' });
  }
  if (value.decision === 'ADJUST' && (value.nextQuestion?.trim().length ?? 0) < 8) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Add the adjusted field question.' });
  }
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ receiptCode: string }> }) {
  const { receiptCode } = await params;
  const rateLimit = checkRateLimit(`${getClientIp(request)}:${receiptCode.slice(0, 32)}`, {
    limit: 8,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'field-sprint-buyer-decision',
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many responses. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) },
    );
  }
  const parsed = DecisionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || 'Invalid decision.' },
      { status: 400, headers: createRateLimitHeaders(rateLimit) },
    );
  }
  try {
    const decision = await recordVerifiedFieldSprintBuyerDecision({ receiptCode, ...parsed.data });
    return NextResponse.json(
      { success: true, data: { id: decision.id, decision: decision.decision } },
      { status: 201, headers: createRateLimitHeaders(rateLimit) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not record the decision.';
    const notFound = /not found/i.test(message);
    return NextResponse.json(
      { success: false, error: notFound ? 'Completed Sprint receipt not found.' : message },
      { status: notFound ? 404 : 409, headers: createRateLimitHeaders(rateLimit) },
    );
  }
}
