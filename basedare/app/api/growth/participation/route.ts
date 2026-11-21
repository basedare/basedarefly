import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { discoveryQrReport } from "@/lib/discovery-qr-server";
import { loadParticipationScorecard } from "@/lib/participation-scorecard-server";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: NextRequest) {
  const expected = process.env.GROWTH_BRAIN_EXPORT_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  if (!expected || expected.length < 32)
    return NextResponse.json(
      { success: false, error: "Export unavailable." },
      { status: 503, headers }
    );
  const wanted = Buffer.from("Bearer " + expected),
    actual = Buffer.from(supplied);
  if (wanted.length !== actual.length || !timingSafeEqual(wanted, actual))
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401, headers }
    );
  try {
    const [qr, participation] = await Promise.all([
      discoveryQrReport(14),
      loadParticipationScorecard(),
    ]);
    return NextResponse.json(
      {
        success: true,
        data: {
          version: "basedare-growth-v1",
          scope: "sitewide",
          qr: qr.observation,
          participation,
        },
      },
      { headers }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Export unavailable." },
      { status: 503, headers }
    );
  }
}
