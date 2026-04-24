import { NextRequest, NextResponse } from 'next/server';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { checkAndSendVenueLeadFollowUpAlert } from '@/lib/venue-report-lead-nudges';

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const result = await checkAndSendVenueLeadFollowUpAlert();
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_VENUE_REPORT_LEAD_ALERT] Trigger failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to run venue lead alert scan' },
      { status: 500 }
    );
  }
}
