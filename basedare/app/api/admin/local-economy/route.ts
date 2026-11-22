import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  authorizeAdminRequest,
  unauthorizedAdminResponse,
} from "@/lib/admin-auth";
import { sameOrigin } from "@/lib/social-request";
import { boundedRequestBytes } from "@/lib/bounded-request";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    const data = await prisma.founderEvent.findMany({
      where: { eventType: "LOCAL_ECONOMY_REPORT", status: "NEW" },
      orderBy: { createdAt: "asc" },
      take: 101,
    });
    return json({
      success: true,
      data: data.slice(0, 100),
      limited: data.length > 100,
    });
  } catch {
    return json({ success: false, error: "Reports could not load." }, 503);
  }
}
const Body = z
  .object({
    reportId: z.string().min(1).max(100),
    decision: z.enum(["DISMISS", "WITHDRAW"]),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();
export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  if (!sameOrigin(request))
    return json({ success: false, error: "Use the admin page." }, 403);
  try {
    const parsed = Body.safeParse(
      JSON.parse(new TextDecoder().decode(await boundedRequestBytes(request, 4096)))
    );
    if (!parsed.success)
      return json(
        { success: false, error: "Choose a report, decision and reason." },
        400
      );
    const { reportId, decision, reason } = parsed.data;
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('local-economy-v1'))::text`;
      const report = await tx.founderEvent.findFirst({
        where: {
          id: reportId,
          eventType: "LOCAL_ECONOMY_REPORT",
          status: "NEW",
        },
      });
      if (!report?.subjectId) throw Error("REPORT_CHANGED");
      if (decision === "WITHDRAW") {
        if (report.subjectType === "NODE") {
          await tx.localNode.update({
            where: { id: report.subjectId },
            data: { status: "WITHDRAWN", publicConsent: false },
          });
          await tx.localOpportunity.updateMany({
            where: {
              OR: [
                { nodeId: report.subjectId },
                { targetNodeId: report.subjectId },
              ],
            },
            data: { status: "CANCELLED" },
          });
          const sessions = await tx.baseDareSession.findMany({
            where: { nodeId: report.subjectId },
            select: { meetupId: true },
          });
          await tx.meetup.updateMany({
            where: { id: { in: sessions.map((s) => s.meetupId) } },
            data: { status: "cancelled" },
          });
        } else if (report.subjectType === "OPPORTUNITY") {
          await tx.localOpportunity.update({
            where: { id: report.subjectId },
            data: { status: "CANCELLED" },
          });
          await tx.opportunityRequest.updateMany({
            where: {
              opportunityId: report.subjectId,
              status: { in: ["PENDING", "CONFIRMED"] },
            },
            data: { status: "CANCELLED" },
          });
        } else if (report.subjectType === "SESSION") {
          const s = await tx.baseDareSession.findUniqueOrThrow({
            where: { id: report.subjectId },
          });
          await tx.meetup.update({
            where: { id: s.meetupId },
            data: { status: "cancelled" },
          });
          await tx.sessionGuest.updateMany({
            where: { sessionId: s.id, status: { in: ["PENDING", "APPROVED"] } },
            data: { status: "CANCELLED" },
          });
        } else throw Error("INVALID_SUBJECT");
      }
      await tx.founderEvent.update({
        where: { id: report.id },
        data: { status: decision === "DISMISS" ? "DISMISSED" : "ACTIONED" },
      });
      await tx.founderEvent.create({
        data: {
          eventType: "LOCAL_ECONOMY_MODERATION",
          subjectType: report.subjectType,
          subjectId: report.subjectId,
          actor: auth.walletAddress,
          title: reason,
          status: decision,
          dedupeKey: "economy-moderation:" + report.id,
        },
      });
    });
    return json({ success: true });
  } catch {
    return json(
      {
        success: false,
        error: "This report changed or could not save. Refresh and retry.",
      },
      409
    );
  }
}
