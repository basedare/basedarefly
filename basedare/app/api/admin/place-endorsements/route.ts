import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const Schema = z.object({ endorsementId: z.string().min(1), reason: z.string().trim().min(3).max(240) });

export async function PATCH(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    const input = Schema.parse(await request.json());
    const endorsement = await prisma.placeEndorsement.update({
      where: { id: input.endorsementId },
      data: { status: 'SUPPRESSED' },
      select: { id: true, status: true },
    });
    console.info('[PLACE_ENDORSEMENT_SUPPRESSED]', { endorsementId: endorsement.id, moderator: auth.walletAddress, reason: input.reason });
    return NextResponse.json({ success: true, data: endorsement }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to suppress endorsement.' }, { status: 400 });
  }
}
