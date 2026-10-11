import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { readWalletBalances } from '@/lib/wallet-balance';

export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const address = request.nextUrl.searchParams.get('address');
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: 'A valid wallet address is required.' }, { status: 400, headers });
  }
  try {
    const balances = await readWalletBalances(address);
    return NextResponse.json(balances, { status: balances.usdc === null && balances.eth === null ? 503 : 200, headers });
  } catch {
    return NextResponse.json({ error: 'Balance unavailable. Please refresh to retry.' }, { status: 503, headers });
  }
}
