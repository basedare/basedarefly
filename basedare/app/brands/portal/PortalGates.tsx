// Extracted verbatim from page.tsx (Phase A structural split — no behavior changes).
// All state lives in the page shell; props are threaded with their original names.
import type { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { Connector } from 'wagmi';
import { getPreferredWalletConnector } from '@/lib/wallet-connect';

type PortalGatesProps = {
  address: string | undefined;
  connect: (args: { connector: Connector }) => void;
  connectors: readonly Connector[];
  controlBackHref: string;
  controlBackLabel: string;
  handleRegister: () => Promise<void>;
  registerName: string;
  setRegisterName: Dispatch<SetStateAction<string>>;
  showLoading: boolean;
  showNotConnected: boolean;
  showRegisterView: boolean;
};

export default function PortalGates({
  address,
  connect,
  connectors,
  controlBackHref,
  controlBackLabel,
  handleRegister,
  registerName,
  setRegisterName,
  showLoading,
  showNotConnected,
  showRegisterView,
}: PortalGatesProps) {
  return (
    <>
      {/* Not connected state */}
      {showNotConnected && (
        <div className="flex items-center justify-center h-full p-4 relative z-10">
          <Link
            href={controlBackHref}
            className="absolute top-6 left-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/64 transition hover:bg-white/[0.08] hover:text-white"
            aria-label={`Back to ${controlBackLabel}`}
          >
            <ArrowLeft className="h-4 w-4" />
            {controlBackLabel}
          </Link>

          <div className="max-w-md text-center space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-yellow-300/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-yellow-100">
              <Sparkles className="h-4 w-4" />
              Activation Portal
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-[-0.06em] text-white sm:text-5xl">
              Control Mode
            </h1>
            <p className="mx-auto max-w-md text-base font-bold leading-7 text-white/62">
              Fund live venue activations, route creators, and track proof. Connect your wallet to open the activation portal.
            </p>
            <button
              onClick={() => {
                const preferredConnector = getPreferredWalletConnector(connectors);
                if (preferredConnector) connect({ connector: preferredConnector });
              }}
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-yellow-300/30 bg-yellow-300 px-7 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-200 active:scale-95 touch-manipulation select-none cursor-pointer"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              Connect Wallet
            </button>
            <Link
              href="/first-spark"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.045] px-5 text-xs font-black uppercase tracking-[0.16em] text-white/62 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
            >
              See First Spark
            </Link>
          </div>
        </div>
      )}

      {/* Loading state */}
      {showLoading && (
        <div className="flex items-center justify-center h-full relative z-10">
          <div className="animate-pulse text-zinc-500">Loading Control Mode...</div>
        </div>
      )}

      {/* Register brand state */}
      {showRegisterView && (
        <div className="flex items-center justify-center h-full p-4 relative z-10">
          <Link
            href={controlBackHref}
            className="absolute top-6 left-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/64 transition hover:bg-white/[0.08] hover:text-white"
            aria-label={`Back to ${controlBackLabel}`}
          >
            <ArrowLeft className="h-4 w-4" />
            {controlBackLabel}
          </Link>

          <div className="max-w-md w-full space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-yellow-300/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-yellow-100">
                Register
              </div>
              <h1 className="mt-4 text-3xl font-black uppercase italic tracking-[-0.05em] text-white">Venue or brand</h1>
              <p className="mt-3 text-sm font-bold leading-6 text-white/58">
                Set up the buyer profile that will fund venue activations.
              </p>
            </div>

            <div className="space-y-4 rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/44">Venue / brand name</label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="e.g., Hideaway, Red Bull, Local Gym"
                  className="w-full rounded-[14px] border border-white/12 bg-black/40 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/34 focus:border-yellow-400/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/44">Wallet address</label>
                <div className="rounded-[14px] border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-white/56">
                  {address}
                </div>
              </div>

              <button
                onClick={handleRegister}
                disabled={!registerName.trim()}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-yellow-300/30 bg-yellow-300 px-5 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Create activation profile
              </button>
              <Link
                href="/first-spark"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.055] px-5 text-xs font-black uppercase tracking-[0.14em] text-white/66 transition hover:border-white/25 hover:bg-white/[0.09] hover:text-white"
              >
                Run First Spark first
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
