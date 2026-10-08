import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  issueRecoveryMissionPass,
  markMissionPassDelivery,
} from '@/lib/creator-attribution-server';
import { assertMissionPassEmailConfigured, sendMissionPassEmail } from '@/lib/mission-pass-email';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const RecoverySchema = z.object({ email: z.string().trim().email().max(254) });

export async function POST(request: NextRequest) {
  const throttle = checkRateLimit(`mission-pass:recover:${getClientIp(request)}`, {
    limit: 5,
    windowMs: 15 * 60_000,
  });
  if (!throttle.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many recovery requests. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(throttle) }
    );
  }

  const parsed = RecoverySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Enter a valid email address.' }, { status: 400 });
  try {
    assertMissionPassEmailConfigured();
  } catch {
    return NextResponse.json({ success: false, error: 'Email recovery is unavailable right now. Keep your private continuation link.' }, { status: 503 });
  }
  try {
    const { email } = parsed.data;
    const issued = await issueRecoveryMissionPass(request, email);

    if (issued.sent) {
      try {
        await sendMissionPassEmail({
          to: issued.normalizedEmail,
          title: 'Your saved BaseDare missions',
          continueUrl: issued.continueUrl,
          expiresAt: issued.missionPass.expiresAt,
          idempotencyKey: `mission-pass-recovery-${issued.missionPass.id}`,
        });
        await markMissionPassDelivery(issued.missionPass.id, true).catch((ledgerError) => {
          console.error('[MISSION_PASS] Recovery delivery receipt write failed:', ledgerError);
          return null;
        });
      } catch (deliveryError) {
        await markMissionPassDelivery(issued.missionPass.id, false).catch(() => null);
        throw deliveryError;
      }
    }

    // Do not reveal whether the email has saved missions.
    const response = NextResponse.json({
      success: true,
      data: { message: 'If that email has saved missions, a private pass is on its way.' },
    });
    return response;
  } catch {
    // Rate limits and delivery failures must not disclose a saved email identity.
    console.error('[MISSION_PASS] Recovery could not complete; check delivery status.');
    return NextResponse.json({ success: true, data: { message: 'If that email has saved missions, a private pass is on its way.' } });
  }
}
