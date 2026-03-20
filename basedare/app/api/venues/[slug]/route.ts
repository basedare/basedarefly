import { NextResponse } from 'next/server';
import { getVenueDetailBySlug } from '@/lib/venues';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const venue = await getVenueDetailBySlug(slug);

    if (!venue) {
      return NextResponse.json(
        { success: false, error: 'Venue not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        venue,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_DETAIL] Query failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch venue detail' },
      { status: 500 }
    );
  }
}
