'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bot,
  CheckCircle2,
  Clock3,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Target,
  Zap,
} from 'lucide-react';
import { useAccount } from 'wagmi';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import type {
  DailyCommandItem,
  DailyCommandLoopReport,
  DailyCommandRiskTier,
  DailyCommandTone,
} from '@/lib/daily-command-loop-types';

function toneClasses(tone: DailyCommandTone) {
  if (tone === 'critical') return 'border-red-400/35 bg-red-500/10 text-red-100';
  if (tone === 'warning') return 'border-yellow-300/35 bg-yellow-500/10 text-yellow-100';
  if (tone === 'active') return 'border-cyan-300/30 bg-cyan-500/10 text-cyan-100';
  if (tone === 'positive') return 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100';
  return 'border-white/10 bg-white/[0.04] text-white/75';
}

function riskClasses(riskTier: DailyCommandRiskTier) {
  if (riskTier === 'human') return 'border-red-300/30 bg-red-500/10 text-red-100';
  if (riskTier === 'review') return 'border-yellow-300/35 bg-yellow-500/10 text-yellow-100';
  return 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100';
}

function riskLabel(riskTier: DailyCommandRiskTier) {
  if (riskTier === 'human') return 'Human only';
  if (riskTier === 'review') return 'Needs review';
  return 'Auto-safe';
}

function workstreamLabel(workstream: DailyCommandItem['workstream']) {
  if (workstream === 'ops') return 'Ops';
  if (workstream === 'growth') return 'Growth';
  if (workstream === 'trust') return 'Trust';
  if (workstream === 'money') return 'Money';
  return 'Market';
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function DailyCommandLoopPage() {
  const { address, isConnected } = useAccount();
  const [report, setReport] = useState<DailyCommandLoopReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminSecret, setAdminSecret] = useState('');

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
      const response = await fetch('/api/admin/daily-command-loop', {
        headers: adminAuthHeaders,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.hint || payload.error || 'Unable to load daily command loop');
      }

      setReport(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load daily command loop');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [adminAuthHeaders, hasAdminAuth]);

  useEffect(() => {
    if (!hasAdminAuth) return;
    let cancelled = false;

    async function loadInitialReport() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/admin/daily-command-loop', {
          headers: adminAuthHeaders,
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.hint || payload.error || 'Unable to load daily command loop');
        }

        if (!cancelled) {
          setReport(payload.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load daily command loop');
          setReport(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialReport();

    return () => {
      cancelled = true;
    };
  }, [adminAuthHeaders, hasAdminAuth]);

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
            <p className="text-xs font-black uppercase tracking-[0.36em] text-cyan-200/70">
              BaseDare Brain
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase italic tracking-[-0.04em] sm:text-6xl">
              Daily <span className="text-yellow-300">Command</span> Loop
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold text-white/55 sm:text-base">
              One read-only operating loop for today: clear trust and money queues, convert existing intent,
              prepare safe scouting work, and package external actions for review.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-3 text-cyan-100">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                  Permission model
                </p>
                <p className="max-w-sm text-sm font-black text-white">
                  Drafting, ranking, and summarizing are safe. Sending, money, and public commitments stay gated.
                </p>
              </div>
            </div>
          </div>
        </div>

        {!isConnected && (
          <div className="rounded-[2rem] border border-yellow-300/25 bg-yellow-300/10 p-6 text-sm font-bold text-yellow-100">
            Connect and sign in with a moderator wallet, or paste the admin secret below to run the command loop.
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:flex-row sm:items-end">
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
          </label>
          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={!hasAdminAuth || loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/35 bg-yellow-300 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-black shadow-[0_8px_0_rgba(118,74,0,0.8)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Run loop
          </button>
        </div>

        {!hasAdminAuth && (
          <div className="rounded-[2rem] border border-yellow-300/25 bg-yellow-300/10 p-8 text-center">
            <Lock className="mx-auto h-10 w-10 text-yellow-200" />
            <h2 className="mt-4 text-xl font-black">Authenticate to load today&apos;s loop</h2>
            <p className="mt-2 text-sm font-bold text-white/55">
              The loop reads admin-grade operational signals, so it uses the same moderator/admin gate as the rest of Ops.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-sm font-black uppercase tracking-[0.22em] text-white/60">
            <Loader2 className="h-5 w-5 animate-spin text-yellow-300" />
            Building daily command loop
          </div>
        )}

        {error && (
          <div className="rounded-[2rem] border border-red-400/30 bg-red-500/10 p-6 text-sm font-bold text-red-100">
            {error}
          </div>
        )}

        {report && (
          <>
            <div className={`rounded-[2.5rem] border p-6 shadow-[0_28px_90px_rgba(0,0,0,0.45)] ${toneClasses(report.currentSignal.tone)}`}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-current/25 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-75">
                    <Target className="h-3.5 w-3.5" />
                    Today&apos;s command
                  </div>
                  <h2 className="mt-4 text-3xl font-black uppercase italic tracking-[-0.03em] sm:text-5xl">
                    {report.currentSignal.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm font-bold leading-relaxed opacity-80">
                    {report.currentSignal.detail}
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

            <section className={`rounded-[2rem] border p-5 ${toneClasses(report.founderPulse.tone)}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-current/25 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-75">
                    <Banknote className="h-3.5 w-3.5" />
                    Founder pulse
                  </div>
                  <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.02em]">
                    {report.founderPulse.suggestedCommand}
                  </h2>
                  <p className="mt-2 text-sm font-bold opacity-75">
                    ${report.founderPulse.settledGmv.toLocaleString()} settled GMV, ${report.founderPulse.realizedRevenue.toLocaleString()} estimated revenue,
                    {' '}${report.founderPulse.checkIns} check-ins across {report.founderPulse.activeVenues} venues.
                  </p>
                </div>
                <Link
                  href="/admin/founder-scoreboard"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-current/25 bg-black/20 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition hover:bg-black/30"
                >
                  Open scoreboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {report.founderPulse.evidence.map((signal) => (
                  <span
                    key={signal}
                    className="rounded-full border border-current/15 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] opacity-60"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-[2.25rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_35%),rgba(5,12,22,0.88)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_90px_rgba(0,0,0,0.45)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/75">
                    <Target className="h-3.5 w-3.5" />
                    Venue scout brief
                  </div>
                  <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.02em] text-white">
                    {report.venueScout.currentCommand.title}
                  </h2>
                  <p className="mt-2 max-w-4xl text-sm font-bold leading-relaxed text-white/60">
                    {report.venueScout.currentCommand.detail}
                  </p>
                </div>
                <Link
                  href="/admin/venue-scout-command"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300/15"
                >
                  Open scout command
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">
                    Current route
                  </p>
                  <p className="mt-2 text-lg font-black text-white">
                    {report.venueScout.topRoute?.label ?? report.venueScout.summary.topRoute ?? 'No active route'}
                  </p>
                  <p className="mt-2 text-xs font-bold leading-relaxed text-white/52">
                    {report.venueScout.topRoute?.nextMove ?? 'Create leads from the strongest seed venues before cold scouting.'}
                  </p>
                  {report.venueScout.topRoute && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-cyan-200/15 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/65">
                        {report.venueScout.topRoute.leadCount} leads
                      </span>
                      <span className="rounded-full border border-yellow-200/15 bg-yellow-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100/65">
                        {report.venueScout.topRoute.immediateCount} immediate
                      </span>
                    </div>
                  )}
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">
                    Top lead
                  </p>
                  <p className="mt-2 text-lg font-black text-white">
                    {report.venueScout.topLead?.venueName ?? 'No active lead'}
                  </p>
                  <p className="mt-2 text-xs font-bold leading-relaxed text-white/52">
                    {report.venueScout.topLead?.nextAction ?? 'Use seed venues to create the next tracked contact.'}
                  </p>
                  {report.venueScout.topLead && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
                        {report.venueScout.topLead.priorityLabel}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
                        {report.venueScout.topLead.score} score
                      </span>
                    </div>
                  )}
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">
                    Next seed
                  </p>
                  <p className="mt-2 text-lg font-black text-white">
                    {report.venueScout.topSeedCandidate?.venueName ?? 'No warm seed'}
                  </p>
                  <p className="mt-2 text-xs font-bold leading-relaxed text-white/52">
                    {report.venueScout.topSeedCandidate?.suggestedAngle ?? report.venueScout.currentCommand.nextAction}
                  </p>
                  {report.venueScout.topSeedCandidate && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {report.venueScout.topSeedCandidate.reasons.slice(0, 3).map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full border border-emerald-200/15 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/65"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <section className="rounded-[2.5rem] border border-white/10 bg-[#070712]/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_120px_rgba(0,0,0,0.55)] sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/40">
                      Ranked work
                    </p>
                    <h2 className="mt-1 text-xl font-black uppercase tracking-[0.12em]">Command Stack</h2>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                    {report.commandStack.length} moves
                  </span>
                </div>

                <div className="grid gap-3">
                  {report.commandStack.map((item, index) => (
                    <article
                      key={item.id}
                      className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/20 hover:bg-white/[0.06]"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/80">
                              {index + 1}. {workstreamLabel(item.workstream)}
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${riskClasses(item.riskTier)}`}>
                              {riskLabel(item.riskTier)}
                            </span>
                          </div>
                          <h3 className="mt-3 text-xl font-black text-white">{item.title}</h3>
                          <p className="mt-2 text-sm font-bold leading-relaxed text-white/60">{item.why}</p>
                        </div>
                        <Link
                          href={item.href}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:bg-yellow-300/15"
                        >
                          Open
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                      <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/25 p-3 text-sm font-bold text-white/68">
                        Next: {item.nextAction}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.evidence.map((signal) => (
                          <span
                            key={signal}
                            className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45"
                          >
                            {signal}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <aside className="flex flex-col gap-5">
                <section className="rounded-[2rem] border border-yellow-300/20 bg-yellow-500/10 p-5">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-200" />
                    <h2 className="text-lg font-black uppercase tracking-[0.14em] text-yellow-100">
                      Needs Review
                    </h2>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {report.needsReview.length > 0 ? (
                      report.needsReview.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          className="rounded-[1.35rem] border border-yellow-200/15 bg-black/25 p-4 transition hover:border-yellow-200/30"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-white">{item.title}</p>
                              <p className="mt-1 text-xs font-bold text-white/52">{item.nextAction}</p>
                            </div>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${riskClasses(item.riskTier)}`}>
                              {item.count}
                            </span>
                          </div>
                          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100/55">
                            Owner: {item.owner}
                          </p>
                        </Link>
                      ))
                    ) : (
                      <div className="rounded-[1.35rem] border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-100">
                        No review queue surfaced. Keep the loop focused on safe scouting and memory hygiene.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[2rem] border border-emerald-300/20 bg-emerald-500/10 p-5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-100" />
                    <h2 className="text-lg font-black uppercase tracking-[0.14em] text-emerald-100">
                      Auto-Safe Work
                    </h2>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {report.safeAutomaticWork.map((item) => (
                      <div key={item.id} className="rounded-[1.35rem] border border-emerald-200/15 bg-black/25 p-4">
                        <p className="text-sm font-black text-white">{item.title}</p>
                        <p className="mt-2 text-xs font-bold leading-relaxed text-white/55">{item.nextAction}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </aside>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-cyan-200" />
                  <h2 className="text-lg font-black uppercase tracking-[0.14em]">Learnings</h2>
                </div>
                <div className="mt-4 grid gap-3">
                  {report.learnings.map((learning) => (
                    <div key={learning} className="rounded-[1.25rem] border border-white/10 bg-black/25 p-3 text-sm font-bold leading-relaxed text-white/62">
                      {learning}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-yellow-200" />
                  <h2 className="text-lg font-black uppercase tracking-[0.14em]">Watchouts</h2>
                </div>
                <div className="mt-4 grid gap-3">
                  {report.watchouts.length > 0 ? (
                    report.watchouts.map((watchout) => (
                      <div key={watchout} className="rounded-[1.25rem] border border-yellow-300/15 bg-yellow-500/10 p-3 text-sm font-bold leading-relaxed text-yellow-100/75">
                        {watchout}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.25rem] border border-emerald-300/15 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-100/75">
                      No major watchout from the current signal set.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
