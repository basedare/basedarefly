import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
    const data =
      q.length < 2
        ? []
        : await prisma.venue.findMany({
            where: {
              status: "ACTIVE",
              name: { contains: q, mode: "insensitive" },
            },
            select: { slug: true, name: true, city: true },
            take: 12,
          });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "Place search unavailable." },
      { status: 503 },
    );
  }
}
