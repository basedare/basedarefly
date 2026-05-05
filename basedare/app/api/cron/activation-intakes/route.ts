import { NextRequest, NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api-auth';
import { checkAndSendActivationIntakeFollowUpAlert } from '@/lib/activation-funnel';

async function handleActivationIntakeNudges(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) {
    return authError;
  }

  try {
    const result = await checkAndSendActivationIntakeFollowUpAlert();
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CRON][ACTIVATION_INTAKES] Failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to process activation intake nudges' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleActivationIntakeNudges(request);
}

export async function POST(request: NextRequest) {
  return handleActivationIntakeNudges(request);
}
