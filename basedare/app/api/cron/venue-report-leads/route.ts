import { NextRequest, NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api-auth';
import { checkAndSendVenueLeadFollowUpAlert } from '@/lib/venue-report-lead-nudges';

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) {
    return authError;
  }

  try {
    const result = await checkAndSendVenueLeadFollowUpAlert();
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CRON][VENUE_REPORT_LEADS] Failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to process venue lead nudges' },
      { status: 500 }
    );
  }
}
