import { NextRequest, NextResponse } from 'next/server';
import { base44 } from '@/lib/base44Client';

/**
 * GET /api/dares
 * List all dares with optional filtering and sorting
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sortBy') || '-created_date'; // Default: newest first
    const status = searchParams.get('status'); // Optional filter by status
    const streamer = searchParams.get('streamer'); // Optional filter by streamer
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch dares from Base44
    let dares = await base44.entities.Dare.list(sortBy);

    // Apply filters
    if (status) {
      dares = dares.filter((dare: any) => dare.status === status);
    }
    if (streamer) {
      dares = dares.filter((dare: any) => dare.streamer_name === streamer || dare.streamer === streamer);
    }

    // Apply pagination
    const paginatedDares = dares.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedDares,
      pagination: {
        total: dares.length,
        limit,
        offset,
        hasMore: offset + limit < dares.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching dares:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dares' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dares
 * Create a new dare
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      stake_amount,
      expiry_timer,
      streamer_name,
      streamer_address,
      category,
      difficulty,
      image_url,
      created_by,
    } = body;

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: 'Title and description are required' },
        { status: 400 }
      );
    }

    if (stake_amount && stake_amount < 5) {
      return NextResponse.json(
        { success: false, error: 'Minimum stake amount is $5' },
        { status: 400 }
      );
    }

    // Prepare dare data
    const dareData: any = {
      title,
      description,
      status: 'pending',
      stake_amount: stake_amount || 0,
      expiry_timer: expiry_timer || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_date: new Date().toISOString(),
    };

    // Add optional fields
    if (streamer_name) dareData.streamer_name = streamer_name;
    if (streamer_address) dareData.streamer_address = streamer_address;
    if (category) dareData.category = category;
    if (difficulty) dareData.difficulty = difficulty;
    if (image_url) dareData.image_url = image_url;
    if (created_by) dareData.created_by = created_by;

    // Create dare in Base44
    const newDare = await base44.entities.Dare.create(dareData);

    return NextResponse.json({
      success: true,
      data: newDare,
    });
  } catch (error: any) {
    console.error('Error creating dare:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create dare' },
      { status: 500 }
    );
  }
}



