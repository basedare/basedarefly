'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRoundSearch,
  XCircle,
} from 'lucide-react';
import { useAccount } from 'wagmi';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import {
  CREATOR_CAPTAIN_STATUS_LABELS,
  CREATOR_CAPTAIN_STATUSES,
  type CreatorCaptainStatus,
} from '@/lib/creator-captains';
import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';

type StatusFilter = CreatorCaptainStatus | 'ALL';

type CreatorCaptain = {
  id: string;
  title: string;
  status: CreatorCaptainStatus;
  statusLabel: string;
  creatorName: string;
  email: string;
  city: string;
  primaryHandle: string;
  primaryPlatformLabel: string;
  socialLinks: string;
  categoriesLabel: string;
  audienceLabel: string;
  contentStyle: string;
  dareIdeas: string;
  availabilityLabel: string;
  expectedPayoutLabel: string;
  walletAddress: string;
  venueLead: string;
  referralSource: string;
  scoutAttribution: {
    scoutCode: string;
    referralSource: string;
    referredCreatorHandle: string;
  };
  priority: {
    score: number;
    reasons: string[];
  };
  operator: {
    operatorNote: string;
    nextActionAt: string;
    suggestedVenue: string;
    firstMission: string;
  };
  ageHours: number;
  occurredAt: string;
  updatedAt: string;
  links: {
    replyMailtoHref: string | null;
    creatorSearchHref: string;
    createHref: string;
  };
  replyDraft: string;
};

type CaptainPayload = {
  summary: {
    total: number;
    active: number;
    shortlisted: number;
    contacted: number;
    onboarded: number;
    byStatus: Record<CreatorCaptainStatus, number>;
  };
  captains: CreatorCaptain[];
};

type DraftState = {
  operatorNote?: string;
  nextActionAt?: string;
  suggestedVenue?: string;
  firstMission?: string;
};

const FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  ...CREATOR_CAPTAIN_STATUSES.map((status) => ({ key: status, label: CREATOR_CAPTAIN_STATUS_LABELS[status] })),
];

function statusClass(status: CreatorCaptainStatus) {
  if (status === 'ONBOARDED') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
  if (status === 'REJECTED') return 'border-red-300/25 bg-red-400/10 text-red-100';
  if (status === 'SHORTLISTED') return 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100';
  if (status === 'CONTACTED') return 'border-purple-300/25 bg-purple-400/10 text-purple-100';
  if (status === 'NEEDS_INFO') return 'border-orange-300/25 bg-orange-400/10 text-orange-100';
  return 'border-yellow-300/30 bg-yellow-300/10 text-yellow-100';
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function priorityClass(score: number) {
  if (score >= 78) return 'text-emerald-100 border-emerald-300/20 bg-emerald-300/10';
  if (score >= 58) return 'text-cyan-100 border-cyan-300/20 bg-cyan-300/10';
  return 'text-yellow-100 border-yellow-300/20 bg-yellow-300/10';
}

export default function AdminCreatorCaptainsPage() {
  const { address } = useAccount();
  const {
    adminSecret,
    setAdminSecret,
    ensureAdminSession,
    clearAdminSecret,
    hasAdminSession,
    hasSessionAdminSecret,
  } = useSessionAdminSecret();
  const [payload, setPayload] = useState<CaptainPayload | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('NEW');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});

  const adminSecretTrimmed = adminSecret.trim();
  const hasAdminAuth = Boolean(address || hasAdminSession || adminSecretTrimmed);
  const adminAuthHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (address) headers['x-moderator-wallet'] = address;
    return headers;
  }, [address]);

  const selectedId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('applicationId') || '';
  }, []);

  const loadCaptains = useCallback(async () => {
    if (!hasAdminAuth) {
      setError('Admin auth required. Open an admin session or paste ADMIN_SECRET.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (!address && !(await ensureAdminSession())) {
        throw new Error('Invalid admin secret');
      }

      const response = await fetch('/api/admin/creator-captains', {
        headers: adminAuthHeaders,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load creator captain queue');
      }
      setPayload(data.data);
      const nextDrafts: Record<string, DraftState> = {};
      for (const captain of data.data.captains as CreatorCaptain[]) {
        nextDrafts[captain.id] = {
          operatorNote: captain.operator.operatorNote,
          nextActionAt: captain.operator.nextActionAt,
          suggestedVenue: captain.operator.suggestedVenue,
          firstMission: captain.operator.firstMission,
        };
      }
      setDrafts(nextDrafts);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load creator captain queue');
    } finally {
      setLoading(false);
    }
  }, [address, adminAuthHeaders, ensureAdminSession, hasAdminAuth]);

  useEffect(() => {
    if (hasSessionAdminSecret || address) {
      void loadCaptains();
    }
  }, [address, hasSessionAdminSecret, loadCaptains]);

  async function updateCaptain(id: string, patch: Partial<DraftState> & { status?: CreatorCaptainStatus }) {
    setUpdatingId(id);
    setError(null);
    try {
      if (!address && !(await ensureAdminSession())) {
        throw new Error('Invalid admin secret');
      }

      const currentDraft = drafts[id] || {};
      const response = await fetch('/api/admin/creator-captains', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          id,
          operatorNote: currentDraft.operatorNote || null,
          nextActionAt: currentDraft.nextActionAt || null,
          suggestedVenue: currentDraft.suggestedVenue || null,
          firstMission: currentDraft.firstMission || null,
          ...patch,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update creator captain');
      }
      await loadCaptains();
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update creator captain');
    } finally {
      setUpdatingId(null);
    }
  }

  const visibleCaptains = useMemo(() => {
    const captains = payload?.captains || [];
    const filtered = filter === 'ALL' ? captains : captains.filter((captain) => captain.status === filter);
    return [...filtered].sort((left, right) => {
      if (left.id === selectedId) return -1;
      if (right.id === selectedId) return 1;
      return right.priority.score - left.priority.score || left.ageHours - right.ageHours;
    });
  }, [filter, payload?.captains, selectedId]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05050b] text-white">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay />
      </div>

      <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-24 sm:px-6">
        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_18%,rgba(9,8,18,0.92)_62%,rgba(5,5,12,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_85%_30%,rgba(245,197,24,0.12),transparent_34%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100">
                <UserRoundSearch className="h-4 w-4" />
                Creator acquisition
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
                Dare Captain Queue
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/55">
                Shortlist creators who can produce real-world proof, bring venue energy, and seed paid activation loops.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/captains"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/70 transition hover:border-cyan-300/30 hover:text-cyan-100"
              >
                Public form
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => void loadCaptains()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/[0.08] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:border-yellow-200/40 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-white/[0.08] bg-black/28 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition ${
                    filter === item.key
                      ? 'border-cyan-300/35 bg-cyan-300/[0.12] text-cyan-100'
                      : 'border-white/10 bg-white/[0.035] text-white/45 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
                <span className="block text-lg text-white">{payload?.summary.total ?? 0}</span>
                Total
              </div>
              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2">
                <span className="block text-lg text-cyan-100">{payload?.summary.shortlisted ?? 0}</span>
                Short
              </div>
              <div className="rounded-2xl border border-purple-300/15 bg-purple-300/[0.06] px-3 py-2">
                <span className="block text-lg text-purple-100">{payload?.summary.contacted ?? 0}</span>
                Contact
              </div>
              <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2">
                <span className="block text-lg text-emerald-100">{payload?.summary.onboarded ?? 0}</span>
                Onboard
              </div>
            </div>
          </div>

          {!hasAdminSession && !address ? (
            <div className="mt-4 grid gap-3 rounded-[22px] border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <input
                type="password"
                value={adminSecret}
                onChange={(event) => setAdminSecret(event.target.value)}
                placeholder="Paste ADMIN_SECRET"
                className="rounded-2xl border border-white/10 bg-black/28 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-cyan-300/30"
              />
              <button
                type="button"
                onClick={() => void loadCaptains()}
                disabled={!adminSecretTrimmed || loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.1] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-cyan-100 disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                Unlock
              </button>
              <button
                type="button"
                onClick={() => void clearAdminSecret()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/55"
              >
                Clear
              </button>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
              {error}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4">
          {loading && !payload ? (
            <div className="rounded-[26px] border border-white/10 bg-black/28 p-6 text-sm font-bold text-white/55">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              Loading creator captain queue...
            </div>
          ) : null}

          {!loading && payload && visibleCaptains.length === 0 ? (
            <div className="rounded-[26px] border border-white/10 bg-black/28 p-6 text-sm font-bold text-white/55">
              No creator captain applications in this filter.
            </div>
          ) : null}

          {visibleCaptains.map((captain) => {
            const draft = drafts[captain.id] || {};
            const updating = updatingId === captain.id;
            return (
              <article
                key={captain.id}
                className={`relative overflow-hidden rounded-[28px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_18%,rgba(8,8,15,0.95)_100%)] p-5 shadow-[0_18px_46px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] ${
                  captain.id === selectedId ? 'border-cyan-300/35' : 'border-white/[0.08]'
                }`}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.09),transparent_34%),radial-gradient(circle_at_86%_20%,rgba(245,197,24,0.08),transparent_34%)]" />
                <div className="relative grid gap-5 lg:grid-cols-[1fr_360px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${statusClass(captain.status)}`}>
                        {captain.statusLabel}
                      </span>
                      <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${priorityClass(captain.priority.score)}`}>
                        Score {captain.priority.score}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                        {captain.ageHours}h old · {formatDate(captain.occurredAt)}
                      </span>
                    </div>

                    <h2 className="mt-4 text-2xl font-black tracking-tight text-white">
                      {captain.primaryHandle || captain.creatorName}
                    </h2>
                    <p className="mt-1 text-sm font-bold text-white/55">
                      {captain.creatorName} · {captain.city} · {captain.primaryPlatformLabel} · {captain.audienceLabel}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[20px] border border-white/10 bg-black/22 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Creator lane</p>
                        <p className="mt-2 text-sm font-bold leading-6 text-white/70">{captain.categoriesLabel || 'No lane set'}</p>
                      </div>
                      <div className="rounded-[20px] border border-white/10 bg-black/22 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Availability / payout</p>
                        <p className="mt-2 text-sm font-bold leading-6 text-white/70">
                          {captain.availabilityLabel} · {captain.expectedPayoutLabel}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="rounded-[20px] border border-white/10 bg-black/22 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Content style</p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-white/62">{captain.contentStyle}</p>
                      </div>
                      <div className="rounded-[20px] border border-white/10 bg-black/22 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Dare ideas</p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-white/62">{captain.dareIdeas}</p>
                      </div>
                    </div>

                    {captain.venueLead || captain.socialLinks || captain.walletAddress ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-[20px] border border-white/10 bg-white/[0.035] p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Venue lead</p>
                          <p className="mt-2 text-xs font-bold leading-5 text-white/58">{captain.venueLead || 'None'}</p>
                        </div>
                        <div className="rounded-[20px] border border-white/10 bg-white/[0.035] p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Links</p>
                          <p className="mt-2 break-words text-xs font-bold leading-5 text-white/58">{captain.socialLinks || 'None'}</p>
                        </div>
                        <div className="rounded-[20px] border border-white/10 bg-white/[0.035] p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Wallet</p>
                          <p className="mt-2 break-words text-xs font-bold leading-5 text-white/58">{captain.walletAddress || 'Not provided'}</p>
                        </div>
                      </div>
                    ) : null}

                    {captain.scoutAttribution?.scoutCode ? (
                      <div className="mt-4 rounded-[20px] border border-yellow-300/15 bg-yellow-300/[0.055] p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100/60">
                          Scout attribution
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-yellow-50/70">
                          Scout code {captain.scoutAttribution.scoutCode}
                          {captain.scoutAttribution.referredCreatorHandle
                            ? ` routed ${captain.scoutAttribution.referredCreatorHandle}.`
                            : ' routed this application.'}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 rounded-[20px] border border-cyan-300/15 bg-cyan-300/[0.055] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/60">Why it scored</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-cyan-50/70">
                        {captain.priority.reasons.join(', ') || 'Operator review needed'}
                      </p>
                    </div>
                  </div>

                  <aside className="grid gap-3 rounded-[24px] border border-white/10 bg-black/24 p-4">
                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                        Suggested venue
                      </span>
                      <input
                        value={draft.suggestedVenue || ''}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [captain.id]: { ...current[captain.id], suggestedVenue: event.target.value },
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black/28 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300/30"
                        placeholder="Venue or city lane"
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                        First mission
                      </span>
                      <textarea
                        value={draft.firstMission || ''}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [captain.id]: { ...current[captain.id], firstMission: event.target.value },
                          }))
                        }
                        className="min-h-[82px] w-full resize-none rounded-2xl border border-white/10 bg-black/28 px-3 py-2 text-sm font-bold leading-6 text-white outline-none focus:border-cyan-300/30"
                        placeholder="One safe, filmable pilot mission"
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                        Operator note
                      </span>
                      <textarea
                        value={draft.operatorNote || ''}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [captain.id]: { ...current[captain.id], operatorNote: event.target.value },
                          }))
                        }
                        className="min-h-[92px] w-full resize-none rounded-2xl border border-white/10 bg-black/28 px-3 py-2 text-sm font-bold leading-6 text-white outline-none focus:border-cyan-300/30"
                        placeholder="Fit, objections, next step"
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                        Next action
                      </span>
                      <input
                        type="datetime-local"
                        value={(draft.nextActionAt || '').slice(0, 16)}
                        onChange={(event) => {
                          const value = event.target.value ? new Date(event.target.value).toISOString() : '';
                          setDrafts((current) => ({
                            ...current,
                            [captain.id]: { ...current[captain.id], nextActionAt: value },
                          }));
                        }}
                        className="w-full rounded-2xl border border-white/10 bg-black/28 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300/30"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => void updateCaptain(captain.id, {})}
                      disabled={updating}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-100 disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clipboard className="h-4 w-4" />}
                      Save notes
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void updateCaptain(captain.id, { status: 'SHORTLISTED' })}
                        disabled={updating}
                        className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 disabled:opacity-50"
                      >
                        Shortlist
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateCaptain(captain.id, { status: 'CONTACTED' })}
                        disabled={updating}
                        className="rounded-2xl border border-purple-300/20 bg-purple-300/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-purple-100 disabled:opacity-50"
                      >
                        Contacted
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateCaptain(captain.id, { status: 'ONBOARDED' })}
                        disabled={updating}
                        className="inline-flex items-center justify-center gap-1 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Onboard
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateCaptain(captain.id, { status: 'REJECTED' })}
                        disabled={updating}
                        className="inline-flex items-center justify-center gap-1 rounded-2xl border border-red-300/20 bg-red-400/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-red-100 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>

                    <div className="grid gap-2">
                      {captain.links.replyMailtoHref ? (
                        <a
                          href={captain.links.replyMailtoHref}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/25 bg-yellow-300/[0.08] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-yellow-100"
                        >
                          <Mail className="h-4 w-4" />
                          Reply draft
                        </a>
                      ) : null}
                      <Link
                        href={captain.links.createHref}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white/60 hover:text-white"
                      >
                        <Sparkles className="h-4 w-4" />
                        Create mission
                      </Link>
                    </div>
                  </aside>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
