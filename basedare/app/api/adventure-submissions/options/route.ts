import { NextRequest, NextResponse } from "next/server";
import {
  momentAcceptanceOpen,
  momentReleaseOptions,
} from "@/lib/moment-release";
import { socialWallet, socialError } from "@/lib/social-request";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const selected = request.nextUrl.searchParams.get("wallet");
  const wallet = selected
    ? await socialWallet(request, selected, "adventure:read")
    : null;
  if (selected && !wallet)
    return socialError(
      "Verify your account to check private test access.",
      401
    );
  return NextResponse.json(
    {
      success: true,
      data: momentReleaseOptions(process.env, wallet),
      acceptanceOpen: momentAcceptanceOpen(),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
