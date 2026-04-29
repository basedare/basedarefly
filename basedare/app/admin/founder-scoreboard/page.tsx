'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Clock3,
  Loader2,
  Lock,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useAccount } from 'wagmi';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';
import type {
  FounderLedgerEvent,
  FounderScoreboardReport,
  FounderScoreboardTone,
} from '@/lib/founder-scoreboard-types';

function toneClasses(tone: FounderScoreboardTone) {
  if (tone === 'critical') return 'border-red-400/35 bg-red-500/10 text-red-100';
  if (tone === 'warning') return 'border-yellow-300/35 bg-yellow-500/10 text-yellow-100';
  if (tone === 'active') return 'border-cyan-300/30 bg-cyan-500/10 text-cyan-100';
  if (tone === 'positive') return 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100';
  return 'border-white/10 bg-white/[0.04] text-white/75';
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMoney(value: number | null) {
  if (value === null) return '—';
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function eventIcon(event: FounderLedgerEvent) {
  if (event.type === 'venue_check_in' || event.type === 'place_tag_submitted') {
    return <MapPin className="h-4 w-4" />;
  }
  if (event.type === 'dare_settled' || event.type === 'campaign_slot_paid') {
    return <ShieldCheck className="h-4 w-4" />;
  }
  if (event.type === 'payout_queued' || event.type === 'dare_refunded' || event.type === 'dare_failed') {
    return <AlertTriangle className="h-4 w-4" />;
  }
  return <Activity className="h-4 w-4" />;
}

export default function FounderScoreboardPage() {
  const { address, isConnected } = useAccount();
  const [report, setReport] = useState<FounderScoreboardReport | null>(null);
  const { adminSecret, setAdminSecret, clearAdminSecret, hasSessionAdminSecret } = useSessionAdminSecret();
  const [periodDays, setPeriodDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adminSecretTrimmed = adminSecret.trim();
  const hasAdminAuth = Boolean(address || adminSecretTrimmed);
  const adminAuthHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (adminSecretTrimmed) {
      headers['x-admin-secret'] = adminSecretTrimmed;
      return headers;
    }
    if (address) {
      headers['x-moderator-wallet'] = address;
    }
    return headers;
  }, [address, adminSecretTrimmed]);

  const loadReport = useCallback(async () => {
    if (!hasAdminAuth) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/founder-scoreboard?periodDays=${periodDays}`, {
        headers: adminAuthHeaders,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.hint || payload.error || 'Unable to load founder scoreboard');
      }

      setReport(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load founder scoreboard');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [adminAuthHeaders, hasAdminAuth, periodDays]);

  useEffect(() => {
    if (!hasAdminAuth) return;
    void loadReport();
  }, [hasAdminAuth, loadReport]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03040a] px-4 py-10 text-white sm:px-6 lg:px-10">
      <LiquidBackground />
      <GradualBlurOverlay />

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <Link
              href="/admin"
              className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/70 transition hover:border-white/25 hover:text-white"
            >
              Back to admin
            </Link>
            <p className="text-xs font-black uppercase tracking-[0.36em] text-yellow-200/70">
              Founder Ops
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase italic tracking-[-0.04em] sm:text-6xl">
              Founder <span className="text-cyan-200">Scoreboard</span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold text-white/55 sm:text-base">
              Read-only outcome ledger for money, trust, creator growth, and venue utility. GMV is separated
              from estimated company revenue so the loop stays financially honest.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-3 text-yellow-100">
                <Banknote className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                  Operating rule
                </p>
                <p className="max-w-sm text-sm font-black text-white">
                  Funded volume is not revenue. Refunded volume is not success. Settled outcomes are the signal.
                </p>
              </div>
            </div>
          </div>
        </div>

        {!isConnected && (
          <div className="rounded-[2rem] border border-yellow-300/25 bg-yellow-300/10 p-6 text-sm font-bold text-yellow-100">
            Connect and sign in with a moderator wallet, or paste the admin secret below to load founder metrics.
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] lg:flex-row lg:items-end">
          <label className="flex-1">
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
              Admin secret fallback
            </span>
            <input
              type="password"
              value={adminSecret}
              onChange={(event) => setAdminSecret(event.target.value)}
              placeholder="Optional: paste ADMIN_SECRET"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/55 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-yellow-300/45"
            />
            <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
              Session-only, reused across admin ops links
              {hasSessionAdminSecret && (
                <button
                  type="button"
                  onClick={clearAdminSecret}
                  className="text-yellow-100/75 underline-offset-4 hover:text-yellow-100 hover:underline"
                >
                  Forget
                </button>
              )}
            </span>
          </label>

          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/35 p-1">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setPeriodDays(days)}
                className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
                  periodDays === days
                    ? 'bg-cyan-300 text-black'
                    : 'text-white/45 hover:bg-white/8 hover:text-white'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={!hasAdminAuth || loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/35 bg-yellow-300 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-black shadow-[0_8px_0_rgba(118,74,0,0.8)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>

        {!hasAdminAuth && (
          <div className="rounded-[2rem] border border-yellow-300/25 bg-yellow-300/10 p-8 text-center">
            <Lock className="mx-auto h-10 w-10 text-yellow-200" />
            <h2 className="mt-4 text-xl font-black">Authenticate to load the scoreboard</h2>
            <p className="mt-2 text-sm font-bold text-white/55">
              This page reads admin-grade financial and trust signals, so it uses the same admin gate as Ops.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-sm font-black uppercase tracking-[0.22em] text-white/60">
            <Loader2 className="h-5 w-5 animate-spin text-yellow-300" />
            Building founder scoreboard
          </div>
        )}

        {error && (
          <div className="rounded-[2rem] border border-red-400/30 bg-red-500/10 p-6 text-sm font-bold text-red-100">
            {error}
          </div>
        )}

        {report && (
          <>
            <div className={`rounded-[2.5rem] border p-6 shadow-[0_28px_90px_rgba(0,0,0,0.45)] ${toneClasses(report.headline.tone)}`}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-current/25 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-75">
                    <Target className="h-3.5 w-3.5" />
                    Founder signal
                  </div>
                  <h2 className="mt-4 text-3xl font-black uppercase italic tracking-[-0.03em] sm:text-5xl">
                    {report.headline.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm font-bold leading-relaxed opacity-80">
                    {report.headline.detail}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-current/20 bg-black/20 p-4 text-sm font-bold opacity-80">
                  <Clock3 className="mb-2 h-5 w-5" />
                  Generated {formatDateTime(report.generatedAt)}
                  <div className="mt-1 text-xs opacity-60">{report.period.label}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {report.scorecard.map((metric) => (
                <div key={metric.id} className={`rounded-[1.6rem] border p-4 ${toneClasses(metric.tone)}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-60">{metric.label}</p>
                  <p className="mt-2 text-3xl font-black">{metric.value}</p>
                  <p className="mt-2 text-xs font-bold leading-relaxed opacity-70">{metric.detail}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <section className="rounded-[2.5rem] border border-white/10 bg-[#070712]/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_120px_rgba(0,0,0,0.55)]">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/40">
                      Outcome funnel
                    </p>
                    <h2 className="mt-1 text-xl font-black uppercase tracking-[0.12em]">Money Rail</h2>
                  </div>
                  <TrendingUp className="h-5 w-5 text-cyan-200" />
                </div>

                <div className="mt-5 grid gap-3">
                  {report.funnel.map((step, index) => (
                    <div key={step.id} className={`rounded-[1.45rem] border p-4 ${toneClasses(step.tone)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-55">
                            {index + 1}. {step.label}
                          </p>
                          <p className="mt-2 text-2xl font-black">{formatMoney(step.amount)}</p>
                          <p className="mt-1 text-xs font-bold opacity-70">{step.detail}</p>
                        </div>
                        <span className="rounded-full border border-current/20 bg-black/20 px-3 py-1 text-xs font-black">
                          {step.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-[1.45rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/42">
                    Revenue split
                  </p>
                  <div className="mt-3 grid gap-2 text-sm font-bold text-white/65">
                    <div className="flex justify-between gap-3">
                      <span>Consumer fee revenue</span>
                      <span className="text-white">{formatMoney(report.money.consumerRevenue)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Campaign rake revenue</span>
                      <span className="text-white">{formatMoney(report.money.campaignRevenue)}</span>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-white/10 pt-2 text-white">
                      <span>Estimated company revenue</span>
                      <span>{formatMoney(report.money.realizedRevenue)}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[2.5rem] border border-white/10 bg-[#070712]/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_120px_rgba(0,0,0,0.55)]">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/40">
                      Read-only ledger
                    </p>
                    <h2 className="mt-1 text-xl font-black uppercase tracking-[0.12em]">Recent Outcomes</h2>
                  </div>
                  <Link
                    href="/admin/daily-command-loop"
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100"
                  >
                    Command loop
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="mt-5 grid gap-3">
                  {report.ledger.length > 0 ? (
                    report.ledger.map((event) => (
                      <Link
                        key={event.id}
                        href={event.href}
                        className="rounded-[1.45rem] border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/20 hover:bg-white/[0.06]"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded-2xl border p-2 ${toneClasses(event.tone)}`}>
                            {eventIcon(event)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${toneClasses(event.tone)}`}>
                                {event.label}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                                {formatDateTime(event.occurredAt)}
                              </span>
                            </div>
                            <p className="mt-2 truncate text-base font-black text-white">{event.title}</p>
                            <p className="mt-1 text-xs font-bold leading-relaxed text-white/55">{event.detail}</p>
                            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
                              {event.amount !== null && (
                                <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1">
                                  {formatMoney(event.amount)}
                                </span>
                              )}
                              {event.actor && (
                                <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1">
                                  {event.actor}
                                </span>
                              )}
                              {event.venue && (
                                <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1">
                                  {event.venue.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-[1.45rem] border border-white/10 bg-black/25 p-5 text-sm font-bold text-white/55">
                      No outcome events surfaced in this window.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-500/10 p-5">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-cyan-100" />
                  <h2 className="text-lg font-black uppercase tracking-[0.14em] text-cyan-100">
                    Command Signal
                  </h2>
                </div>
                <p className="mt-4 text-xl font-black text-white">{report.commandSignal.suggestedCommand}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {report.commandSignal.evidence.map((signal) => (
                    <span
                      key={signal}
                      className="rounded-full border border-cyan-200/15 bg-black/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/60"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] border border-emerald-300/20 bg-emerald-500/10 p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-100" />
                  <h2 className="text-lg font-black uppercase tracking-[0.14em] text-emerald-100">
                    Insights
                  </h2>
                </div>
                <div className="mt-4 grid gap-3">
                  {report.insights.map((insight) => (
                    <div key={insight} className="rounded-[1.2rem] border border-emerald-200/15 bg-black/25 p-3 text-sm font-bold leading-relaxed text-white/65">
                      {insight}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] border border-yellow-300/20 bg-yellow-500/10 p-5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-100" />
                  <h2 className="text-lg font-black uppercase tracking-[0.14em] text-yellow-100">
                    Watchouts
                  </h2>
                </div>
                <div className="mt-4 grid gap-3">
                  {report.watchouts.length > 0 ? (
                    report.watchouts.map((watchout) => (
                      <div key={watchout} className="rounded-[1.2rem] border border-yellow-200/15 bg-black/25 p-3 text-sm font-bold leading-relaxed text-yellow-100/75">
                        {watchout}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.2rem] border border-emerald-200/15 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-100/75">
                      No major financial or trust watchout surfaced in this window.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">Live GMV</p>
                <p className="mt-2 text-2xl font-black">{formatMoney(report.money.liveGmv)}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">Avg settled bounty</p>
                <p className="mt-2 text-2xl font-black">{formatMoney(report.money.averageSettledBounty)}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">Refund rate</p>
                <p className="mt-2 text-2xl font-black">{formatPercent(report.money.refundRate)}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">Active creators</p>
                <p className="mt-2 text-2xl font-black">{report.growth.activeCreators.toLocaleString()}</p>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
