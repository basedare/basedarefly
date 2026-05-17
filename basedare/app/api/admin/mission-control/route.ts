import { NextRequest, NextResponse } from 'next/server';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { buildFirstSparkMissionControlReport } from '@/lib/first-spark-mission-control';

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  const periodDaysParam = request.nextUrl.searchParams.get('periodDays');
  const periodDays = periodDaysParam ? Number.parseInt(periodDaysParam, 10) : undefined;

  try {
    const report = await buildFirstSparkMissionControlReport({
      periodDays: Number.isFinite(periodDays) ? Math.min(Math.max(periodDays ?? 14, 7), 30) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MISSION_CONTROL] Build failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to build mission control report' },
      { status: 500 }
    );
  }
}
