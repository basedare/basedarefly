import { NextRequest, NextResponse } from 'next/server';
import { getOnchainDare } from '@/lib/contracts/utils';

/**
 * GET /api/contracts/dares/[id]
 * Get dare data from on-chain contract
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Dare ID is required' },
        { status: 400 }
      );
    }

    const dareId = BigInt(id);
    const dare = await getOnchainDare(dareId);

    return NextResponse.json({
      success: true,
      data: dare,
    });
  } catch (error: any) {
    console.error('Error fetching on-chain dare:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch on-chain dare' },
      { status: 500 }
    );
  }
}

