import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { isMissingBaseCashTableError, mapBaseCashCredit, markBaseCashCreditPaid } from '@/lib/basecash';

const UpdateCreditSchema = z.object({
  action: z.literal('mark_paid'),
  txHash: z.string().trim().max(180).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateCreditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid credit update' }, { status: 400 });
    }

    const credit = await markBaseCashCreditPaid({
      id,
      txHash: parsed.data.txHash,
      actor: auth.walletAddress,
    });

    if (!credit) {
      return NextResponse.json({ success: false, error: 'Pending BaseCash credit not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        credit: mapBaseCashCredit(credit),
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
    console.error('[ADMIN_BASECASH] Credit update failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to update BaseCash credit' }, { status: 500 });
  }
}
