import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authorizeAdminRequest,
  unauthorizedAdminResponse,
} from "@/lib/admin-auth";
import { socialError } from "@/lib/social-request";
import { z } from "zod";
export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  const status =
    request.nextUrl.searchParams.get("status") === "APPROVED"
      ? "APPROVED"
      : "PENDING";
  const data = await prisma.adventureSubmission.findMany({
    where: { status },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return NextResponse.json(
    { success: true, data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function PUT(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  const parsed = z
    .object({
      id: z.string().min(1),
      status: z.enum(["APPROVED", "REJECTED"]),
      reason: z.string().min(3).max(300),
    })
    .safeParse(await request.json());
  if (!parsed.success) return socialError("Choose a decision and explain it.");
  const { id, status, reason } = parsed.data;
  const changed = await prisma.$transaction(async (tx) => {
    const result = await tx.adventureSubmission.updateMany({
      where: {
        id,
        status: {
          in: status === "APPROVED" ? ["PENDING"] : ["PENDING", "APPROVED"],
        },
      },
      data: {
        status,
        reviewReason: reason,
        reviewedBy: auth.walletAddress,
        reviewedAt: new Date(),
      },
    });
    if (result.count) {
      const post = await tx.adventureSubmission.findUniqueOrThrow({
        where: { id },
      });
      await tx.notification.create({
        data: {
          wallet: post.wallet,
          type: "ADVENTURE_REVIEW",
          title:
            status === "APPROVED"
              ? "Your adventure is live"
              : "Adventure review update",
          message: reason,
          link: "/adventures?shared=mine",
        },
      });
    }
    return result.count;
  });
  return changed
    ? NextResponse.json({ success: true })
    : socialError(
        "This submission has already changed. Refresh the list.",
        409,
      );
}
