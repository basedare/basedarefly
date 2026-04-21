import { NextRequest, NextResponse } from 'next/server';

import { checkAndSendVenueLeadFollowUpAlert } from '@/lib/venue-report-lead-nudges';

const MODERATOR_WALLETS =
  process.env.MODERATOR_WALLETS?.split(',').map((wallet) => wallet.trim().toLowerCase()) || [];

function isModerator(request: NextRequest): string | null {
  const walletHeader = request.headers.get('x-moderator-wallet');
  if (!walletHeader) return null;
  const lowerWallet = walletHeader.toLowerCase();
  return MODERATOR_WALLETS.includes(lowerWallet) ? lowerWallet : null;
}

export async function POST(request: NextRequest) {
  const moderatorWallet = isModerator(request);
  if (!moderatorWallet) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
