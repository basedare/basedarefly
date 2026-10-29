import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { socialWallet } from "@/lib/social-request";
import { publicMomentAllowed } from "@/lib/adventure-evidence";
import { privateMomentResponse } from "@/lib/moment-media";
import { momentInclude } from "@/lib/moment-server";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const row = await prisma.adventureSubmission.findUnique({
      where: { id },
      include: momentInclude,
    });
    if (!row?.privateMediaCid || !row.privateMediaMime)
      return new Response("Not found", { status: 404 });
    if (!publicMomentAllowed(row)) {
      const wallet = await socialWallet(
        request,
        request.nextUrl.searchParams.get("wallet"),
        "adventure:read",
      );
      if (
        wallet?.toLowerCase() !== row.wallet.toLowerCase() &&
        !(await authorizeAdminRequest(request)).authorized
      )
        return new Response("Not found", { status: 404 });
    }
    const response = await privateMomentResponse(
      row.privateMediaCid,
      row.privateMediaMime,
      request.headers.get("range"),
    );
    // Recheck after storage I/O so a concurrent withdrawal/report cannot publish the buffered file.
    const current = await prisma.adventureSubmission.findUnique({
      where: { id },
      include: momentInclude,
    });
    if (!current || !publicMomentAllowed(current)) {
      const owner = await socialWallet(
        request,
        request.nextUrl.searchParams.get("wallet"),
        "adventure:read",
      );
      if (
        owner?.toLowerCase() !== row.wallet.toLowerCase() &&
        !(await authorizeAdminRequest(request)).authorized
      )
        return new Response("Not found", {
          status: 404,
          headers: { "Cache-Control": "private, no-store" },
        });
    }
    return response;
  } catch {
    return new Response("This upload is temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
