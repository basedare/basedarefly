import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { isMissingBaseCashTableError, markBaseCashVenueSettled } from '@/lib/basecash';

const SettlementSchema = z.object({
  settlementReference: z.string().trim().max(180).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const { venueId } = await params;
    const body = await request.json();
    const parsed = SettlementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid settlement' }, { status: 400 });
    }

    const updated = await markBaseCashVenueSettled({
      venueId,
      settlementReference: parsed.data.settlementReference,
      actor: auth.walletAddress,
    });

    return NextResponse.json({
      success: true,
      data: {
        updated,
      },
    });
  } catch (error) {
    if (isMissingBaseCashTableError(error)) {
      return NextResponse.json(
        { success: false, error: 'BaseCash venue credit ledger is not installed yet' },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_BASECASH] Settlement failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to mark BaseCash settlement complete' }, { status: 500 });
  }
}
