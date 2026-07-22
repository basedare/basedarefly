'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Gamepad2,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
  Target,
  Trophy,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { useAccount } from 'wagmi';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';
import type {
  GrowthLane,
  GrowthOsReport,
  GrowthQuestStatus,
  GrowthRole,
} from '@/lib/growth-os-types';

function laneClasses(lane: GrowthLane) {
  if (lane === 'money') return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100';
  if (lane === 'trust') return 'border-red-300/30 bg-red-400/10 text-red-100';
  if (lane === 'buyer') return 'border-yellow-300/30 bg-yellow-400/10 text-yellow-100';
  if (lane === 'supply') return 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100';
  return 'border-purple-300/30 bg-purple-400/10 text-purple-100';
}

function statusIcon(status: GrowthQuestStatus) {
  if (status === 'complete') return <CheckCircle2 className="h-4 w-4" />;
  if (status === 'blocked') return <XCircle className="h-4 w-4" />;
  return <Zap className="h-4 w-4" />;
}

function roleAccent(role: GrowthRole['title']) {
  if (role === 'Founder / closer') return 'border-yellow-300/25';
  if (role === 'Verifier / ops') return 'border-red-300/25';
  if (role === 'Contributor router') return 'border-cyan-300/25';
  if (role === 'Field Station keeper') return 'border-purple-300/25';
  return 'border-emerald-300/25';
}

function formatGeneratedAt(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function GrowthOsPage() {
  const { address, isConnected } = useAccount();
  const [report, setReport] = useState<GrowthOsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openRole, setOpenRole] = useState<string | null>('growth-admin');
  const {
    adminSecret,
    setAdminSecret,
    ensureAdminSession,
    clearAdminSecret,
    hasAdminSession,
    hasSessionAdminSecret,
  } = useSessionAdminSecret();

  const adminSecretTrimmed = adminSecret.trim();
  const hasAdminAuth = Boolean(address || hasAdminSession || adminSecretTrimmed);
  const hasReadyAdminAuth = Boolean(address || hasAdminSession);
  const adminAuthHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (address) headers['x-moderator-wallet'] = address;
    return headers;
  }, [address]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!address && !hasAdminSession && adminSecretTrimmed) {
        const established = await ensureAdminSession();
        if (!established) throw new Error('Admin authorization failed');
      }
      const response = await fetch('/api/admin/growth-os', {
        headers: adminAuthHeaders,
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.hint || payload.error || 'Unable to load Growth OS');
      }
      setReport(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Growth OS');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [address, adminAuthHeaders, adminSecretTrimmed, ensureAdminSession, hasAdminSession]);

  useEffect(() => {
    if (!hasReadyAdminAuth) return;
    void loadReport();
  }, [hasReadyAdminAuth, loadReport]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03040a] px-4 py-10 text-white sm:px-6 lg:px-10">
      <LiquidBackground />
      <GradualBlurOverlay />

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col gap-7">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/70 transition hover:border-white/25 hover:text-white"
            >
              Back to admin
            </Link>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.34em] text-cyan-200/75">
              <Gamepad2 className="h-4 w-4" /> BaseDare Growth OS
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase italic tracking-[-0.04em] sm:text-6xl">
              Grow outcomes. <span className="text-yellow-300">Not vanity.</span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-relaxed text-white/55 sm:text-base">
              A daily operating game built from verified BaseDare state. Conversations create funded work;
              funded work creates receipts; receipts create paid repeats.
            </p>
          </div>
          <div className="rounded-[2rem] border border-yellow-300/20 bg-black/50 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-7 w-7 text-yellow-200" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Delegation boundary</p>
                <p className="max-w-md text-sm font-black text-white/80">
                  Do not share the global admin secret. Assign work packs; founder and verifier gates stay separate.
                </p>
              </div>
            </div>
          </div>
        </header>

        {!isConnected && (
          <div className="flex flex-col gap-3 rounded-[2rem] border border-white/10 bg-black/45 p-5 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">Admin secret fallback</span>
              <input
                type="password"
                value={adminSecret}
                onChange={(event) => setAdminSecret(event.target.value)}
                placeholder="Optional: paste ADMIN_SECRET"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/55 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-yellow-300/45"
              />
              <span className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                Founder session only
                {hasSessionAdminSecret && (
                  <button type="button" onClick={() => void clearAdminSecret()} className="text-yellow-100/75 hover:text-yellow-100">
                    Forget
                  </button>
                )}
              </span>
            </label>
            <button
              type="button"
              onClick={() => void loadReport()}
              disabled={!hasAdminAuth || loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/35 bg-yellow-300 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-black shadow-[0_8px_0_rgba(118,74,0,0.8)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Run Growth OS
            </button>
          </div>
        )}

        {!hasAdminAuth && (
          <div className="rounded-[2rem] border border-yellow-300/25 bg-yellow-300/10 p-8 text-center">
            <Lock className="mx-auto h-10 w-10 text-yellow-200" />
            <h2 className="mt-4 text-xl font-black">Authenticate to load verified operating state</h2>
          </div>
        )}
        {loading && <div className="rounded-[2rem] border border-white/10 bg-black/45 p-6 text-sm font-black uppercase tracking-[0.22em] text-white/60">Building today&apos;s quests…</div>}
        {error && <div className="rounded-[2rem] border border-red-400/30 bg-red-500/10 p-6 text-sm font-bold text-red-100">{error}</div>}

        {report && (
          <>
            <section className="overflow-hidden rounded-[2.5rem] border border-yellow-300/25 bg-[linear-gradient(135deg,rgba(250,204,21,0.14),rgba(8,12,24,0.9)_44%,rgba(34,211,238,0.09))] shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
              <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px] lg:p-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200/70">Today&apos;s command</p>
                  <h2 className="mt-3 max-w-4xl text-3xl font-black uppercase italic tracking-[-0.03em] sm:text-5xl">{report.headline.title}</h2>
                  <p className="mt-3 max-w-3xl text-sm font-bold leading-relaxed text-white/60">{report.headline.detail}</p>
                  <p className="mt-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                    <Clock3 className="h-3.5 w-3.5" /> {report.period.label} · generated {formatGeneratedAt(report.generatedAt)}
                  </p>
                </div>
                <div className="rounded-[2rem] border border-yellow-300/25 bg-black/35 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <Trophy className="h-8 w-8 text-yellow-300" />
                    <span className="rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-100">{report.score.level}</span>
                  </div>
                  <p className="mt-5 text-5xl font-black text-yellow-200">{report.score.total}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">Verified growth score</p>
                  {report.score.nextLevel && (
                    <p className="mt-3 text-xs font-bold text-white/55">{report.score.pointsToNextLevel} points to {report.score.nextLevel}</p>
                  )}
                </div>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200/65">Daily quest stack</p>
                  <h2 className="mt-1 text-2xl font-black">Do these in order</h2>
                </div>
                <Link href="/admin/daily-command-loop" className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50 hover:text-white">Open raw command loop</Link>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {report.today.map((quest, index) => (
                  <article key={quest.id} className="rounded-[2rem] border border-white/10 bg-black/50 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-xs font-black">{index + 1}</span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${laneClasses(quest.lane)}`}>
                          {statusIcon(quest.status)} {quest.lane}
                        </span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">{quest.owner}</span>
                    </div>
                    <h3 className="mt-4 text-xl font-black leading-tight">{quest.title}</h3>
                    <p className="mt-2 text-sm font-bold leading-relaxed text-white/50">{quest.why}</p>
                    <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">Definition of done</p>
                      <p className="mt-2 text-sm font-bold text-white/75">{quest.definitionOfDone}</p>
                    </div>
                    <p className="mt-3 text-xs font-bold text-yellow-100/70">{quest.scoreOutcome}</p>
                    {quest.approvalGate && <p className="mt-2 text-xs font-bold text-red-100/55">Gate: {quest.approvalGate}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {quest.evidence.map((signal) => <span key={signal} className="rounded-full border border-white/8 bg-black/35 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/35">{signal}</span>)}
                    </div>
                    <Link href={quest.href} className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/70 transition hover:border-yellow-300/30 hover:text-yellow-100">
                      Open work lane <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[2.5rem] border border-white/10 bg-black/50 p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-200/65">Weekly boss fight</p>
                <h2 className="mt-2 text-2xl font-black">One receipt. One buyer decision.</h2>
                <div className="mt-5 space-y-4">
                  {report.weeklyTargets.map((target) => {
                    const progress = Math.min(100, Math.round((target.current / target.target) * 100));
                    return (
                      <div key={target.id}>
                        <div className="flex items-end justify-between gap-3">
                          <div><p className="text-sm font-black">{target.label}</p><p className="mt-1 text-[10px] font-bold text-white/35">Evidence: {target.evidence}</p></div>
                          <p className="text-sm font-black text-yellow-100">{Math.min(target.current, target.target)}/{target.target}</p>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/7"><div className="h-full rounded-full bg-[linear-gradient(90deg,#facc15,#22d3ee)]" style={{ width: `${progress}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-[2.5rem] border border-cyan-300/15 bg-cyan-300/[0.055] p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-100/65">Score evidence</p>
                <div className="mt-4 space-y-3">
                  {report.score.signals.filter((signal) => signal.count > 0).map((signal) => (
                    <div key={signal.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/30 p-3">
                      <div><p className="text-sm font-black">{signal.label}</p><p className="text-[10px] font-bold text-white/35">{signal.count} × {signal.pointsEach}</p></div>
                      <span className="text-sm font-black text-cyan-100">+{signal.points}</span>
                    </div>
                  ))}
                  {report.score.signals.every((signal) => signal.count === 0) && <p className="text-sm font-bold text-white/45">No verified growth outcomes yet. The score starts when reality changes.</p>}
                </div>
              </div>
            </section>

            <section className="rounded-[2.5rem] border border-white/10 bg-black/50 p-6">
              <div className="flex items-center gap-3"><Users className="h-6 w-6 text-cyan-200" /><div><p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-100/60">Hiring system</p><h2 className="mt-1 text-2xl font-black">Delegate lanes, not authority</h2></div></div>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {report.roles.map((role) => {
                  const open = openRole === role.id;
                  return (
                    <div key={role.id} className={`rounded-[1.8rem] border bg-white/[0.035] ${roleAccent(role.title)}`}>
                      <button type="button" onClick={() => setOpenRole(open ? null : role.id)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
                        <div><p className="text-sm font-black">{role.title}</p><p className="mt-1 text-xs font-bold text-white/45">{role.mission}</p></div>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-white/40 transition ${open ? 'rotate-180' : ''}`} />
                      </button>
                      {open && (
                        <div className="grid gap-4 border-t border-white/8 px-5 py-5 md:grid-cols-2">
                          <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200/65">Daily outputs</p><ul className="mt-2 space-y-1.5 text-xs font-bold text-white/55">{role.dailyOutputs.map((item) => <li key={item}>• {item}</li>)}</ul></div>
                          <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-200/65">Never allowed</p><ul className="mt-2 space-y-1.5 text-xs font-bold text-white/55">{role.forbidden.map((item) => <li key={item}>• {item}</li>)}</ul></div>
                          <p className="md:col-span-2 text-xs font-black text-yellow-100/70">Success: {role.successMetric}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2.5rem] border border-white/10 bg-black/50 p-6">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-purple-100/65"><CalendarDays className="h-4 w-4" /> Daily rhythm</p>
                <div className="mt-4 space-y-3">{report.operatingCadence.daily.map((item) => <div key={item.block} className="grid grid-cols-[54px_1fr] gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3"><span className="text-sm font-black text-purple-100">{item.minutes}m</span><div><p className="text-sm font-black">{item.block}</p><p className="mt-1 text-xs font-bold text-white/40">{item.output}</p></div></div>)}</div>
              </div>
              <div className="rounded-[2.5rem] border border-white/10 bg-black/50 p-6">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-yellow-100/65"><Target className="h-4 w-4" /> Weekly rhythm</p>
                <div className="mt-4 space-y-3">{report.operatingCadence.weekly.map((item) => <div key={item.day} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-black">{item.day}</p><span className="text-[9px] font-black uppercase tracking-[0.16em] text-yellow-100/55">{item.command}</span></div><p className="mt-1 text-xs font-bold text-white/40">{item.output}</p></div>)}</div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-red-300/20 bg-red-400/[0.06] p-5"><p className="text-[10px] font-black uppercase tracking-[0.23em] text-red-100/65">Anti-gaming rules</p><ul className="mt-3 space-y-2 text-xs font-bold leading-relaxed text-white/55">{report.antiGamingRules.map((rule) => <li key={rule}>• {rule}</li>)}</ul></div>
              <div className="rounded-[2rem] border border-yellow-300/20 bg-yellow-400/[0.06] p-5"><p className="text-[10px] font-black uppercase tracking-[0.23em] text-yellow-100/65">Human approval gates</p><ul className="mt-3 space-y-2 text-xs font-bold leading-relaxed text-white/55">{report.approvalGates.map((gate) => <li key={gate}>• {gate}</li>)}</ul></div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
