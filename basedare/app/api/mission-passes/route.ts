import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  applyJourneyCookie,
  issueMissionPass,
  markMissionPassDelivery,
} from '@/lib/creator-attribution-server';
import { sendMissionPassEmail } from '@/lib/mission-pass-email';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const MissionPassSchema = z.object({
  actionIntentId: z.string().min(1).max(191),
  deliveryMethod: z.enum(['EMAIL', 'PORTABLE_LINK']),
  email: z.string().max(254).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const throttle = checkRateLimit(`mission-pass:issue:${getClientIp(request)}`, {
    limit: 12,
    windowMs: 60_000,
  });
  if (!throttle.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many Mission Pass requests. Try again shortly.' },
      { status: 429, headers: createRateLimitHeaders(throttle) }
    );
  }

  try {
    const body = MissionPassSchema.parse(await request.json());
    const issued = await issueMissionPass({ request, ...body });

    if (body.deliveryMethod === 'EMAIL') {
      try {
        await sendMissionPassEmail({
          to: issued.normalizedEmail!,
          title: issued.title,
          continueUrl: issued.continueUrl,
          expiresAt: issued.missionPass.expiresAt,
          idempotencyKey: `mission-pass-${issued.missionPass.id}`,
        });
        await markMissionPassDelivery(issued.missionPass.id, true).catch((ledgerError) => {
          console.error('[MISSION_PASS] Delivery receipt write failed:', ledgerError);
          return null;
        });
      } catch (deliveryError) {
        await markMissionPassDelivery(issued.missionPass.id, false).catch(() => null);
        throw deliveryError;
      }
    }

    const response = NextResponse.json({
      success: true,
      data: {
        deliveryMethod: body.deliveryMethod,
        continueUrl: body.deliveryMethod === 'EMAIL' ? null : issued.continueUrl,
        expiresAt: issued.missionPass.expiresAt,
      },
    });
    applyJourneyCookie(response, issued.journeyToken);
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to create your Mission Pass.';
    const status = message.includes('not configured') ? 503 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
