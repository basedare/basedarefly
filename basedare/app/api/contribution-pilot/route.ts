import { NextRequest, NextResponse } from "next/server";
import {
  contributionPilotEnabled,
  pilotIdSchema,
} from "@/lib/contribution-pilot";
import { getPublicPilot } from "@/lib/contribution-pilot-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const unavailable = () =>
  NextResponse.json(
    { success: false, error: "This campaign is unavailable." },
    { status: 404, headers: { "Cache-Control": "private, no-store" } }
  );
export async function GET(request: NextRequest) {
  if (!contributionPilotEnabled()) return unavailable();
  const parsed = pilotIdSchema.safeParse(
    request.nextUrl.searchParams.get("campaign")
  );
  if (
    !parsed.success ||
    !checkRateLimit(getClientIp(request), {
      keyPrefix: "contribution-pilot-read",
      limit: 30,
      windowMs: 60000,
    }).allowed
  )
    return unavailable();
  try {
    const data = await getPublicPilot(parsed.data);
    return data
      ? NextResponse.json(
          { success: true, data },
          { headers: { "Cache-Control": "private, no-store" } }
        )
      : unavailable();
  } catch {
    return unavailable();
  }
}
