"use client";
import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSignMessage } from "wagmi";
import { useActiveWallet } from "./useActiveWallet";
import { buildWalletActionAuthHeaders } from "@/lib/wallet-action-auth";

export function useSocialAccount() {
  const { address: wallet, isResolving } = useActiveWallet();
  const { data: session } = useSession();
  const { signMessageAsync } = useSignMessage();
  const s = session as {
    token?: string;
    walletAddress?: string;
    user?: { walletAddress?: string };
  } | null;
  const token = s?.token,
    sessionWallet = s?.walletAddress ?? s?.user?.walletAddress;
  const headers = useCallback(
    (action: "social:read" | "social:write", prompt = false) =>
      buildWalletActionAuthHeaders({
        walletAddress: wallet,
        sessionToken: token,
        sessionWallet,
        action,
        resource: "community",
        allowSignPrompt: prompt,
        signMessageAsync,
      }),
    [wallet, token, sessionWallet, signMessageAsync],
  );
  return { wallet, isResolving, headers };
}
