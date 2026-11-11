import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { boundedRequestBytes } from "@/lib/bounded-request";
import { sameOrigin } from "@/lib/social-request";
import {
  checkRateLimit,
  createRateLimitHeaders,
  getClientIp,
} from "@/lib/rate-limit";
import { isValidTimeZone } from "@/lib/tonight";
import { discoverPublicExperiences } from "@/lib/discovery-intelligence-server";

const Input = z
  .object({
    query: z.string().trim().min(1).max(240),
    lat: z.number().finite().min(-85.051129).max(85.051129),
    lng: z.number().finite().min(-180).max(180),
    radiusKm: z.number().min(0.1).max(25),
    areaLabel: z.string().trim().min(1).max(100),
    timeZone: z.string().max(80).refine(isValidTimeZone).optional(),
  })
  .strict();
const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { success: false, error: "Invalid origin." },
      { status: 403, headers }
    );
  if (process.env.DISCOVERY_INTELLIGENCE_ENABLED === "false")
    return NextResponse.json(
      {
        success: false,
        error:
          "Discovery suggestions are paused. You can still use the map and existing PeeBear picks.",
      },
      { status: 503, headers }
    );
  const rate = checkRateLimit("discovery:" + getClientIp(request), {
    limit: 30,
    windowMs: 60000,
  });
  if (!rate.allowed)
    return NextResponse.json(
      { success: false, error: "Too many searches. Try again shortly." },
      { status: 429, headers: { ...headers, ...createRateLimitHeaders(rate) } }
    );
  let input: z.infer<typeof Input>;
  try {
    input = Input.parse(
      JSON.parse(
        new TextDecoder().decode(await boundedRequestBytes(request, 4096))
      )
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Choose a valid map area and a short discovery request.",
      },
      { status: 400, headers }
    );
  }
  try {
    const { query, lat, lng, radiusKm, areaLabel: label, timeZone } = input;
    return NextResponse.json(
      {
        success: true,
        data: await discoverPublicExperiences(query, {
          lat: Math.round(lat * 1000) / 1000,
          lng: Math.round(lng * 1000) / 1000,
          radiusKm,
          label,
          timeZone,
        }),
      },
      { headers }
    );
  } catch {
    // Do not log free text, precise browsing coordinates or private source data.
    return NextResponse.json(
      {
        success: false,
        error:
          "Suggestions could not load. Please retry; the map and free adventures are still available.",
      },
      { status: 503, headers }
    );
  }
}
