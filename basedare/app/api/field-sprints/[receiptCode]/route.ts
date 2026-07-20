import { NextResponse } from 'next/server';

import { buildVerifiedFieldSprintReceipt } from '@/lib/verified-field-sprint-server';

export async function GET(
  _request: Request,
  context: { params: Promise<{ receiptCode: string }> },
) {
  const { receiptCode } = await context.params;
  const receipt = await buildVerifiedFieldSprintReceipt(receiptCode);
  if (!receipt) return NextResponse.json({ success: false, error: 'Receipt not found or not complete.' }, { status: 404 });
  return NextResponse.json({ success: true, data: receipt }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } });
}
