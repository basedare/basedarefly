import { NextResponse } from "next/server";
import { momentReleaseOptions } from "@/lib/moment-release";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(
    { success: true, data: momentReleaseOptions() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
