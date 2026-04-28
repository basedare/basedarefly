import { NextRequest, NextResponse } from 'next/server';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { buildFounderScoreboardReport } from '@/lib/founder-scoreboard';

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  const periodDaysParam = request.nextUrl.searchParams.get('periodDays');
  const periodDays = periodDaysParam ? Number.parseInt(periodDaysParam, 10) : undefined;

  try {
    const report = await buildFounderScoreboardReport({
      periodDays: Number.isFinite(periodDays) ? Math.min(Math.max(periodDays ?? 7, 1), 30) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FOUNDER_SCOREBOARD] Build failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to build founder scoreboard' },
      { status: 500 }
    );
  }
}
