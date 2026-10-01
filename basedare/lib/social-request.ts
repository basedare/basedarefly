import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedWalletForRequest } from "@/lib/wallet-action-auth-server";
export async function socialWallet(
  request: NextRequest,
  wallet: unknown,
  action: string,
) {
  return getAuthorizedWalletForRequest(request, {
    walletAddress: typeof wallet === "string" ? wallet : null,
    action,
    resource: "community",
  });
}
export function socialError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}
