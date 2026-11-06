import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { boundedRequestBytes } from "@/lib/bounded-request";
import { sameOrigin, socialError, socialWallet } from "@/lib/social-request";
import { RETENTION_KINDS } from "@/lib/social-retention";
import {
  followingProjection,
  relationshipState,
  RetentionError,
  socialLibrary,
  writeRelationship,
} from "@/lib/social-retention-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const Ref = z.object({
  kind: z.enum(RETENTION_KINDS),
  key: z.string().trim().min(1).max(191),
});
const Body = Ref.extend({
  wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  action: z.enum(["follow", "unfollow", "save", "unsave"]),
}).strict();
const Area = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(25),
});
const json = (data: unknown) =>
  NextResponse.json(
    { success: true, data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
const failure = (error: unknown) =>
  error instanceof RetentionError
    ? socialError(error.message, error.status)
    : socialError("Social items could not load or save. Please retry.", 503);
export async function GET(req: NextRequest) {
  if (
    !checkRateLimit("social-retention-read:" + getClientIp(req), {
      limit: 120,
      windowMs: 60000,
    }).allowed
  )
    return socialError("Please wait before refreshing again.", 429);
  try {
    const query = Object.fromEntries(req.nextUrl.searchParams),
      view = query.view ?? "state";
    const wallet = query.wallet
      ? await socialWallet(req, query.wallet, "social:read")
      : null;
    if (query.wallet && !wallet)
      return socialError(
        "Confirm your account to load your follows and saves.",
        401,
      );
    if (view === "state") {
      const ref = Ref.safeParse(query);
      if (!ref.success) return socialError("Choose a valid item.");
      return json(await relationshipState(ref.data, wallet));
    }
    if (!wallet) return socialError("Sign in to open your private list.", 401);
    if (view === "library") return json(await socialLibrary(wallet));
    const area = Area.safeParse(query);
    if (view !== "following" || !area.success)
      return socialError("Choose a valid browsing area.");
    return json(await followingProjection(wallet, area.data));
  } catch (error) {
    return failure(error);
  }
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return socialError("Invalid origin.", 403);
  if (
    !checkRateLimit("social-retention:" + getClientIp(req), {
      limit: 100,
      windowMs: 60000,
    }).allowed
  )
    return socialError("Please wait before trying again.", 429);
  try {
    const bytes = await boundedRequestBytes(req, 2048);
    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return socialError("Invalid request.");
    }
    const body = Body.safeParse(raw);
    if (!body.success) return socialError("Choose a valid social action.");
    const wallet = await socialWallet(req, body.data.wallet, "social:write");
    if (!wallet) return socialError("Sign in to save this action.", 401);
    return json(await writeRelationship(wallet, body.data, body.data.action));
  } catch (error) {
    return error instanceof Error && error.message === "BODY_TOO_LARGE"
      ? socialError("This request is too large.", 413)
      : failure(error);
  }
}
