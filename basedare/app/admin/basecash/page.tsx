'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { ArrowRight, CheckCircle2, CreditCard, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';
import { formatPhp } from '@/lib/basecash-shared';

type AdminBaseCashCredit = {
  id: string;
  venueSlug: string;
  venueName: string;
  receiptCode: string;
  denominationPhp: number;
  serviceFeePhp: number;
  venueReceivablePhp: number;
  paymentStatus: string;
  redemptionStatus: string;
  settlementStatus: string;
  txHash: string | null;
  createdAt: string;
  redeemedAt: string | null;
};

type AdminBaseCashSettlement = {
  venueId: string;
  venueSlug: string;
  venueName: string;
  city: string | null;
  country: string | null;
  activeCount: number;
  redeemedCount: number;
  pendingCount: number;
  soldPhp: number;
  redeemedPhp: number;
  serviceFeesPhp: number;
  venueReceivablePhp: number;
  unsettledPhp: number;
  latestCreditAt: string | null;
};

type AdminBaseCashPayload = {
  settlements: AdminBaseCashSettlement[];
  recentCredits: AdminBaseCashCredit[];
  setupRequired?: boolean;
};

export default function AdminBaseCashPage() {
  const { address } = useAccount();
  const {
    adminSecret,
    setAdminSecret,
    ensureAdminSession,
    clearAdminSecret,
    hasAdminSession,
    hasSessionAdminSecret,
  } = useSessionAdminSecret();
  const [payload, setPayload] = useState<AdminBaseCashPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const adminSecretTrimmed = adminSecret.trim();
  const hasAdminAuth = Boolean(address || hasAdminSession || adminSecretTrimmed);
  const hasReadyAdminAuth = Boolean(address || hasAdminSession);
  const adminAuthHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (address) headers['x-moderator-wallet'] = address;
    return headers;
  }, [address]);

  const loadBaseCash = useCallback(async () => {
    if (!hasAdminAuth) return;

    setLoading(true);
    setError(null);

    try {
      if (!address && !(await ensureAdminSession())) {
        throw new Error('Invalid admin secret');
      }

      const response = await fetch('/api/admin/basecash/settlements', {
        headers: adminAuthHeaders,
        cache: 'no-store',
      });
      const nextPayload = await response.json();

      if (!response.ok || !nextPayload?.success) {
        throw new Error(nextPayload?.hint || nextPayload?.error || 'Unable to load BaseCash');
      }

      setPayload(nextPayload.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load BaseCash');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [address, adminAuthHeaders, ensureAdminSession, hasAdminAuth]);

  useEffect(() => {
    if (!hasReadyAdminAuth) return;
    void loadBaseCash();
  }, [hasReadyAdminAuth, loadBaseCash]);

  async function markPaid(creditId: string) {
    setWorkingId(creditId);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/basecash/credits/${encodeURIComponent(creditId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({ action: 'mark_paid' }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error ?? 'Unable to mark credit paid');
      }
      setMessage('BaseCash credit marked paid and active.');
      await loadBaseCash();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to mark credit paid');
    } finally {
      setWorkingId(null);
    }
  }

  async function markSettled(venueId: string) {
    setWorkingId(venueId);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/basecash/settlements/${encodeURIComponent(venueId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({ settlementReference: `manual:${new Date().toISOString()}` }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error ?? 'Unable to settle venue');
      }
      setMessage('Venue settlement marked complete.');
      await loadBaseCash();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to settle venue');
    } finally {
      setWorkingId(null);
    }
  }

  const totals = useMemo(() => {
    const settlements = payload?.settlements ?? [];
    return {
      soldPhp: settlements.reduce((sum, venue) => sum + venue.soldPhp, 0),
      redeemedPhp: settlements.reduce((sum, venue) => sum + venue.redeemedPhp, 0),
      feesPhp: settlements.reduce((sum, venue) => sum + venue.serviceFeesPhp, 0),
      unsettledPhp: settlements.reduce((sum, venue) => sum + venue.unsettledPhp, 0),
    };
  }, [payload]);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#030406] px-4 py-10 text-white sm:px-6 lg:px-8">
      <LiquidBackground veilOpacity={0.78} performanceMode="quiet" />
      <GradualBlurOverlay />
      <section className="relative mx-auto max-w-6xl">
        <div className="rounded-[34px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_16%,rgba(8,8,15,0.95)_100%)] p-5 shadow-[0_32px_100px_rgba(0,0,0,0.44),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.09] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#f8dd72]">
                <CreditCard className="h-4 w-4" />
                BaseCash Ops
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] sm:text-5xl">Venue credit ledger.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                Manual pilot dashboard for venue-specific prepaid credit. No user cashout, no P2P, no general balance.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadBaseCash()}
                disabled={!hasAdminAuth || loading}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-300/22 bg-cyan-500/[0.09] px-4 text-xs font-black uppercase tracking-[0.16em] text-cyan-100 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link
                href="/admin/mission-control"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-black uppercase tracking-[0.16em] text-white/64 transition hover:bg-white/[0.08]"
              >
                Mission control
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {!hasReadyAdminAuth ? (
            <div className="mt-6 rounded-[24px] border border-white/10 bg-black/28 p-4">
              <p className="text-sm font-bold text-white">Admin access</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="password"
                  value={adminSecret}
                  onChange={(event) => setAdminSecret(event.target.value)}
                  placeholder="Admin secret"
                  className="min-h-11 flex-1 rounded-[18px] border border-white/10 bg-black/34 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/28"
                />
                <button
                  type="button"
                  onClick={() => void loadBaseCash()}
                  disabled={!adminSecretTrimmed || loading}
                  className="min-h-11 rounded-[18px] border border-[#f5c518]/24 bg-[#f5c518]/[0.12] px-5 text-xs font-black uppercase tracking-[0.16em] text-[#f8dd72] disabled:opacity-45"
                >
                  Unlock
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void clearAdminSecret()}
              className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-white/38 hover:text-white/62"
            >
              {hasSessionAdminSecret ? 'Clear admin session' : 'Moderator wallet active'}
            </button>
          )}

          {payload?.setupRequired ? (
            <p className="mt-5 rounded-[20px] border border-amber-300/20 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-100">
              BaseCash migration is not installed yet.
            </p>
          ) : null}
          {message ? <p className="mt-5 text-sm font-bold text-emerald-200">{message}</p> : null}
          {error ? <p className="mt-5 text-sm font-bold text-rose-200">{error}</p> : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {[
              ['Sold', totals.soldPhp],
              ['Redeemed', totals.redeemedPhp],
              ['Fees', totals.feesPhp],
              ['Unsettled', totals.unsettledPhp],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[22px] border border-white/10 bg-black/28 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/36">{label}</p>
                <p className="mt-2 text-2xl font-black">{formatPhp(Number(value))}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-[30px] border border-white/[0.09] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <h2 className="text-xl font-black">Venue settlement</h2>
            <div className="mt-4 grid gap-3">
              {(payload?.settlements ?? []).map((venue) => (
                <div key={venue.venueId} className="rounded-[22px] border border-white/10 bg-black/28 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{venue.venueName}</p>
                      <p className="mt-1 text-xs text-white/46">{venue.city ?? 'Local'} · {venue.redeemedCount} redeemed</p>
                    </div>
                    <span className="rounded-full border border-[#f5c518]/18 bg-[#f5c518]/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#f8dd72]">
                      {formatPhp(venue.unsettledPhp)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void markSettled(venue.venueId)}
                    disabled={!venue.unsettledPhp || workingId === venue.venueId}
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-500/[0.09] px-4 text-xs font-black uppercase tracking-[0.16em] text-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {workingId === venue.venueId ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Mark settled
                  </button>
                </div>
              ))}
              {!payload?.settlements?.length ? (
                <p className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.025] p-4 text-sm text-white/46">
                  No BaseCash venue credits yet.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-[30px] border border-white/[0.09] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <h2 className="text-xl font-black">Recent credits</h2>
            <div className="mt-4 grid gap-3">
              {(payload?.recentCredits ?? []).map((credit) => (
                <div key={credit.id} className="rounded-[22px] border border-white/10 bg-black/28 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-black text-white">{formatPhp(credit.denominationPhp)} · {credit.venueName}</p>
                      <p className="mt-1 text-xs text-white/46">{credit.receiptCode} · {credit.paymentStatus.toLowerCase()} · {credit.redemptionStatus.toLowerCase()}</p>
                    </div>
                    {credit.paymentStatus === 'PENDING' ? (
                      <button
                        type="button"
                        onClick={() => void markPaid(credit.id)}
                        disabled={workingId === credit.id}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/[0.09] px-4 text-xs font-black uppercase tracking-[0.16em] text-cyan-100 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {workingId === credit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        Mark paid
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
