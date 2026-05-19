import { NextRequest, NextResponse } from 'next/server';

import { authorizeBaseCashVenueRequest } from '@/lib/basecash-auth';
import {
  getBaseCashCreditByIdOrCode,
  getBaseCashVenueBySlug,
  isMissingBaseCashTableError,
  mapBaseCashCredit,
  redeemBaseCashCredit,
} from '@/lib/basecash';

async function readJsonBody(request: NextRequest) {
  try {
    return (await request.json()) as { code?: string; redeemer?: string };
  } catch {
    return {};
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await readJsonBody(request);
    const idOrCode = body.code?.trim() || id;
    const credit = await getBaseCashCreditByIdOrCode(idOrCode);
    if (!credit) {
      return NextResponse.json({ success: false, error: 'BaseCash credit not found' }, { status: 404 });
    }

    const venue = await getBaseCashVenueBySlug(credit.venueSlug);
    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    const auth = await authorizeBaseCashVenueRequest(request, venue);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const result = await redeemBaseCashCredit({
      idOrCode,
      expectedVenueId: venue.id,
      redeemer: body.redeemer?.trim() || auth.actor,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.reason,
          data: { credit: result.credit ? mapBaseCashCredit(result.credit) : null },
        },
        { status: result.reason === 'Credit not found' ? 404 : 409 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        credit: mapBaseCashCredit(result.credit),
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
    console.error('[BASECASH_REDEEM] Failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to redeem BaseCash credit' }, { status: 500 });
  }
}
