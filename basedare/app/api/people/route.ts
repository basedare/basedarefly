import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET(req: NextRequest) {
  try {
    const search = (req.nextUrl.searchParams.get("q") ?? "")
      .trim()
      .replace(/^@/, "")
      .slice(0, 60);
    const data = await prisma.streamerTag.findMany({
      where: {
        status: { in: ["ACTIVE", "VERIFIED"] },
        ...(search
          ? { tag: { contains: search, mode: "insensitive" as const } }
          : {}),
      },
      select: { tag: true, bio: true, walletAddress: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return NextResponse.json(
      { success: true, data: data.filter(person => {
        const tag = person.tag.toLowerCase().replace(/^@/, "");
        return !/^(smoke[-_]?test|test|demo|e2e|qa|sample|placeholder)$/.test(tag) && !tag.includes("smoketest");
      }) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "People could not be loaded. Please retry." },
      { status: 503 },
    );
  }
}
