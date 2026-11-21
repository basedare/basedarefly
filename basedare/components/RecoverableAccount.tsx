"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  PrivyProvider,
  usePrivy,
  useWallets,
  useCreateWallet,
  useLinkAccount,
} from "@privy-io/react-auth";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { base } from "viem/chains";
import type { EIP1193Provider } from "viem";
import {
  ACCOUNT_CONNECTOR_PREFIX,
  accountWalletAllowed,
} from "@/lib/account-access";
import { clearWalletSessionAuth } from "@/lib/wallet-action-auth";

// Keep the existing wagmi connectors. Privy is one explicit, account-owned connection,
// never an OAuth assertion that authorizes another wallet's records.
export function RecoverableAccountProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["email", "google", "passkey"],
        defaultChain: base,
        supportedChains: [base],
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "off" },
        },
        appearance: { theme: "dark", accentColor: "#F5C518" },
      }}
    >
      <AccountConnectionGuard />
      {children}
    </PrivyProvider>
  );
}

function clearAccountSignatures(address: string) {
  try {
    clearWalletSessionAuth(address);
    const prefix = `basedare:wallet-action:${address.toLowerCase()}:`;
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) sessionStorage.removeItem(key);
    }
  } catch {
    /* Browser storage may be unavailable. */
  }
}

function AccountConnectionGuard() {
  const { ready, authenticated } = usePrivy(),
    { wallets, ready: walletsReady } = useWallets();
  const { address, connector } = useAccount(),
    { disconnect } = useDisconnect();
  useEffect(() => {
    if (
      !ready ||
      !walletsReady ||
      !address ||
      !connector?.id.startsWith(ACCOUNT_CONNECTOR_PREFIX)
    )
      return;
    if (
      !authenticated ||
      !wallets.some(
        (w) => w.linked && w.address.toLowerCase() === address.toLowerCase()
      )
    ) {
      clearAccountSignatures(address);
      disconnect({ connector });
    }
  }, [
    ready,
    walletsReady,
    authenticated,
    wallets,
    address,
    connector,
    disconnect,
  ]);
  return null;
}

export default function RecoverableAccount({
  onConnected,
}: {
  onConnected?: () => void;
}) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const { linkEmail, linkGoogle, linkWallet, linkPasskey } = useLinkAccount();
  const { address, connector, isConnected } = useAccount();
  const { connectAsync } = useConnect(),
    { disconnectAsync } = useDisconnect();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const current = useRef(user?.id);
  current.current = user?.id;
  const linked = wallets.filter(
    (w) => w.linked && /^0x[a-f0-9]{40}$/i.test(w.address)
  );
  const hasLinkedWallet = user?.linkedAccounts.some((a) => a.type === "wallet");
  const ownConnection = !!connector?.id.startsWith(ACCOUNT_CONNECTOR_PREFIX);
  const action = async (work: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch {
      setMessage(
        "Could not finish. Your existing account and progress are unchanged. Try again."
      );
    } finally {
      setBusy(false);
    }
  };
  if (!ready)
    return (
      <p className="px-2 text-xs text-white/60">
        Loading email or Google sign-in…
      </p>
    );
  if (!authenticated)
    return (
      <button
        type="button"
        className="bd-action min-h-11 w-full !text-xs"
        onClick={() => login({ loginMethods: ["email", "google", "passkey"] })}
      >
        Continue with email or Google
      </button>
    );
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/75">
      <p className="font-bold text-white">
        Signed in with your recoverable account
      </p>
      <p>
        Choose the wallet that owns your BaseDare history. Existing progress can
        be saved explicitly from My activity.
      </p>
      {linked.map((wallet) => (
        <button
          key={wallet.address}
          type="button"
          disabled={busy || isConnected}
          className="bd-action min-h-11 w-full !text-xs"
          onClick={() =>
            void action(async () => {
              const owner = user?.id,
                provider = await wallet.getEthereumProvider();
              const accounts = await provider.request({
                method: "eth_accounts",
              });
              if (
                owner !== current.current ||
                !Array.isArray(accounts) ||
                !accountWalletAllowed(
                  authenticated,
                  wallet.linked,
                  wallet.address,
                  accounts as string[]
                )
              )
                throw Error();
              const result = await connectAsync({
                connector: injected({
                  target: {
                    id: ACCOUNT_CONNECTOR_PREFIX + wallet.address.toLowerCase(),
                    name: "BaseDare account",
                    provider: provider as unknown as EIP1193Provider,
                  },
                }),
              });
              if (
                owner !== current.current ||
                result.accounts[0]?.toLowerCase() !==
                  wallet.address.toLowerCase()
              ) {
                await disconnectAsync();
                throw Error();
              }
              onConnected?.();
            })
          }
        >
          {address?.toLowerCase() === wallet.address.toLowerCase()
            ? "Using"
            : "Use"}{" "}
          {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
        </button>
      ))}
      {walletsReady && !hasLinkedWallet && !isConnected && (
        <button
          type="button"
          disabled={busy}
          className="bd-action min-h-11 w-full !text-xs"
          onClick={() =>
            void action(async () => {
              await createWallet();
              setMessage("Account created. Choose it above to continue.");
            })
          }
        >
          Create my new participation account
        </button>
      )}
      <button
        type="button"
        className="min-h-10 w-full rounded-lg border border-white/15"
        onClick={() => linkWallet({ walletChainType: "ethereum-only" })}
      >
        Link an existing wallet
      </button>
      <div className="flex flex-wrap gap-2">
        {!user?.email && (
          <button className="min-h-10 underline" onClick={() => linkEmail()}>
            Add recovery email
          </button>
        )}
        {!user?.google && (
          <button className="min-h-10 underline" onClick={() => linkGoogle()}>
            Link Google
          </button>
        )}
        <button className="min-h-10 underline" onClick={() => linkPasskey()}>
          Add recovery passkey
        </button>
      </div>
      <p>
        Use the same linked method when returning. Linking a method never moves
        a payment or merges two wallet histories.
      </p>
      {isConnected && !ownConnection && (
        <p>Disconnect your current wallet before selecting another account.</p>
      )}
      {message && (
        <p role="status" className="text-amber-100">
          {message}
        </p>
      )}
      <button
        disabled={busy}
        type="button"
        className="min-h-10 text-red-200"
        onClick={() =>
          void action(async () => {
            if (ownConnection && address) {
              clearAccountSignatures(address);
              await disconnectAsync();
            }
            await logout();
          })
        }
      >
        Sign out of email / Google
      </button>
    </div>
  );
}
