import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  applyJourneyCookie,
  issueRecoveryMissionPass,
  markMissionPassDelivery,
} from '@/lib/creator-attribution-server';
import { sendMissionPassEmail } from '@/lib/mission-pass-email';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const RecoverySchema = z.object({ email: z.string().min(3).max(254) });

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

  try {
    const { email } = RecoverySchema.parse(await request.json());
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
    applyJourneyCookie(response, issued.journeyToken);
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to send a recovery pass.';
    const status = message.includes('not configured') ? 503 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
