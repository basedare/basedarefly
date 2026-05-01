import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { testBotConnection, testSignalRoomConnection } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TelegramTestSchema = z.object({
  target: z.enum(['admin-alerts', 'signal-room']),
});

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = TelegramTestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid Telegram test target' },
      { status: 400 }
    );
  }

  const result =
    parsed.data.target === 'admin-alerts'
      ? await testBotConnection()
      : await testSignalRoomConnection();

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || 'Telegram test failed',
        target: parsed.data.target,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    target: parsed.data.target,
    message:
      parsed.data.target === 'admin-alerts'
        ? 'Admin Telegram alert sent. Confirm it arrived in BaseDare_Alerts.'
        : 'Signal Room broadcast sent. Confirm it arrived in the public channel.',
  });
}
