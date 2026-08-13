import { NextResponse } from "next/server";

import { getPublicVenueEvent } from "@/lib/venue-events-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await getPublicVenueEvent(id);
    if (!event)
      return NextResponse.json(
        { success: false, error: "Event not found." },
        { status: 404 }
      );
    return NextResponse.json({ success: true, data: { event } });
  } catch (error) {
    console.error("[ISLAND_PULSE] event detail failed:", error);
    return NextResponse.json(
      { success: false, error: "Event unavailable." },
      { status: 500 }
    );
  }
}
