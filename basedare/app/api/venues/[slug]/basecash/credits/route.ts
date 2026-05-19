import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeBaseCashVenueRequest } from '@/lib/basecash-auth';
import {
  baseCashPilotMode,
  buildBaseCashReceiptUrl,
  createBaseCashVenueCredit,
  getBaseCashVenueBySlug,
  isMissingBaseCashTableError,
  listBaseCashVenueCredits,
  mapBaseCashCredit,
  summarizeBaseCashVenue,
} from '@/lib/basecash';
import {
  BASECASH_DENOMINATIONS_PHP,
  isBaseCashDenomination,
  quoteBaseCashVenueCredit,
} from '@/lib/basecash-shared';

const CreateCreditSchema = z.object({
  denominationPhp: z.number().int(),
  buyerWallet: z.string().trim().min(4).max(120),
  buyerTag: z.string().trim().max(80).optional().nullable(),
  source: z.string().trim().max(80).optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const venue = await getBaseCashVenueBySlug(slug);
    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    const auth = await authorizeBaseCashVenueRequest(request, venue);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const query = request.nextUrl.searchParams.get('query');
    const credits = await listBaseCashVenueCredits(venue.id, { query, limit: query ? 8 : 18 });
    return NextResponse.json({
      success: true,
      data: {
        summary: summarizeBaseCashVenue(venue, credits),
        credits: credits.map(mapBaseCashCredit),
      },
    });
  } catch (error) {
    if (isMissingBaseCashTableError(error)) {
      return NextResponse.json({
        success: true,
        data: {
          summary: null,
          credits: [],
          setupRequired: true,
        },
      });
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BASECASH_CREDITS] List failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load BaseCash venue credits' }, { status: 500 });
  }
}

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
    const parsed = CreateCreditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? 'Choose a supported BaseCash amount',
          data: { denominationsPhp: BASECASH_DENOMINATIONS_PHP },
        },
        { status: 400 }
      );
    }

    if (!isBaseCashDenomination(parsed.data.denominationPhp)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Choose a supported BaseCash amount',
          data: { denominationsPhp: BASECASH_DENOMINATIONS_PHP },
        },
        { status: 400 }
      );
    }

    const credit = await createBaseCashVenueCredit({
      venue,
      buyerWallet: parsed.data.buyerWallet,
      buyerTag: parsed.data.buyerTag,
      denominationPhp: parsed.data.denominationPhp,
      source: parsed.data.source,
    });

    return NextResponse.json({
      success: true,
      data: {
        credit: mapBaseCashCredit(credit),
        quote: quoteBaseCashVenueCredit(parsed.data.denominationPhp),
        receiptUrl: buildBaseCashReceiptUrl(credit),
        pilotMode: baseCashPilotMode(),
      },
    });
  } catch (error) {
    if (isMissingBaseCashTableError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: 'BaseCash venue credit ledger is not installed yet',
          code: 'BASECASH_MIGRATION_REQUIRED',
        },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = /unsupported|wallet|required|cap/i.test(message) ? 400 : 500;
    console.error('[BASECASH_CREDITS] Create failed:', message);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
