import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('includeAll') === 'true';

    // Fetch dares from database
    const dares = await prisma.dare.findMany({
      where: includeAll
        ? {} // Include all statuses for dashboard
        : { status: { in: ['VERIFIED', 'PENDING'] } }, // Only active for public feed
      orderBy: { createdAt: 'desc' }
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
