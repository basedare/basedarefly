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
  } catch (error: any) {
    console.error('Error fetching protocol config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch protocol config' },
      { status: 500 }
    );
  }
}



