'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Gift,
  Loader2,
  Lock,
  MapPin,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';
import type {
  FirstSparkCreatorReliability,
  FirstSparkGuestPerkRow,
  FirstSparkMissionControlReport,
  FirstSparkMissionRow,
  FirstSparkPilotTarget,
  MissionControlTone,
} from '@/lib/first-spark-mission-control-types';

function toneClasses(tone: MissionControlTone) {
  if (tone === 'critical') return 'border-red-400/35 bg-red-500/10 text-red-100';
  if (tone === 'warning') return 'border-yellow-300/35 bg-yellow-500/10 text-yellow-100';
  if (tone === 'active') return 'border-cyan-300/30 bg-cyan-500/10 text-cyan-100';
  if (tone === 'positive') return 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100';
  return 'border-white/10 bg-white/[0.04] text-white/70';
}

function statusDot(tone: MissionControlTone) {
  if (tone === 'critical') return 'bg-red-300';
  if (tone === 'warning') return 'bg-yellow-300';
  if (tone === 'active') return 'bg-cyan-300';
  if (tone === 'positive') return 'bg-emerald-300';
  return 'bg-white/35';
}

function formatRelative(value: string | null) {
  if (!value) return 'no recent signal';

  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60_000));
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.round(hours / 24)}d ago`;
}

function MetricChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-white">{value}</p>
    </div>
  );
}

function MissionRow({ mission }: { mission: FirstSparkMissionRow }) {
  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-black/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full shadow-[0_0_18px_currentColor] ${statusDot(mission.tone)}`} />
            <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${toneClasses(mission.tone)}`}>
              {mission.statusLabel}
            </span>
            {mission.venue.isPartner && (
              <span className="rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-yellow-100">
                Partner
              </span>
            )}
          </div>
          <h2 className="mt-3 truncate text-xl font-black text-white">{mission.venue.name}</h2>
          <p className="mt-1 line-clamp-1 text-sm font-bold text-white/55">{mission.nextAction}</p>
        </div>

        <div className="grid grid-cols-4 gap-2 lg:w-[28rem]">
          <MetricChip label="check-ins" value={mission.metrics.checkIns} />
          <MetricChip label="proofs" value={mission.metrics.acceptedProofs} />
          <MetricChip label="creators" value={mission.metrics.activeCreators} />
          <MetricChip label="perks" value={mission.metrics.perkRedemptions} />
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link
            href={mission.links.venue}
            className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/70 transition hover:border-white/25 hover:text-white"
          >
            Venue
          </Link>
          <Link
            href={mission.links.create}
            className="rounded-full border border-yellow-300/25 bg-yellow-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:bg-yellow-300 hover:text-black"
          >
            Launch
          </Link>
          <Link
            href={mission.links.recap}
            className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300 hover:text-black"
          >
            Recap
          </Link>
        </div>
      </div>
    </article>
  );
}

function CreatorRow({ creator }: { creator: FirstSparkCreatorReliability }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusDot(creator.tone)}`} />
          <p className="truncate text-sm font-black text-white">{creator.tag}</p>
          <span className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] ${toneClasses(creator.tone)}`}>
            {creator.statusLabel}
          </span>
        </div>
        <p className="mt-1 text-xs font-bold text-white/45">{creator.nextAction}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-right">
        <div>
          <p className="text-sm font-black text-white">{creator.proofsAccepted}</p>
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/35">proof</p>
        </div>
        <Link
          href={creator.links.passport}
          className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/65 hover:text-white"
        >
          Passport
        </Link>
      </div>
    </div>
  );
}

function PerkRow({ perk }: { perk: FirstSparkGuestPerkRow }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{perk.venueName}</p>
          <p className="mt-1 line-clamp-1 text-xs font-bold text-white/45">{perk.perkLabel}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] ${toneClasses(perk.tone)}`}>
          {perk.statusLabel}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MetricChip label="check-ins" value={perk.checkIns} />
        <MetricChip label="redeemed" value={perk.redemptions} />
      </div>
      <Link
        href={perk.links.console}
        className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/65 hover:text-white"
      >
        Console
      </Link>
    </div>
  );
}

function TargetRow({ target }: { target: FirstSparkPilotTarget }) {
  const progress = Math.min(100, Math.round((target.current / Math.max(1, target.target)) * 100));

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">{target.label}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{target.detail}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${toneClasses(target.tone)}`}>
          {target.current}/{target.target}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-yellow-300" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export default function MissionControlPage() {
  const { address, isConnected } = useAccount();
  const {
    adminSecret,
    setAdminSecret,
    ensureAdminSession,
    clearAdminSecret,
    hasAdminSession,
    hasSessionAdminSecret,
  } = useSessionAdminSecret();
  const [report, setReport] = useState<FirstSparkMissionControlReport | null>(null);
  const [periodDays, setPeriodDays] = useState(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adminSecretTrimmed = adminSecret.trim();
  const hasAdminAuth = Boolean(address || hasAdminSession || adminSecretTrimmed);
  const hasReadyAdminAuth = Boolean(address || hasAdminSession);
  const adminAuthHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (address) headers['x-moderator-wallet'] = address;
    return headers;
  }, [address]);

  const loadReport = useCallback(async () => {
    if (!hasAdminAuth) return;

    setLoading(true);
    setError(null);

    try {
      if (!address && !(await ensureAdminSession())) {
        throw new Error('Invalid admin secret');
      }

      const response = await fetch(`/api/admin/mission-control?periodDays=${periodDays}`, {
        headers: adminAuthHeaders,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.hint || payload.error || 'Unable to load mission control');
      }

      setReport(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load mission control');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [address, adminAuthHeaders, ensureAdminSession, hasAdminAuth, periodDays]);

  useEffect(() => {
    if (!hasReadyAdminAuth) return;
    void loadReport();
  }, [hasReadyAdminAuth, loadReport]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03040a] px-4 py-10 text-white sm:px-6 lg:px-10">
      <LiquidBackground />
      <GradualBlurOverlay />

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/70 transition hover:border-white/25 hover:text-white"
            >
              Back to admin
            </Link>
            <p className="text-xs font-black uppercase tracking-[0.36em] text-yellow-200/70">
              First Spark Ops
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase italic tracking-[-0.04em] sm:text-6xl">
              Mission <span className="text-cyan-200">Control</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setPeriodDays(days)}
                className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                  periodDays === days
                    ? 'border-yellow-300 bg-yellow-300 text-black'
                    : 'border-white/10 bg-white/[0.05] text-white/55 hover:text-white'
                }`}
              >
                {days}d
              </button>
            ))}
            <button
              type="button"
              onClick={() => void loadReport()}
              disabled={loading || !hasAdminAuth}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh
            </button>
          </div>
        </div>

        {!isConnected && (
          <div className="rounded-[1.6rem] border border-yellow-300/25 bg-yellow-300/10 p-4 text-sm font-bold text-yellow-100">
            Connect a moderator wallet or paste the admin secret to load Mission Control.
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-[1.6rem] border border-white/10 bg-black/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] lg:flex-row lg:items-end">
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
          {hasSessionAdminSecret && (
            <button
              type="button"
              onClick={() => void clearAdminSecret()}
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/55 hover:text-white"
            >
              Forget
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-[1.6rem] border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold text-red-100">
            {error}
          </div>
        )}

        {loading && !report && (
          <div className="flex min-h-[18rem] items-center justify-center rounded-[2rem] border border-white/10 bg-black/40">
            <Loader2 className="h-7 w-7 animate-spin text-yellow-200" />
          </div>
        )}

        {report && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <MetricChip label="venues" value={report.summary.venues} />
              <MetricChip label="live/review" value={report.summary.liveOrReviewMissions} />
              <MetricChip label="creators" value={report.summary.readyCreators} />
              <MetricChip label="check-ins" value={report.summary.checkIns} />
              <MetricChip label="proofs" value={report.summary.acceptedProofs} />
              <MetricChip label="repeat ready" value={report.summary.repeatReadyVenues} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_80px_rgba(0,0,0,0.45)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-100">
                    <Radio className="h-3.5 w-3.5" />
                    {report.market.label}
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-white md:text-3xl">{report.command.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm font-bold text-white/55">{report.command.nextAction}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/admin/venue-scout-command"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/65 transition hover:text-white"
                  >
                    Scout leads
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/create"
                    className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-black transition hover:brightness-110"
                  >
                    Create mission
                    <Zap className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,0.8fr)]">
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
                  <Target className="h-4 w-4 text-yellow-200" />
                  Mission board
                </div>
                {report.missions.map((mission) => (
                  <MissionRow key={mission.id} mission={mission} />
                ))}
              </section>

              <aside className="flex flex-col gap-5">
                {report.recap && (
                  <section className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
                      <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                      Recap preview
                    </div>
                    <h2 className="mt-4 text-2xl font-black text-white">{report.recap.venueName}</h2>
                    <p className="mt-1 text-sm font-bold text-white/55">{report.recap.recommendedNextMission}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <MetricChip label="people" value={report.recap.participants} />
                      <MetricChip label="check-ins" value={report.recap.checkIns} />
                      <MetricChip label="proofs" value={report.recap.acceptedProofs} />
                      <MetricChip label="cost/action" value={report.recap.costPerUsefulAction} />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Link
                        href={report.recap.links.recap}
                        className="flex-1 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 hover:bg-cyan-300 hover:text-black"
                      >
                        Recap
                      </Link>
                      <Link
                        href={report.recap.links.repeat}
                        className="flex-1 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100 hover:bg-yellow-300 hover:text-black"
                      >
                        Repeat
                      </Link>
                    </div>
                  </section>
                )}

                <section className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
                    <Users className="h-4 w-4 text-cyan-200" />
                    Creator reliability
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    {report.creators.length ? (
                      report.creators.map((creator) => (
                        <CreatorRow key={creator.tag} creator={creator} />
                      ))
                    ) : (
                      <p className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm font-bold text-white/45">
                        No creator reliability signal yet.
                      </p>
                    )}
                  </div>
                </section>
              </aside>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
                  <Gift className="h-4 w-4 text-yellow-200" />
                  Guest perk queue
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {report.guestPerks.map((perk) => (
                    <PerkRow key={perk.id} perk={perk} />
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
                  <Sparkles className="h-4 w-4 text-emerald-200" />
                  Siargao pilot targets
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {report.pilotTargets.map((target) => (
                    <TargetRow key={target.id} target={target} />
                  ))}
                </div>
              </section>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <MapPin className="h-5 w-5 text-cyan-200" />
                <p className="mt-3 text-sm font-black text-white">One local zone</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <BadgeCheck className="h-5 w-5 text-emerald-200" />
                <p className="mt-3 text-sm font-black text-white">Proof before pitch</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <Clock3 className="h-5 w-5 text-yellow-200" />
                <p className="mt-3 text-sm font-black text-white">Recap before repeat</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <ShieldCheck className="h-5 w-5 text-purple-200" />
                <p className="mt-3 text-sm font-black text-white">Measure ops cost</p>
              </div>
            </div>
          </>
        )}

        {!hasAdminAuth && (
          <div className="flex items-center gap-3 rounded-[2rem] border border-white/10 bg-black/45 p-5 text-sm font-bold text-white/55">
            <Lock className="h-5 w-5 text-yellow-200" />
            Mission Control is admin-only.
          </div>
        )}

        {report && (
          <p className="text-center text-[10px] font-black uppercase tracking-[0.24em] text-white/25">
            Last updated {formatRelative(report.generatedAt)}
          </p>
        )}
      </section>
    </main>
  );
}
