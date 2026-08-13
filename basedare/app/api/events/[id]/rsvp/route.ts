import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAddress } from "viem";

import { resolveHostBaretag } from "@/lib/meetups-server";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  createRateLimitHeaders,
  getClientIp,
} from "@/lib/rate-limit";

const BodySchema = z.object({
  walletAddress: z
    .string()
    .refine((value) => isAddress(value), "Valid wallet required")
    .optional(),
  status: z.enum(["INTERESTED", "GOING"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rate = checkRateLimit(`event-rsvp:${getClientIp(request)}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.allowed)
    return NextResponse.json(
      { success: false, error: "Too many RSVP attempts." },
      { status: 429, headers: createRateLimitHeaders(rate) }
    );
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { success: false, error: "Choose Interested or Going." },
      { status: 400 }
    );
  const baretag = await resolveHostBaretag(
    request,
    parsed.data.walletAddress ?? null,
    {
      action: "venue-event:rsvp",
      resource: `venue-event:${id}`,
    }
  );
  if (!baretag)
    return NextResponse.json(
      { success: false, error: "Claim and verify a Baretag to join." },
      { status: 401 }
    );

  try {
    const counts = await prisma.$transaction(async (tx) => {
      const event = await tx.venueEvent.findFirst({
        where: {
          AND: [
            { OR: [{ id }, { slug: id }] },
            { status: "PUBLISHED", expiresAt: { gt: new Date() } },
            {
              OR: [
                { endsAt: { gte: new Date() } },
                {
                  endsAt: null,
                  startsAt: {
                    gte: new Date(Date.now() - 4 * 60 * 60 * 1000),
                  },
                },
              ],
            },
          ],
        },
        select: { id: true },
      });
      if (!event) throw new Error("EVENT_CLOSED");
      await tx.venueEventRsvp.upsert({
        where: {
          eventId_baretagId: { eventId: event.id, baretagId: baretag.id },
        },
        create: {
          eventId: event.id,
          baretagId: baretag.id,
          status: parsed.data.status,
        },
        update: { status: parsed.data.status },
      });
      const grouped = await tx.venueEventRsvp.groupBy({
        by: ["status"],
        where: { eventId: event.id },
        _count: { _all: true },
      });
      return {
        interested:
          grouped.find((row) => row.status === "INTERESTED")?._count._all ?? 0,
        going: grouped.find((row) => row.status === "GOING")?._count._all ?? 0,
      };
    });
    return NextResponse.json({
      success: true,
      data: { status: parsed.data.status, counts },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EVENT_CLOSED") {
      return NextResponse.json(
        { success: false, error: "This event is no longer open." },
        { status: 409 }
      );
    }
    console.error("[ISLAND_PULSE] RSVP failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not save your RSVP." },
      { status: 500 }
    );
  }
}
