import type { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Building2, CreditCard, MapPin, Sparkles } from 'lucide-react';
import type { Connector } from 'wagmi';
import { MANAGED_FIELD_SPRINT } from '@/lib/financial-canon';
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
              Buyer Portal
            </div>
            <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-black uppercase italic leading-[0.94] tracking-[-0.055em] text-white sm:text-6xl">
              Send a verified mission into the real world.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-white/72 md:text-lg">
              One bounded question, four independent contributors, verified evidence, place memory, and a receipt. The managed Sprint is ${MANAGED_FIELD_SPRINT.invoiceTotalUsd.toLocaleString()} by invoice.
            </p>

            <div className="mx-auto mt-7 grid max-w-xl gap-3 sm:grid-cols-2">
              <Link
                href="/activations?source=buyer-portal&missionType=field-mission"
                className="activation-raised-gold inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-black uppercase tracking-[0.1em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-100/70"
              >
                <CreditCard className="h-4 w-4" />
                Request Sprint invoice
              </Link>
              <button
                type="button"
                onClick={connectWallet}
                className="activation-soft-button inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/14 px-5 text-sm font-black text-white/82 transition hover:border-white/26 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Manage commissioned work
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <Link
              href="/field-sprints/example"
              className="mt-4 inline-flex min-h-11 items-center justify-center px-4 text-sm font-black text-cyan-100/80 underline decoration-cyan-200/30 underline-offset-4 transition hover:text-cyan-100"
            >
              See an example receipt
            </Link>

            <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/58">
              No venue claim is required. Buyers can commission fieldwork about any eligible place; claiming is only for an authorized owner or manager who wants to maintain that place profile.
            </p>

            <div className="mx-auto mt-7 flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-left sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-purple-300/20 bg-purple-400/10 text-purple-100">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-black text-white">Manage a place instead?</div>
                  <p className="mt-1 text-sm leading-6 text-white/62">Claim and manage your venue from its page on the map.</p>
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

      {showLoading ? (
        <div className="relative z-10 flex min-h-dvh items-center justify-center">
          <div className="animate-pulse text-base font-semibold text-white/65">Loading buyer portal…</div>
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
              <h1 className="mt-5 text-4xl font-black uppercase italic tracking-[-0.05em] text-white">Who is buying the Sprint?</h1>
              <p className="mt-3 text-base font-semibold leading-7 text-white/68">
                This name appears on the managed mission and receipt. New Sprints launch only after the invoice is confirmed.
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
                <div className="mb-2 text-sm font-black text-white/78">Reporting wallet</div>
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
                Scope the Sprint
              </button>
            </div>

            <p className="mt-5 text-center text-sm leading-6 text-white/62">
              Own or manage a venue?{' '}
              <Link href="/map" className="font-black text-cyan-100 underline decoration-cyan-200/30 underline-offset-4">
                Manage it from the map instead.
              </Link>
            </p>
          </section>
        </main>
      ) : null}
    </>
  );
}
