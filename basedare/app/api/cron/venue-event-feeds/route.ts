import { NextRequest, NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/api-auth";
import { syncVenueEventFeeds } from "@/lib/venue-event-feeds";

export const maxDuration = 60;

async function handleVenueEventFeedSync(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;
  try {
    const result = await syncVenueEventFeeds();
    if (result.failed > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `${result.failed} venue feed sync${result.failed === 1 ? "" : "s"} failed.`,
          data: result,
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[CRON][ISLAND_PULSE_FEEDS] failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync venue event feeds." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleVenueEventFeedSync(request);
}

export async function POST(request: NextRequest) {
  return handleVenueEventFeedSync(request);
}
