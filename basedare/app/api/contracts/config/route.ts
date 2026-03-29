import { NextResponse } from 'next/server';
import { getProtocolConfig } from '@/lib/contracts/utils';

/**
 * GET /api/contracts/config
 * Get protocol configuration (fees, oracle address, etc.)
 */
export async function GET() {
  try {
    const config = await getProtocolConfig();

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch contract config';
    console.error('Error fetching protocol config:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}


