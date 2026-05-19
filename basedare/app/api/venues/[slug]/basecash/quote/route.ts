import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getBaseCashVenueBySlug } from '@/lib/basecash';
import {
  BASECASH_DENOMINATIONS_PHP,
  isBaseCashDenomination,
  quoteBaseCashVenueCredit,
} from '@/lib/basecash-shared';

const QuoteSchema = z.object({
  denominationPhp: z.number().int(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const venue = await getBaseCashVenueBySlug(slug);
    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = QuoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? 'Choose a supported BaseCash venue credit amount',
          data: { denominationsPhp: BASECASH_DENOMINATIONS_PHP },
        },
        { status: 400 }
      );
    }

    if (!isBaseCashDenomination(parsed.data.denominationPhp)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Choose a supported BaseCash venue credit amount',
          data: { denominationsPhp: BASECASH_DENOMINATIONS_PHP },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        venue,
        quote: quoteBaseCashVenueCredit(parsed.data.denominationPhp),
        rules: [
          'Valid only at this venue.',
          'No cash-out.',
          'No change given.',
          'Manual support for refunds.',
        ],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BASECASH_QUOTE] Failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to quote BaseCash venue credit' }, { status: 500 });
  }
}
