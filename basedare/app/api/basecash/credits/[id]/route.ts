import { NextRequest, NextResponse } from 'next/server';

import {
  buildBaseCashReceiptUrl,
  getBaseCashCreditById,
  isMissingBaseCashTableError,
  mapBaseCashCredit,
  normalizeBaseCashReceiptCode,
} from '@/lib/basecash';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const credit = await getBaseCashCreditById(id);
    if (!credit) {
      return NextResponse.json({ success: false, error: 'BaseCash receipt not found' }, { status: 404 });
    }

    const code = request.nextUrl.searchParams.get('code');
    if (code && normalizeBaseCashReceiptCode(code) !== normalizeBaseCashReceiptCode(credit.receiptCode)) {
      return NextResponse.json({ success: false, error: 'Receipt code mismatch' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        credit: mapBaseCashCredit(credit),
        receiptUrl: buildBaseCashReceiptUrl(credit),
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
    console.error('[BASECASH_RECEIPT] Load failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load BaseCash receipt' }, { status: 500 });
  }
}
