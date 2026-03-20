import { NextResponse } from 'next/server';
import { getVenueQrPayloadByVenueId } from '@/lib/venues';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_QR] Failed:', message);
    return NextResponse.json(
      { success: false, error: 'Unable to fetch venue QR right now' },
      { status: 500 }
    );
  }
}
