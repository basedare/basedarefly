import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { boundedRequestBytes } from "@/lib/bounded-request";
import { getDiscoveryRelations } from "@/lib/discovery-relations-server";
import { getViewerWallet } from "@/lib/meetups-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/social-request";

export const dynamic = "force-dynamic";
const Reference = z
  .object({
    kind: z.enum(["VENUE", "MOMENT", "STORY", "PERSON"]),
    key: z.string().trim().min(1).max(191),
  })
  .strict();
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
const failure = (error: string, status: number) =>
  json({ success: false, error }, status);

/** POST keeps the bounded read request out of URL history; it never writes data. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return failure("Invalid origin.", 403);
  if (
    !checkRateLimit(getClientIp(request), {
      keyPrefix: "discovery-related",
      limit: 60,
      windowMs: 60000,
    }).allowed
  )
    return failure("Please wait before refreshing again.", 429);
  try {
    const bytes = await boundedRequestBytes(request, 4096);
    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return failure("Choose a valid item.", 400);
    }
    const ref = Reference.safeParse(raw);
    if (!ref.success) return failure("Choose a valid item.", 400);
    // Only the real session can select a viewer's private block policy.
    const wallet = await getViewerWallet();
    const data = await getDiscoveryRelations(ref.data, wallet);
    if (!data) return failure("This item is unavailable.", 404);
    return json({ success: true, data });
  } catch (error) {
    return error instanceof Error && error.message === "BODY_TOO_LARGE"
      ? failure("This request is too large.", 413)
      : failure("Related items could not load. Please retry.", 503);
  }
}
