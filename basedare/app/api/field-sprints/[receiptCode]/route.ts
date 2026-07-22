import { NextResponse } from 'next/server';

import { buildVerifiedFieldSprintReceipt } from '@/lib/verified-field-sprint-server';

export async function GET(
  _request: Request,
  context: { params: Promise<{ receiptCode: string }> },
) {
  const { receiptCode } = await context.params;
  const receipt = await buildVerifiedFieldSprintReceipt(receiptCode);
  const headers = {
    'Cache-Control': 'private, no-store, max-age=0',
    Pragma: 'no-cache',
  };
  if (!receipt) {
    return NextResponse.json(
      { success: false, error: 'Receipt not found or not complete.' },
      { status: 404, headers },
    );
  }
  return NextResponse.json({ success: true, data: receipt }, { headers });
}
