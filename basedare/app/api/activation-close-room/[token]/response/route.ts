import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { recordActivationCloseRoomDecision } from '@/lib/activation-close-room';
import { ACTIVATION_CLOSE_ROOM_DECISIONS, FIRST_NODE_TERMS_VERSION } from '@/lib/first-node-conversion';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const BuyerResponseSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(ACTIVATION_CLOSE_ROOM_DECISIONS),
  contactName: z.string().min(2).max(120).optional().nullable(),
  responderRole: z.string().min(2).max(100),
  authority: z.string().min(2).max(80),
  channel: z.string().min(2).max(80),
  email: z.string().email().max(180).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
  budgetRange: z.string().max(80).optional().nullable(),
  timeline: z.string().max(80).optional().nullable(),
  paymentPreference: z.string().max(80).optional().nullable(),
  termsVersion: z.literal(FIRST_NODE_TERMS_VERSION).optional().nullable(),
}).superRefine((value, context) => {
  if (value.decision === 'APPROVE_SCOPE' && value.termsVersion !== FIRST_NODE_TERMS_VERSION) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Confirm the approval boundary.' });
  }
  if (['APPROVE_SCOPE', 'NEEDS_INFO'].includes(value.decision) && (!value.contactName || !value.email)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Add a name and reply email.' });
  }
  if (['NEEDS_INFO', 'CORRECT_SCOPE'].includes(value.decision) && !value.message?.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Add the missing detail or correction.' });
  }
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`${clientIp}:${token.slice(0, 32)}`, {
    limit: 12,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'activation-close-room-response',
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many responses. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const parsed = BuyerResponseSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid response.' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }
    const result = await recordActivationCloseRoomDecision({ token, ...parsed.data });
    if (!result.recorded) {
      const status = result.reason === 'TERMS_REQUIRED' ? 400 : 404;
      return NextResponse.json(
        { success: false, error: result.reason === 'TERMS_REQUIRED' ? 'Confirm the approval boundary.' : 'Close room not found.' },
        { status, headers: createRateLimitHeaders(rateLimit) }
      );
    }
    return NextResponse.json({ success: true, data: result }, { headers: createRateLimitHeaders(rateLimit) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ACTIVATION_CLOSE_ROOM_RESPONSE] Failed:', message);
    return NextResponse.json(
      { success: false, error: 'Could not record the buyer response.' },
      { status: 500, headers: createRateLimitHeaders(rateLimit) }
    );
  }
}
