"use client";
import { useSession } from "next-auth/react";
import { useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { buildWalletActionAuthHeaders } from "@/lib/wallet-action-auth";
export function useSocialAction() {
  const { data } = useSession();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const session = data as {
    token?: string;
    walletAddress?: string;
    user?: { walletAddress?: string };
  } | null;
  const sessionWallet = session?.walletAddress ?? session?.user?.walletAddress;
  const wallet = (address ?? sessionWallet)?.toLowerCase();
  const headers = useCallback((action: string, allowSignPrompt = true) =>
    buildWalletActionAuthHeaders({
      walletAddress: wallet,
      sessionWallet,
      sessionToken: session?.token,
      action,
      resource: "community",
      signMessageAsync,
      allowSignPrompt,
    }), [wallet, sessionWallet, session?.token, signMessageAsync]);
  return { wallet, headers };
}
