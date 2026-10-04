import { NextRequest, NextResponse } from 'next/server';
import { authorizeVenueOperator } from '@/lib/venue-operator-auth';
import { getVenueQrPayloadByVenueId } from '@/lib/venues';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const denied = await authorizeVenueOperator(request, id);
    if (denied) return denied;
    const qr = await getVenueQrPayloadByVenueId(id);

    if (!qr) {
      return NextResponse.json(
        { success: false, error: 'No live QR session available for this venue' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: qr,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_QR] Failed:', message);
    return NextResponse.json(
      { success: false, error: 'Unable to fetch venue QR right now' },
      { status: 500 }
    );
  }
}
