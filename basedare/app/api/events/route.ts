import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  checkRateLimit,
  createRateLimitHeaders,
  getClientIp,
} from "@/lib/rate-limit";
import { getUpcomingVenueEvents } from "@/lib/venue-events-server";

const QuerySchema = z.object({
  window: z.enum(["tonight", "week", "month"]).optional().default("week"),
  venueSlug: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(24),
});

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`venue-events:${getClientIp(request)}`, {
    limit: 90,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests." },
      { status: 429, headers: createRateLimitHeaders(rate) }
    );
  }
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );
  if (!parsed.success)
    return NextResponse.json(
      { success: false, error: "Invalid event query." },
      { status: 400 }
    );
  try {
    const events = await getUpcomingVenueEvents(parsed.data);
    return NextResponse.json({ success: true, data: { events } });
  } catch (error) {
    console.error("[ISLAND_PULSE] public feed failed:", error);
    return NextResponse.json(
      { success: false, error: "Island Pulse is unavailable." },
      { status: 500 }
    );
  }
}
