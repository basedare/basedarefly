import { NextRequest, NextResponse } from 'next/server';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { buildDailyCommandLoopReport } from '@/lib/daily-command-loop';

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const report = await buildDailyCommandLoopReport();

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DAILY_COMMAND_LOOP] Build failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to build daily command loop' },
      { status: 500 }
    );
  }
}
