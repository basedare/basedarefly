import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/api-auth';
import { vestDueScoutRake } from '@/lib/scout-vesting';

/**
 * Daily vesting: flip scout rake PENDING -> VESTED once its vestsAt has passed.
 * Until vested, the dashboard shows rake as "vesting" (not withdrawable).
 * CRON_SECRET-gated.
 */
async function run() {
  const result = await vestDueScoutRake();
  return NextResponse.json({ success: true, data: result });
}

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;
  try {
    return await run();
  } catch (error) {
    console.error('[CRON_SCOUT_VESTING] Vesting failed:', error);
    return NextResponse.json({ success: false, error: 'Vesting failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
