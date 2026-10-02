import { NextResponse } from 'next/server';
import { getPaymentReadiness } from '@/lib/payment-readiness-server';
import { PAYMENT_UNAVAILABLE } from '@/lib/payment-readiness';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { ready, config } = await getPaymentReadiness();
  return NextResponse.json({ ready, chainId: config.chainId, bounty: config.bounty, usdc: config.usdc,
    message: ready ? null : PAYMENT_UNAVAILABLE,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
