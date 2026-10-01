import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { socialWallet, socialError, sameOrigin } from "@/lib/social-request";
import { changeFriend } from "@/lib/friends-server";
import { isAddress } from "viem";
import { z } from "zod";
export async function GET(req: NextRequest) {
  try {
    const wallet = await socialWallet(
      req,
      req.nextUrl.searchParams.get("wallet"),
      "friends:read",
    );
    if (!wallet) return socialError("Sign in to see friend requests.", 401);
    const data = await prisma.friendConnection.findMany({
      where: { OR: [{ requester: wallet }, { recipient: wallet }] },
      take: 200,
      orderBy: { updatedAt: "desc" },
    });
    const profiles = await prisma.streamerTag.findMany({
      where: {
        walletAddress: { in: data.flatMap((c) => [c.requester, c.recipient]) },
        status: { in: ["ACTIVE", "VERIFIED"] },
      },
      select: { walletAddress: true, tag: true },
    });
    const named = data.map((c) => ({
      ...c,
      otherTag:
        profiles.find(
          (p) =>
            p.walletAddress ===
            (c.requester === wallet ? c.recipient : c.requester),
        )?.tag ?? null,
    }));
    return NextResponse.json(
      { success: true, data: named },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return socialError("Connections could not be loaded.", 503);
  }
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return socialError("Invalid origin.", 403);
  try {
    const parsed = z
      .object({
        wallet: z.string(),
        target: z.string().refine(isAddress),
        action: z.enum(["request", "accept", "remove"]),
      })
      .safeParse(await req.json());
    if (!parsed.success) return socialError("Invalid connection request.");
    const wallet = await socialWallet(req, parsed.data.wallet, "friends:write");
    if (!wallet) return socialError("Sign in first.", 401);
    await changeFriend(
      wallet,
      parsed.data.target.toLowerCase(),
      parsed.data.action,
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return socialError(
      error instanceof Error ? error.message : "Could not update connection.",
    );
  }
}
