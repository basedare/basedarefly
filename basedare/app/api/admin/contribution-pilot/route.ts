import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  authorizeAdminRequest,
  unauthorizedAdminResponse,
} from "@/lib/admin-auth";
import { boundedRequestBytes } from "@/lib/bounded-request";
import {
  applyPilotCommand,
  getPilotAdminSnapshot,
  PilotError,
} from "@/lib/contribution-pilot-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/social-request";

export const dynamic = "force-dynamic";
const response = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    const denied = unauthorizedAdminResponse(auth);
    denied.headers.set("Cache-Control", "private, no-store");
    return denied;
  }
  try {
    return response({ success: true, data: await getPilotAdminSnapshot() });
  } catch {
    return response(
      { success: false, error: "The contribution pilot could not load." },
      503
    );
  }
}
export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    const denied = unauthorizedAdminResponse(auth);
    denied.headers.set("Cache-Control", "private, no-store");
    return denied;
  }
  if (!sameOrigin(request))
    return response({ success: false, error: "Origin mismatch." }, 403);
  if (
    !checkRateLimit(getClientIp(request), {
      keyPrefix: "contribution-pilot-admin",
      limit: 60,
      windowMs: 60000,
    }).allowed
  )
    return response(
      { success: false, error: "Please wait before trying again." },
      429
    );
  try {
    const raw = JSON.parse(
      new TextDecoder().decode(await boundedRequestBytes(request, 8192))
    );
    return response({
      success: true,
      data: await applyPilotCommand(raw, auth.walletAddress),
    });
  } catch (error) {
    if (error instanceof PilotError)
      return response({ success: false, error: error.message }, error.status);
    if (error instanceof ZodError || error instanceof SyntaxError)
      return response(
        {
          success: false,
          error: "Use the supported campaign or evidence fields.",
        },
        400
      );
    if (error instanceof Error && error.message === "BODY_TOO_LARGE")
      return response({ success: false, error: "Request is too large." }, 413);
    return response(
      { success: false, error: "The contribution change could not be saved." },
      503
    );
  }
}
