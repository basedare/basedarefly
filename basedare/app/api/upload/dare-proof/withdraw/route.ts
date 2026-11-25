import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';
import { boundedRequestBytes } from '@/lib/bounded-request';
import { DARE_PROOF_TICKET } from '@/lib/dare-proof-media';

export async function POST(request: NextRequest) {
  const parsed = await boundedRequestBytes(request, 4096).then(bytes => z.object({ dareId: z.string().min(1).max(191), walletAddress: z.string().max(42) }).strict().safeParse(JSON.parse(new TextDecoder().decode(bytes)))).catch(() => null);
  if (!parsed?.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { dareId, walletAddress } = parsed.data;
  const wallet = await getAuthorizedWalletForRequest(request, { walletAddress, action: 'dare:clip-withdraw', resource: dareId, allowWalletSession: false });
  if (!wallet) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  // The original permission owner can withdraw even if their Dare assignment changed.
  const changed = await prisma.founderEvent.updateMany({ where: { eventType: DARE_PROOF_TICKET, subjectType: 'Dare', subjectId: dareId, actor: wallet, status: 'ATTACHED', metadataJson: { path: ['consent', 'processing'], equals: true } }, data: { status: 'REVOKED' } });
  return NextResponse.json({ success: true, withdrawn: changed.count > 0 }, { headers: { 'Cache-Control': 'no-store' } });
}
