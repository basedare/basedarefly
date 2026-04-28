import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { sendTestPushToWalletDevice } from '@/lib/web-push';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const wallet = body?.wallet;
    const endpoint = body?.endpoint;

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ success: false, error: 'Valid wallet address required' }, { status: 400 });
    }

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ success: false, error: 'Valid endpoint required' }, { status: 400 });
    }

    const lowerWallet = wallet.toLowerCase();
    const authorizedWallet = await getAuthorizedWalletForRequest(request, {
      walletAddress: lowerWallet,
      action: 'push:test',
      resource: lowerWallet,
    });

    if (!authorizedWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sendTestPushToWalletDevice({ wallet: lowerWallet, endpoint });

    if (!result.success) {
      const error =
        result.reason === 'not_configured'
          ? 'Push delivery keys are not configured.'
          : result.reason === 'not_found'
            ? 'No active push device found for this wallet.'
            : result.reason === 'inactive'
              ? 'This device subscription is no longer active.'
              : 'Test push failed.';

      const status =
        result.reason === 'not_configured'
          ? 503
          : result.reason === 'not_found'
            ? 404
            : 500;

      return NextResponse.json({ success: false, error }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PUSH] Test send failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to send test push' }, { status: 500 });
  }
}
