import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { z } from 'zod';

import { endorsePlace, getPlaceEndorsementSnapshot, retractPlaceEndorsement } from '@/lib/place-endorsements';
import { checkRateLimit, createRateLimitHeaders, getClientIp, RateLimiters } from '@/lib/rate-limit';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BodySchema = z.object({ walletAddress: z.string().refine(isAddress, 'Valid wallet address required') });
const normalize = (value: string) => value.trim().toLowerCase();
const resource = (slug: string) => `venue:${slug}:worth-a-detour`;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const snapshot = await getPlaceEndorsementSnapshot(slug);
  if (!snapshot) return NextResponse.json({ success: false, error: 'Place not found.' }, { status: 404 });
  return NextResponse.json({ success: true, data: snapshot }, { headers: { 'Cache-Control': 'no-store' } });
}

async function authorize(request: NextRequest, slug: string, action: 'place:worth-a-detour:add' | 'place:worth-a-detour:retract') {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Invalid request.', status: 400 } as const;
  const walletAddress = normalize(parsed.data.walletAddress);
  const authorized = await getAuthorizedWalletForRequest(request, {
    walletAddress,
    action,
    resource: resource(slug),
  });
  if (!authorized) return { error: 'Wallet authorization required.', status: 401 } as const;
  const rateLimit = checkRateLimit(`${getClientIp(request)}:${authorized}`, { ...RateLimiters.strict, keyPrefix: 'place-endorsement' });
  if (!rateLimit.allowed) return { error: 'Too many attempts. Try again shortly.', status: 429, headers: createRateLimitHeaders(rateLimit) } as const;
  return { walletAddress: authorized, headers: createRateLimitHeaders(rateLimit) } as const;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await authorize(request, slug, 'place:worth-a-detour:add');
  if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status, headers: auth.headers ?? {} });
  try {
    await endorsePlace(slug, auth.walletAddress);
    const snapshot = await getPlaceEndorsementSnapshot(slug, auth.walletAddress);
    return NextResponse.json({ success: true, data: snapshot }, { headers: auth.headers });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to endorse this place.' }, { status: 409, headers: auth.headers });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await authorize(request, slug, 'place:worth-a-detour:retract');
  if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status, headers: auth.headers ?? {} });
  try {
    await retractPlaceEndorsement(slug, auth.walletAddress);
    const snapshot = await getPlaceEndorsementSnapshot(slug, auth.walletAddress);
    return NextResponse.json({ success: true, data: snapshot }, { headers: auth.headers });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to retract endorsement.' }, { status: 409, headers: auth.headers });
  }
}
