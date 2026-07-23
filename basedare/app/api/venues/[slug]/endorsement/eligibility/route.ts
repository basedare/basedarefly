import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { z } from 'zod';

import { getPlaceEndorsementSnapshot } from '@/lib/place-endorsements';
import { checkRateLimit, createRateLimitHeaders, getClientIp, RateLimiters } from '@/lib/rate-limit';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BodySchema = z.object({ walletAddress: z.string().refine(isAddress, 'Valid wallet address required') });
const normalize = (value: string) => value.trim().toLowerCase();

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid request.' }, { status: 400 });
  }

  const walletAddress = normalize(parsed.data.walletAddress);
  const authorized = await getAuthorizedWalletForRequest(request, {
    walletAddress,
    action: 'place:worth-a-detour:check',
    resource: `venue:${slug}:worth-a-detour`,
  });
  if (!authorized) {
    return NextResponse.json({ success: false, error: 'Wallet authorization required.' }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`${getClientIp(request)}:${authorized}`, {
    ...RateLimiters.strict,
    keyPrefix: 'place-endorsement-eligibility',
  });
  const headers = createRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return NextResponse.json({ success: false, error: 'Too many attempts. Try again shortly.' }, { status: 429, headers });
  }

  const snapshot = await getPlaceEndorsementSnapshot(slug, authorized);
  if (!snapshot) return NextResponse.json({ success: false, error: 'Place not found.' }, { status: 404, headers });
  return NextResponse.json({ success: true, data: snapshot }, { headers: { ...headers, 'Cache-Control': 'no-store' } });
}
