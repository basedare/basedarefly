import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeAdminRequest,
  unauthorizedAdminResponse,
} from "@/lib/admin-auth";
import { boundedRequestBytes } from "@/lib/bounded-request";
import { sameOrigin, socialError } from "@/lib/social-request";
import {
  recordTakeoffAcceptance,
  saveTakeoffPilot,
  takeoffReport,
  TakeoffConflict,
} from "@/lib/takeoff-server";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    return NextResponse.json(
      { success: true, data: await takeoffReport() },
      { headers }
    );
  } catch {
    return socialError("Launch records unavailable. Refresh and retry.", 503);
  }
}
export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  if (!request.headers.get("origin") || !sameOrigin(request))
    return socialError("Invalid origin.", 403);
  try {
    const raw = z
      .object({
        action: z.enum(["savePilot", "acceptance"]),
        data: z.unknown(),
      })
      .strict()
      .parse(
        JSON.parse(
          new TextDecoder().decode(await boundedRequestBytes(request, 16384))
        )
      );
    const data =
      raw.action === "savePilot"
        ? await saveTakeoffPilot(raw.data, auth.walletAddress)
        : await recordTakeoffAcceptance(raw.data, auth.walletAddress);
    return NextResponse.json({ success: true, data }, { headers });
  } catch (e) {
    return socialError(
      e instanceof TakeoffConflict
        ? e.message
        : e instanceof z.ZodError
        ? "Review the required fields and permission references."
        : "Save not confirmed. Check current sources and refresh before retrying.",
      e instanceof TakeoffConflict ? 409 : 400
    );
  }
}
