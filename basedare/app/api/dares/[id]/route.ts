import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/dares/[id]
 * Get a single dare by ID
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

    // Fetch dare from Prisma
    const dare = await prisma.dare.findUnique({
      where: { id },
    });

    if (!dare) {
      return NextResponse.json(
        { success: false, error: 'Dare not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: dare,
    });
  } catch (error: any) {
    console.error('Error fetching dare:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dare' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/dares/[id]
 * Update a dare
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Dare ID is required' },
        { status: 400 }
      );
    }

    // Update dare in Prisma
    const updatedDare = await prisma.dare.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({
      success: true,
      data: updatedDare,
    });
  } catch (error: any) {
    console.error('Error updating dare:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update dare' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dares/[id]
 * Delete a dare (if needed)
 */
export async function DELETE(
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

    // Delete dare from Prisma
    await prisma.dare.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Dare deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting dare:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete dare' },
      { status: 500 }
    );
  }
}

