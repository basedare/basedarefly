import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { getActionCenter } from '@/lib/action-center';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    const moderatorWalletHeader = request.headers.get('x-moderator-wallet')?.toLowerCase() ?? null;

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ success: false, error: 'Valid wallet address required' }, { status: 400 });
    }

    const data = await getActionCenter(wallet, {
      includeModeratorOps: moderatorWalletHeader === wallet.toLowerCase(),
    });
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ACTION CENTER] Fetch failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load action center' }, { status: 500 });
  }
}
