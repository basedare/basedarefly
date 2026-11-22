import { NextRequest, NextResponse } from "next/server";
import { socialWallet } from "@/lib/social-request";
import { EconomyError } from "@/lib/local-economy";
import {
  sessionRecordingPayload,
  recordingWithdrawalPayload,
} from "@/lib/session-recordings-server";
export const dynamic = "force-dynamic";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const wallet = await socialWallet(
      req,
      req.nextUrl.searchParams.get("wallet"),
      "social:read"
    );
    if (!wallet) throw new EconomyError("Confirm your account.", 401);
    const data = await (req.nextUrl.searchParams.get("mode") === "revoke"
      ? recordingWithdrawalPayload
      : sessionRecordingPayload)((await params).id, wallet);
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof EconomyError ? e.message : "Recording unavailable.",
      },
      {
        status: e instanceof EconomyError ? e.status : 503,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }
}
