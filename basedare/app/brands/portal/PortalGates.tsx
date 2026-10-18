import type { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Building2, MapPin, Sparkles } from 'lucide-react';
import type { Connector } from 'wagmi';
import BusinessRequestOptions from '@/components/BusinessRequestOptions';
import { getPreferredWalletConnector } from '@/lib/wallet-connect';

type PortalGatesProps = {
  address: string | undefined;
  connect: (args: { connector: Connector }) => void;
  connectors: readonly Connector[];
  controlBackHref: string;
  controlBackLabel: string;
  handleRegister: () => Promise<void>;
  registerError: string | null;
  registerName: string;
  setRegisterName: Dispatch<SetStateAction<string>>;
  loadError: string | null;
  retryLoad: () => void;
  showLoading: boolean;
  showNotConnected: boolean;
  showRegisterView: boolean;
};

const backLinkClass =
  'absolute left-4 top-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-xs font-black text-white/70 transition hover:border-white/24 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:left-6 sm:top-6';

export default function PortalGates({
  address,
  connect,
  connectors,
  controlBackHref,
  controlBackLabel,
  handleRegister,
  registerError,
  registerName,
  setRegisterName,
  loadError,
  retryLoad,
  showLoading,
  showNotConnected,
  showRegisterView,
}: PortalGatesProps) {
  const connectWallet = () => {
    const preferredConnector = getPreferredWalletConnector(connectors);
    if (preferredConnector) connect({ connector: preferredConnector });
  };

  return (
    <>
      {showNotConnected ? (
        <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-24">
          <Link href={controlBackHref} className={backLinkClass} aria-label={`Back to ${controlBackLabel}`}>
            <ArrowLeft className="h-4 w-4" />
            {controlBackLabel}
          </Link>

          <section className="activation-shell w-full max-w-3xl rounded-[30px] border p-5 text-center md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/25 bg-yellow-300/[0.09] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-yellow-100">
              <Sparkles className="h-4 w-4" />
              Buyer Workspace
            </div>
            <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-black uppercase italic leading-[0.94] tracking-[-0.055em] text-white sm:text-6xl">
              Put a useful brief on the map.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/72">
              Commission content or fund a local activity. Start with one place, one clear deliverable and the people you want to reach.
            </p>
            <BusinessRequestOptions />
            <button type="button" onClick={connectWallet} className="bd-action mt-6 w-full !text-sm">
              Open existing workspace <ArrowRight size={16} aria-hidden="true" />
            </button>

            <div className="mx-auto mt-7 flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-left sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-purple-300/20 bg-purple-400/10 text-purple-100">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-black text-white">Manage a place instead?</div>
                  <p className="mt-1 text-sm leading-6 text-white/62">Find your venue → View place → Request venue access. After approval, open Manage venue.</p>
                </div>
              </div>
              <Link
                href="/map"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-4 text-sm font-black text-white/75 transition hover:border-white/24 hover:text-white"
              >
                <MapPin className="h-4 w-4" />
                Find my place
              </Link>
            </div>
          </section>
        </main>
      ) : null}

      {loadError ? <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-24">
        <section className="bd-surface w-full max-w-lg p-6">
          <h1 className="text-2xl font-black text-white">Your workspace hasn’t loaded.</h1>
          <p role="alert" className="mt-3 text-base leading-7 text-amber-100">{loadError}</p>
          <p className="mt-3 text-sm leading-6 text-white/65">An unavailable read does not mean you have no work or payments.</p>
          <div className="mt-5 flex flex-wrap gap-3"><button type="button" className="bd-action bd-action--gold !text-sm" onClick={retryLoad}>Retry workspace</button><Link href={controlBackHref} className="bd-action !text-sm">{controlBackLabel}</Link></div>
        </section>
      </main> : null}

      {showLoading ? (
        <div className="relative z-10 flex min-h-dvh items-center justify-center">
          <div className="animate-pulse text-base font-semibold text-white/65">Loading Buyer Workspace…</div>
        </div>
      ) : null}

      {showRegisterView ? (
        <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-24">
          <Link href={controlBackHref} className={backLinkClass} aria-label={`Back to ${controlBackLabel}`}>
            <ArrowLeft className="h-4 w-4" />
            {controlBackLabel}
          </Link>

          <section className="activation-shell w-full max-w-lg rounded-[30px] border p-5 sm:p-7">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/25 bg-yellow-300/[0.09] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-yellow-100">
                Buyer profile
              </div>
              <h1 className="mt-5 text-4xl font-black uppercase italic tracking-[-0.05em] text-white">Who is this request for?</h1>
              <p className="mt-3 text-base font-semibold leading-7 text-white/68">
                This name appears on the managed mission and receipt. Work starts after your request and payment are confirmed.
              </p>
            </div>

            <div className="mt-6 space-y-4 rounded-[24px] border border-white/10 bg-black/30 p-5">
              <div>
                <label htmlFor="buyer-name" className="mb-2 block text-sm font-black text-white/78">Buyer or organization name</label>
                <input
                  id="buyer-name"
                  type="text"
                  value={registerName}
                  onChange={(event) => setRegisterName(event.target.value)}
                  placeholder="e.g. BaseDare Research, Red Bull, Alex"
                  className="min-h-12 w-full rounded-2xl border border-white/12 bg-black/35 px-4 py-3 text-base font-semibold text-white outline-none transition placeholder:text-white/34 focus:border-yellow-300/55 focus:ring-2 focus:ring-yellow-300/15"
                  autoComplete="organization"
                />
              </div>

              <div>
                <div className="mb-2 text-sm font-black text-white/78">Connected wallet</div>
                <div className="break-all rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-white/65">{address}</div>
              </div>

              {registerError ? (
                <div className="rounded-2xl border border-red-300/30 bg-red-400/[0.09] px-4 py-3 text-sm font-semibold leading-6 text-red-100" role="alert">
                  {registerError}
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleRegister}
                disabled={!registerName.trim()}
                className="activation-raised-gold inline-flex min-h-12 w-full items-center justify-center rounded-2xl border px-5 text-sm font-black uppercase tracking-[0.1em] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-100/70"
              >
                Continue to your request
              </button>
            </div>

            <p className="mt-5 text-center text-sm leading-6 text-white/62">
              Own or manage a venue?{' '}
              <Link href="/map" className="font-black text-cyan-100 underline decoration-cyan-200/30 underline-offset-4">
                Find your venue and request access.
              </Link>
            </p>
          </section>
        </main>
      ) : null}
    </>
  );
}
