import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { z } from 'zod';

import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';
import {
  composePassport,
  updatePassport,
  MISSION_STYLE_OPTIONS,
  AVAILABILITY_OPTIONS,
} from '@/lib/creator-passport';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const walletSchema = z.string().refine((value) => isAddress(value), 'Invalid wallet address');

const patchSchema = z.object({
  walletAddress: walletSchema,
  homeZone: z.string().trim().max(80).nullish(),
  vibeLine: z.string().trim().max(140).nullish(),
  missionStyles: z.array(z.enum(MISSION_STYLE_OPTIONS)).max(5).optional(),
  availability: z.array(z.enum(AVAILABILITY_OPTIONS)).max(AVAILABILITY_OPTIONS.length).optional(),
  radiusKm: z.number().int().min(1).max(100).nullish(),
  pingsEnabled: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const walletParam = request.nextUrl.searchParams.get('wallet');
  const parsed = walletSchema.safeParse(walletParam);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Valid wallet required' }, { status: 400 });
  }

  try {
    const data = await composePassport(parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[CREATOR_PASSPORT] GET failed', error);
    return NextResponse.json({ success: false, error: 'Failed to load passport' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { walletAddress, ...patch } = parsed.data;

  const authorized = await getAuthorizedWalletForRequest(request, {
    walletAddress,
    action: 'creator:passport:update',
    resource: `passport:${walletAddress.toLowerCase()}`,
  });
  if (!authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await updatePassport(authorized, patch);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[CREATOR_PASSPORT] PATCH failed', error);
    return NextResponse.json({ success: false, error: 'Failed to update passport' }, { status: 500 });
  }
}
