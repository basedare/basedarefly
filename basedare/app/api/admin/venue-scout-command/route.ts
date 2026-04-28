import { NextRequest, NextResponse } from 'next/server';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { buildVenueScoutCommandReport } from '@/lib/venue-scout-command';

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const report = await buildVenueScoutCommandReport();

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_VENUE_SCOUT_COMMAND] Failed to build report:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to build venue scout command report' },
      { status: 500 }
    );
  }
}
