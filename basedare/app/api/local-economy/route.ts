import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { boundedRequestBytes } from "@/lib/bounded-request";
import { socialWallet, sameOrigin } from "@/lib/social-request";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { EconomyCommand, EconomyError } from "@/lib/local-economy";
import { executeEconomy, readEconomy } from "@/lib/local-economy-server";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
function failed(e: unknown) {
  if (e instanceof EconomyError)
    return json({ success: false, error: e.message }, e.status);
  if (e && typeof e === "object" && "code" in e && e.code === "P2002")
    return json(
      {
        success: false,
        error: "This record already exists. Refresh to review it.",
      },
      409
    );
  return json(
    { success: false, error: "This could not load or save. Please retry." },
    503
  );
}
const Query = z.object({
  venue: z.string().max(100).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.1).max(100).optional(),
  node: z.string().max(100).optional(),
  session: z.string().max(100).optional(),
  opportunity: z.string().max(100).optional(),
});
export async function GET(req: NextRequest) {
  try {
    if (
      !checkRateLimit("economy-read:" + getClientIp(req), {
        limit: 90,
        windowMs: 60000,
      }).allowed
    )
      return json(
        { success: false, error: "Please wait before refreshing." },
        429
      );
    const query = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (
      !query.success ||
      (query.data.lat === undefined) !== (query.data.lng === undefined)
    )
      return json(
        { success: false, error: "Choose a valid browsing area." },
        400
      );
    const claimed = req.nextUrl.searchParams.get("wallet");
    const wallet = claimed
      ? await socialWallet(req, claimed, "social:read")
      : null;
    if (claimed && !wallet)
      return json(
        {
          success: false,
          error: "Confirm your account to read your private activity.",
        },
        401
      );
    return json({ success: true, data: await readEconomy(wallet, query.data) });
  } catch (e) {
    return failed(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req))
      return json(
        { success: false, error: "Use BaseDare to submit this action." },
        403
      );
    if (
      !checkRateLimit("economy-write:" + getClientIp(req), {
        limit: 60,
        windowMs: 60000,
      }).allowed
    )
      return json(
        { success: false, error: "Too many attempts. Please wait." },
        429
      );
    const bytes = await boundedRequestBytes(req, 16384);
    const input = JSON.parse(new TextDecoder().decode(bytes));
    if (!input || typeof input !== "object" || Array.isArray(input))
      return json({ success: false, error: "Invalid request." }, 400);
    const { wallet: claimed, ...raw } = input;
    const c = EconomyCommand.safeParse(raw);
    if (!c.success)
      return json(
        {
          success: false,
          error: c.error.issues[0]?.message ?? "Check the form.",
        },
        400
      );
    const wallet = await socialWallet(req, claimed, "social:write");
    if (!wallet)
      return json(
        { success: false, error: "Sign in and confirm your account." },
        401
      );
    return json({ success: true, data: await executeEconomy(wallet, c.data) });
  } catch (e) {
    if (e instanceof Error && e.message === "BODY_TOO_LARGE")
      return json({ success: false, error: "This request is too large." }, 413);
    if (e instanceof SyntaxError)
      return json({ success: false, error: "Invalid request." }, 400);
    return failed(e);
  }
}
