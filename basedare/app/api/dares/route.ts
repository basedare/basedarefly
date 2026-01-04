import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Adjust path to '@/src/lib/prisma' if needed

export async function GET() {
  try {
    // 1. Fetch real data from the "Brain"
    const dares = await prisma.dare.findMany({
      where: {
        status: { in: ['VERIFIED', 'PENDING'] } // Show only active/verified stuff
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Translate it for the "Body" (Frontend)
    const formattedDares = dares.map(dare => ({
      id: dare.id,
      description: dare.title,           // Map 'title' -> 'description'
      stake_amount: dare.bounty,         // Map 'bounty' -> 'stake_amount'
      streamer_name: dare.streamerHandle,// Map 'streamerHandle' -> 'streamer_name'
      status: dare.status,
      video_url: dare.videoUrl,
      // Add defaults for UI fields not in DB yet
      expiry_timer: "24h", 
      image_url: "" 
    }));

    return NextResponse.json(formattedDares);
  } catch (error) {
    console.error("Database fetch error:", error);
    return NextResponse.json({ error: 'Failed to fetch dares' }, { status: 500 });
  }
}
