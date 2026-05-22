'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { useAccount } from 'wagmi';

import {
  BASECASH_DENOMINATIONS_PHP,
  formatPhp,
  formatUsdc,
  quoteBaseCashVenueCredit,
  type BaseCashDenominationPhp,
} from '@/lib/basecash-shared';

type BaseCashVenueCreditClientProps = {
  venue: {
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
  };
  ledgerUnavailableReason?: string | null;
};

type CreatedCredit = {
  receiptUrl: string;
  credit: {
    id: string;
    receiptCode: string;
    paymentStatus: string;
    redemptionStatus: string;
  };
  pilotMode?: {
    simulatedPaymentEnabled?: boolean;
  };
};

const amountLabels: Record<BaseCashDenominationPhp, string> = {
  500: 'Coffee / snack',
  1000: 'Cafe tab',
  2500: 'Crew tab',
  5000: 'Big night',
};

export default function BaseCashVenueCreditClient({
  venue,
  ledgerUnavailableReason,
}: BaseCashVenueCreditClientProps) {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState<BaseCashDenominationPhp>(500);
  const [walletInput, setWalletInput] = useState('');
  const [buyerTag, setBuyerTag] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedCredit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const quote = useMemo(() => quoteBaseCashVenueCredit(amount), [amount]);
  const buyerWallet = (address || walletInput).trim();

  const createCredit = async () => {
    if (ledgerUnavailableReason) {
      setError(ledgerUnavailableReason);
      return;
    }

    setCreating(true);
    setError(null);
    setCreated(null);

    try {
      const response = await fetch(`/api/venues/${encodeURIComponent(venue.slug)}/basecash/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          denominationPhp: amount,
          buyerWallet,
          buyerTag: buyerTag || null,
          source: 'venue-basecash-page',
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Could not create venue credit');
      }

      setCreated({
        receiptUrl: payload.data.receiptUrl,
        credit: payload.data.credit,
        pilotMode: payload.data.pilotMode,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create venue credit');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.82fr]">
      <section className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_16%,rgba(9,9,17,0.94)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(245,197,24,0.11),transparent_32%),radial-gradient(circle_at_92%_100%,rgba(34,211,238,0.1),transparent_34%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.09] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#f8dd72]">
            <CreditCard className="h-4 w-4" />
            BaseCash Venue Credit
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl">
            Buy credit for {venue.name}.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62 sm:text-base">
            Pay with Base USDC, show the receipt to staff, and redeem it at this venue only.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BASECASH_DENOMINATIONS_PHP.map((option) => {
              const active = amount === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAmount(option)}
                  className={`rounded-[20px] border px-3 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition ${
                    active
                      ? 'border-[#f5c518]/38 bg-[#f5c518]/[0.14] text-[#f8dd72]'
                      : 'border-white/10 bg-white/[0.04] text-white/68 hover:border-white/20 hover:bg-white/[0.07]'
                  }`}
                >
                  <span className="block text-2xl font-black">{formatPhp(option)}</span>
                  <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.18em]">{amountLabels[option]}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-[24px] border border-white/10 bg-black/28 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">Venue credit</p>
                <p className="mt-1 text-xl font-black text-white">{formatPhp(quote.denominationPhp)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">BaseCash fee</p>
                <p className="mt-1 text-xl font-black text-[#f8dd72]">{formatPhp(quote.serviceFeePhp)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">Est. due</p>
                <p className="mt-1 text-xl font-black text-cyan-100">{formatUsdc(quote.estimatedUsdc)}</p>
              </div>
            </div>
          </div>

          {!isConnected ? (
            <label className="mt-5 block">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Wallet</span>
              <input
                value={walletInput}
                onChange={(event) => setWalletInput(event.target.value)}
                placeholder="0x wallet"
                className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/34 px-4 py-3 text-sm font-semibold text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] placeholder:text-white/28 focus:border-cyan-300/30"
              />
            </label>
          ) : null}

          <label className="mt-4 block">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Optional tag</span>
            <input
              value={buyerTag}
              onChange={(event) => setBuyerTag(event.target.value)}
              placeholder="@name or table note"
              className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/34 px-4 py-3 text-sm font-semibold text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] placeholder:text-white/28 focus:border-cyan-300/30"
            />
          </label>

          {error ? (
            <p className="mt-4 rounded-[18px] border border-rose-400/20 bg-rose-500/[0.08] px-4 py-3 text-sm font-bold text-rose-100">
              {error}
            </p>
          ) : null}

          {ledgerUnavailableReason ? (
            <p className="mt-4 rounded-[18px] border border-amber-300/20 bg-amber-500/[0.09] px-4 py-3 text-sm font-bold text-amber-50">
              {ledgerUnavailableReason}
            </p>
          ) : null}

          {created ? (
            <div
              className={`mt-5 rounded-[24px] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
                created.credit.paymentStatus === 'PAID'
                  ? 'border-emerald-300/20 bg-emerald-500/[0.08] text-emerald-50'
                  : 'border-amber-300/24 bg-amber-500/[0.09] text-amber-50'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em]">
                {created.credit.paymentStatus === 'PAID' ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                {created.credit.paymentStatus === 'PAID' ? 'Receipt ready' : 'Payment confirmation needed'}
              </div>
              <p className="mt-2 text-sm opacity-75">
                Code {created.credit.receiptCode}.{' '}
                {created.credit.paymentStatus === 'PAID'
                  ? 'Staff can mark it redeemed once.'
                  : 'BaseDare must confirm the USDC payment before staff can redeem it.'}
              </p>
              <Link
                href={created.receiptUrl}
                className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-black uppercase tracking-[0.16em] transition ${
                  created.credit.paymentStatus === 'PAID'
                    ? 'border-emerald-300/24 bg-emerald-400/[0.12] text-emerald-50 hover:bg-emerald-400/[0.18]'
                    : 'border-amber-300/24 bg-amber-400/[0.12] text-amber-50 hover:bg-amber-400/[0.18]'
                }`}
              >
                Open receipt
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : null}

          <button
            type="button"
            disabled={!buyerWallet || creating || Boolean(ledgerUnavailableReason)}
            onClick={createCredit}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#f5c518]/35 bg-[linear-gradient(180deg,#ffe76d_0%,#f5c518_45%,#b97800_100%)] px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-black shadow-[0_18px_32px_rgba(245,197,24,0.2),inset_0_1px_0_rgba(255,255,255,0.52),inset_0_-8px_10px_rgba(0,0,0,0.18)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Create credit request
          </button>
        </div>
      </section>

      <aside className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(8,8,15,0.96)_100%)] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/22 bg-cyan-500/[0.09] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">
          <ShieldCheck className="h-4 w-4" />
          Pilot guardrails
        </div>
        <div className="mt-5 grid gap-3">
          {[
            ['Venue only', `Redeem at ${venue.name}.`],
            ['No cash-out', 'Not withdrawable or transferable.'],
            ['No change', 'Spend it as venue credit.'],
            ['Manual pilot', 'BaseDare confirms payment and settles the venue in PHP.'],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-[20px] border border-white/10 bg-black/26 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-sm font-black text-white">{title}</p>
              <p className="mt-1 text-sm leading-5 text-white/58">{detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-white/42">
          BaseCash Venue Credit is a small Siargao pilot for venue-specific spend. It is not a stored general balance,
          cashout booth, remittance product, or venue-to-venue transfer.
        </p>
      </aside>
    </div>
  );
}
