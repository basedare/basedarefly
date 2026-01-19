import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAddress } from 'viem';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('includeAll') === 'true';
    const userAddress = searchParams.get('userAddress');

    // Build where clause
    type WhereClause = {
      status?: { in: string[] };
      stakerAddress?: string;
    };

    const where: WhereClause = {};

    // Filter by status unless includeAll is true
    if (!includeAll) {
      where.status = { in: ['VERIFIED', 'PENDING'] };
    }

    // Filter by user address if provided and valid
    if (userAddress && isAddress(userAddress)) {
      where.stakerAddress = userAddress.toLowerCase();
    }

    // Fetch dares from database
    const dares = await prisma.dare.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit results for performance
    });

    // If includeAll (Dashboard mode), return full dare objects
    if (includeAll) {
      return NextResponse.json(dares);
    }

    // Otherwise, format for the public feed (legacy format)
    const formattedDares = dares.map(dare => ({
      id: dare.id,
      description: dare.title,
      stake_amount: dare.bounty,
      streamer_name: dare.streamerHandle,
      status: dare.status,
      video_url: dare.videoUrl,
      expires_at: dare.expiresAt?.toISOString() || null,
      short_id: dare.shortId || dare.id.slice(0, 8),
      image_url: ""
    }));

    return NextResponse.json(formattedDares);
  } catch (error) {
    console.error("Database fetch error:", error);
    return NextResponse.json({ error: 'Failed to fetch dares' }, { status: 500 });
  }
}
