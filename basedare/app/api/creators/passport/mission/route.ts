import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { z } from 'zod';

import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';
import { recordExplicitMission, EXPLICIT_MISSIONS, type MissionId } from '@/lib/creator-passport';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const bodySchema = z.object({
  walletAddress: z.string().refine((value) => isAddress(value), 'Invalid wallet address'),
  missionId: z.enum(EXPLICIT_MISSIONS as [MissionId, ...MissionId[]]),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { walletAddress, missionId } = parsed.data;

  const authorized = await getAuthorizedWalletForRequest(request, {
    walletAddress,
    action: 'creator:passport:mission',
    resource: `passport:${walletAddress.toLowerCase()}:${missionId}`,
  });
  if (!authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await recordExplicitMission(authorized, missionId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[CREATOR_PASSPORT] mission failed', error);
    return NextResponse.json({ success: false, error: 'Failed to record mission' }, { status: 500 });
  }
}
