'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Rocket,
  ShieldCheck,
  UserRoundSearch,
  XCircle,
} from 'lucide-react';
import { useAccount } from 'wagmi';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import {
  SCOUT_CREATOR_LEAD_STATUS_LABELS,
  SCOUT_CREATOR_LEAD_STATUSES,
  type ScoutCreatorLeadStatus,
} from '@/lib/scout-creator-leads';
import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';

type StatusFilter = ScoutCreatorLeadStatus | 'ALL';

type ScoutLead = {
  id: string;
  title: string;
  status: ScoutCreatorLeadStatus;
  statusLabel: string;
  scoutName: string;
  scoutHandle: string;
  scoutWallet: string;
  scoutCode: string;
  creatorHandle: string;
  creatorName: string;
  creatorPlatformLabel: string;
  creatorCity: string;
  creatorLink: string;
  relationshipStrengthLabel: string;
  fitReason: string;
  notes: string;
  score: {
    value: number;
    reasons: string[];
  };
  reward: {
    rewardSharePct: number;
    creatorEarningsUsd: number;
    estimatedRewardUsd: number;
    rewardAmountUsd: number;
    rewardTxHash: string;
    rewardPaidAt: string;
    policy: string;
  };
  operator: {
    operatorNote: string;
    nextActionAt: string;
  };
  captainApplicationId: string;
  captainAppliedAt: string;
  mission: {
    token: string;
    status: string;
    missionPath: string;
    missionUrl: string;
    launchedAt: string;
    launchedBy: string;
    proofSubmittedAt: string;
    activationOpenedAt: string;
    packet: {
      title: string;
      objective: string;
      prompts: string[];
      proofChecklist: string[];
      captionDraft: string;
      referralAsk: string;
      safetyRules: string[];
    };
    latestProof: {
      bestVenueName: string;
      city: string;
      proofLinks: string[];
      whyGoodFit: string;
      momentDescription: string;
      perkIdea: string;
      ownerIntroStatus: string;
      submittedAt: string;
    };
    pitchPacket: {
      headline: string;
      buyerPitch: string;
      outreachDraft: string;
      activationHref: string;
      receiptBullets: string[];
      venueName: string;
      city: string;
    };
  };
  ageHours: number;
  occurredAt: string;
  updatedAt: string;
  links: {
    captainInvitePath: string;
    captainInviteUrl: string;
    captainApplicationHref: string | null;
    creatorSearchHref: string;
  };
  inviteDraft: string;
};

type ScoutPayload = {
  summary: {
    total: number;
    active: number;
    applied: number;
    missionSent: number;
    proofSubmitted: number;
    pitchReady: number;
    activationOpened: number;
    rewardDue: number;
    rewardPaid: number;
    highScore: number;
    byStatus: Record<ScoutCreatorLeadStatus, number>;
  };
  leads: ScoutLead[];
};

type DraftState = {
  operatorNote?: string;
  nextActionAt?: string;
  rewardSharePct?: string;
  creatorEarningsUsd?: string;
  rewardAmountUsd?: string;
  rewardTxHash?: string;
  rewardPaidAt?: string;
};

type ScoutLeadAction = 'launch_mission' | 'venue_pitch_ready' | 'activation_opened';

const FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  ...SCOUT_CREATOR_LEAD_STATUSES.map((status) => ({ key: status, label: SCOUT_CREATOR_LEAD_STATUS_LABELS[status] })),
];

function statusClass(status: ScoutCreatorLeadStatus) {
  if (status === 'REWARD_PAID') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
  if (status === 'REJECTED') return 'border-red-300/25 bg-red-400/10 text-red-100';
  if (status === 'ACTIVATION_OPENED') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
  if (status === 'VENUE_PITCH_READY') return 'border-yellow-300/30 bg-yellow-300/10 text-yellow-100';
  if (status === 'PROOF_SUBMITTED') return 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100';
  if (status === 'MISSION_SENT') return 'border-purple-300/25 bg-purple-400/10 text-purple-100';
  if (status === 'CREATOR_APPLIED' || status === 'APPROVED') return 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100';
  if (status === 'REWARD_DUE' || status === 'CREATOR_EARNED') {
    return 'border-yellow-300/30 bg-yellow-300/10 text-yellow-100';
  }
  if (status === 'INVITE_SENT') return 'border-purple-300/25 bg-purple-400/10 text-purple-100';
  return 'border-white/14 bg-white/[0.055] text-white/70';
}

function priorityClass(score: number) {
  if (score >= 78) return 'text-emerald-100 border-emerald-300/20 bg-emerald-300/10';
  if (score >= 58) return 'text-cyan-100 border-cyan-300/20 bg-cyan-300/10';
  return 'text-yellow-100 border-yellow-300/20 bg-yellow-300/10';
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

function money(value: number) {
  if (!value) return '$0';
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function draftNumber(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function AdminScoutsPage() {
  const { address } = useAccount();
  const {
    adminSecret,
    setAdminSecret,
    ensureAdminSession,
    clearAdminSecret,
    hasAdminSession,
    hasSessionAdminSecret,
  } = useSessionAdminSecret();
  const [payload, setPayload] = useState<ScoutPayload | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('LEAD_SUBMITTED');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
    return new URLSearchParams(window.location.search).get('leadId') || '';
  }, []);

  const loadLeads = useCallback(async () => {
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

      const response = await fetch('/api/admin/scouts', {
        headers: adminAuthHeaders,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load scout queue');
      }
      setPayload(data.data);
      const nextDrafts: Record<string, DraftState> = {};
      for (const lead of data.data.leads as ScoutLead[]) {
        nextDrafts[lead.id] = {
          operatorNote: lead.operator.operatorNote,
          nextActionAt: lead.operator.nextActionAt,
          rewardSharePct: lead.reward.rewardSharePct ? String(lead.reward.rewardSharePct) : '',
          creatorEarningsUsd: lead.reward.creatorEarningsUsd ? String(lead.reward.creatorEarningsUsd) : '',
          rewardAmountUsd: lead.reward.rewardAmountUsd ? String(lead.reward.rewardAmountUsd) : '',
          rewardTxHash: lead.reward.rewardTxHash,
          rewardPaidAt: lead.reward.rewardPaidAt,
        };
      }
      setDrafts(nextDrafts);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load scout queue');
    } finally {
      setLoading(false);
    }
  }, [address, adminAuthHeaders, ensureAdminSession, hasAdminAuth]);

  useEffect(() => {
    if (hasSessionAdminSecret || address) {
      void loadLeads();
    }
  }, [address, hasSessionAdminSecret, loadLeads]);

  async function updateLead(id: string, patch: Partial<DraftState> & { status?: ScoutCreatorLeadStatus; action?: ScoutLeadAction }) {
    setUpdatingId(id);
    setError(null);
    try {
      if (!address && !(await ensureAdminSession())) {
        throw new Error('Invalid admin secret');
      }

      const currentDraft = drafts[id] || {};
      const response = await fetch('/api/admin/scouts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          id,
          operatorNote: currentDraft.operatorNote || null,
          nextActionAt: currentDraft.nextActionAt || null,
          rewardSharePct: draftNumber(currentDraft.rewardSharePct),
          creatorEarningsUsd: draftNumber(currentDraft.creatorEarningsUsd),
          rewardAmountUsd: draftNumber(currentDraft.rewardAmountUsd),
          rewardTxHash: currentDraft.rewardTxHash || null,
          rewardPaidAt: currentDraft.rewardPaidAt || null,
          ...patch,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update scout lead');
      }
      await loadLeads();
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update scout lead');
    } finally {
      setUpdatingId(null);
    }
  }

  async function copyInvite(lead: ScoutLead) {
    await navigator.clipboard.writeText(lead.links.captainInviteUrl);
    setCopiedId(lead.id);
  }

  async function copyMission(lead: ScoutLead) {
    if (!lead.mission.missionUrl) return;
    await navigator.clipboard.writeText(lead.mission.missionUrl);
    setCopiedId(`mission-${lead.id}`);
  }

  async function copyPitch(lead: ScoutLead) {
    if (!lead.mission.pitchPacket.outreachDraft) return;
    await navigator.clipboard.writeText(lead.mission.pitchPacket.outreachDraft);
    setCopiedId(`pitch-${lead.id}`);
  }

  const visibleLeads = useMemo(() => {
    const leads = payload?.leads || [];
    const filtered = filter === 'ALL' ? leads : leads.filter((lead) => lead.status === filter);
    return [...filtered].sort((left, right) => {
      if (left.id === selectedId) return -1;
      if (right.id === selectedId) return 1;
      return right.score.value - left.score.value || left.ageHours - right.ageHours;
    });
  }, [filter, payload?.leads, selectedId]);

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
                Scout acquisition
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
                Scout Army Queue
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/55">
                Track creator referrals, send attributed captain invites, and manually record founding scout rewards.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/scouts"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/70 transition hover:border-cyan-300/30 hover:text-cyan-100"
              >
                Public scout form
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => void loadLeads()}
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

            <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-white/45 sm:grid-cols-6">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
                <span className="block text-lg text-white">{payload?.summary.total ?? 0}</span>
                Total
              </div>
              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2">
                <span className="block text-lg text-cyan-100">{payload?.summary.applied ?? 0}</span>
                Applied
              </div>
              <div className="rounded-2xl border border-purple-300/15 bg-purple-300/[0.06] px-3 py-2">
                <span className="block text-lg text-purple-100">{payload?.summary.missionSent ?? 0}</span>
                Sent
              </div>
              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2">
                <span className="block text-lg text-cyan-100">{payload?.summary.proofSubmitted ?? 0}</span>
                Proof
              </div>
              <div className="rounded-2xl border border-yellow-300/15 bg-yellow-300/[0.06] px-3 py-2">
                <span className="block text-lg text-yellow-100">{payload?.summary.rewardDue ?? 0}</span>
                Due
              </div>
              <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2">
                <span className="block text-lg text-emerald-100">{payload?.summary.rewardPaid ?? 0}</span>
                Paid
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
                onClick={() => void loadLeads()}
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
              Loading scout queue...
            </div>
          ) : null}

          {!loading && payload && visibleLeads.length === 0 ? (
            <div className="rounded-[26px] border border-white/10 bg-black/28 p-6 text-sm font-bold text-white/55">
              No scout creator leads in this filter.
            </div>
          ) : null}

          {visibleLeads.map((lead) => {
            const draft = drafts[lead.id] || {};
            const updating = updatingId === lead.id;
            return (
              <article
                key={lead.id}
                className={`relative overflow-hidden rounded-[28px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_18%,rgba(8,8,15,0.95)_100%)] p-5 shadow-[0_18px_46px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] ${
                  lead.id === selectedId ? 'border-cyan-300/35' : 'border-white/[0.08]'
                }`}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.09),transparent_34%),radial-gradient(circle_at_86%_20%,rgba(245,197,24,0.08),transparent_34%)]" />
                <div className="relative grid gap-5 lg:grid-cols-[1fr_380px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${statusClass(lead.status)}`}>
                        {lead.statusLabel}
                      </span>
                      <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${priorityClass(lead.score.value)}`}>
                        Score {lead.score.value}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                        {lead.ageHours}h old · {formatDate(lead.occurredAt)}
                      </span>
                    </div>

                    <h2 className="mt-4 text-2xl font-black tracking-tight text-white">
                      {lead.creatorHandle || lead.creatorName || 'Creator lead'}
                    </h2>
                    <p className="mt-1 text-sm font-bold text-white/55">
                      {lead.creatorCity || 'Unknown city'} · {lead.creatorPlatformLabel} · {lead.relationshipStrengthLabel}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <div className="rounded-[20px] border border-white/10 bg-black/22 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Scout</p>
                        <p className="mt-2 text-sm font-bold leading-6 text-white/70">
                          {lead.scoutHandle || lead.scoutName || 'Unknown'} · {lead.scoutCode}
                        </p>
                      </div>
                      <div className="rounded-[20px] border border-white/10 bg-black/22 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Reward estimate</p>
                        <p className="mt-2 text-sm font-bold leading-6 text-white/70">
                          {lead.reward.rewardSharePct}% · {money(lead.reward.estimatedRewardUsd)}
                        </p>
                      </div>
                      <div className="rounded-[20px] border border-white/10 bg-black/22 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Captain app</p>
                        <p className="mt-2 text-sm font-bold leading-6 text-white/70">
                          {lead.captainApplicationId ? 'Applied' : 'Not yet'}
                        </p>
                      </div>
                      <div className="rounded-[20px] border border-white/10 bg-black/22 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Mission</p>
                        <p className="mt-2 text-sm font-bold leading-6 text-white/70">
                          {lead.mission.latestProof.bestVenueName || lead.mission.status || 'Not launched'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="rounded-[20px] border border-white/10 bg-black/22 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Why they fit</p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-white/62">{lead.fitReason}</p>
                      </div>
                      {lead.notes || lead.creatorLink ? (
                        <div className="rounded-[20px] border border-white/10 bg-black/22 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Context</p>
                          <p className="mt-2 break-words text-sm font-semibold leading-6 text-white/62">
                            {lead.notes || lead.creatorLink}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 rounded-[20px] border border-cyan-300/15 bg-cyan-300/[0.055] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/60">Why it scored</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-cyan-50/70">
                        {lead.score.reasons.join(', ') || 'Operator review needed'}
                      </p>
                    </div>
                  </div>

                  <aside className="grid gap-3 rounded-[24px] border border-white/10 bg-black/24 p-4">
                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                        Operator note
                      </span>
                      <textarea
                        value={draft.operatorNote || ''}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [lead.id]: { ...current[lead.id], operatorNote: event.target.value },
                          }))
                        }
                        className="min-h-[86px] w-full resize-none rounded-2xl border border-white/10 bg-black/28 px-3 py-2 text-sm font-bold leading-6 text-white outline-none focus:border-cyan-300/30"
                        placeholder="Fit, warm intro status, next move"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                          Reward %
                        </span>
                        <input
                          value={draft.rewardSharePct || ''}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [lead.id]: { ...current[lead.id], rewardSharePct: event.target.value },
                            }))
                          }
                          className="w-full rounded-2xl border border-white/10 bg-black/28 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300/30"
                          placeholder="10"
                        />
                      </label>
                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                          Creator earned
                        </span>
                        <input
                          value={draft.creatorEarningsUsd || ''}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [lead.id]: { ...current[lead.id], creatorEarningsUsd: event.target.value },
                            }))
                          }
                          className="w-full rounded-2xl border border-white/10 bg-black/28 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300/30"
                          placeholder="0"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                          Reward paid
                        </span>
                        <input
                          value={draft.rewardAmountUsd || ''}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [lead.id]: { ...current[lead.id], rewardAmountUsd: event.target.value },
                            }))
                          }
                          className="w-full rounded-2xl border border-white/10 bg-black/28 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300/30"
                          placeholder="0"
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
                              [lead.id]: { ...current[lead.id], nextActionAt: value },
                            }));
                          }}
                          className="w-full rounded-2xl border border-white/10 bg-black/28 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300/30"
                        />
                      </label>
                    </div>

                    <label>
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                        Reward tx / note
                      </span>
                      <input
                        value={draft.rewardTxHash || ''}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [lead.id]: { ...current[lead.id], rewardTxHash: event.target.value },
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black/28 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300/30"
                        placeholder="USDC tx hash or manual payout note"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => void updateLead(lead.id, {})}
                      disabled={updating}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-100 disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clipboard className="h-4 w-4" />}
                      Save
                    </button>

                    <div className="rounded-[22px] border border-purple-300/15 bg-purple-300/[0.055] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-100/62">
                            Captain mission
                          </p>
                          <p className="mt-2 text-sm font-bold leading-6 text-white/70">
                            {lead.mission.packet.title || 'Venue Scout Mission'}
                          </p>
                        </div>
                        <Rocket className="h-5 w-5 shrink-0 text-purple-100" />
                      </div>

                      {lead.mission.missionUrl ? (
                        <p className="mt-3 break-words text-xs font-semibold leading-5 text-purple-50/56">
                          {lead.mission.missionUrl}
                        </p>
                      ) : (
                        <p className="mt-3 text-xs font-semibold leading-5 text-purple-50/56">
                          Launch creates the proof link, mission packet, and first venue pitch path.
                        </p>
                      )}

                      {lead.mission.latestProof.bestVenueName ? (
                        <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/62">
                            Proof target
                          </p>
                          <p className="mt-2 text-sm font-bold leading-6 text-cyan-50/74">
                            {lead.mission.latestProof.bestVenueName} · {lead.mission.latestProof.city || lead.creatorCity}
                          </p>
                        </div>
                      ) : null}

                      {lead.mission.pitchPacket.headline ? (
                        <div className="mt-3 rounded-2xl border border-yellow-300/15 bg-yellow-300/[0.06] p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100/62">
                            Pitch packet
                          </p>
                          <p className="mt-2 text-sm font-bold leading-6 text-yellow-50/74">
                            {lead.mission.pitchPacket.headline}
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => void updateLead(lead.id, { action: 'launch_mission' })}
                          disabled={updating}
                          className="inline-flex items-center justify-center gap-1 rounded-2xl border border-purple-300/20 bg-purple-300/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-purple-100 disabled:opacity-50"
                        >
                          <Rocket className="h-3.5 w-3.5" />
                          Launch
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyMission(lead)}
                          disabled={!lead.mission.missionUrl}
                          className="inline-flex items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/66 disabled:opacity-40"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {copiedId === `mission-${lead.id}` ? 'Copied' : 'Copy link'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateLead(lead.id, { action: 'venue_pitch_ready' })}
                          disabled={updating || !lead.mission.latestProof.bestVenueName}
                          className="inline-flex items-center justify-center gap-1 rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100 disabled:opacity-40"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Pitch ready
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateLead(lead.id, { action: 'activation_opened' })}
                          disabled={updating || !lead.mission.pitchPacket.activationHref}
                          className="inline-flex items-center justify-center gap-1 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100 disabled:opacity-40"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Opened
                        </button>
                      </div>

                      {lead.mission.pitchPacket.outreachDraft || lead.mission.pitchPacket.activationHref ? (
                        <div className="mt-2 grid gap-2">
                          {lead.mission.pitchPacket.outreachDraft ? (
                            <button
                              type="button"
                              onClick={() => void copyPitch(lead)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {copiedId === `pitch-${lead.id}` ? 'Copied pitch' : 'Copy venue pitch'}
                            </button>
                          ) : null}
                          {lead.mission.pitchPacket.activationHref ? (
                            <Link
                              href={lead.mission.pitchPacket.activationHref}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                              First Spark route
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void updateLead(lead.id, { status: 'INVITE_READY' })}
                        disabled={updating}
                        className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 disabled:opacity-50"
                      >
                        Invite ready
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateLead(lead.id, { status: 'INVITE_SENT' })}
                        disabled={updating}
                        className="rounded-2xl border border-purple-300/20 bg-purple-300/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-purple-100 disabled:opacity-50"
                      >
                        Invite sent
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateLead(lead.id, { status: 'APPROVED' })}
                        disabled={updating}
                        className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateLead(lead.id, { status: 'REWARD_DUE' })}
                        disabled={updating}
                        className="rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100 disabled:opacity-50"
                      >
                        Reward due
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void updateLead(lead.id, {
                            status: 'REWARD_PAID',
                            rewardPaidAt: new Date().toISOString(),
                          })
                        }
                        disabled={updating}
                        className="inline-flex items-center justify-center gap-1 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Paid
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateLead(lead.id, { status: 'REJECTED' })}
                        disabled={updating}
                        className="inline-flex items-center justify-center gap-1 rounded-2xl border border-red-300/20 bg-red-400/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-red-100 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>

                    <div className="grid gap-2">
                      <button
                        type="button"
                        onClick={() => void copyInvite(lead)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/25 bg-yellow-300/[0.08] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-yellow-100"
                      >
                        <Copy className="h-4 w-4" />
                        {copiedId === lead.id ? 'Copied invite' : 'Copy invite'}
                      </button>
                      {lead.links.captainApplicationHref ? (
                        <Link
                          href={lead.links.captainApplicationHref}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-100"
                        >
                          <ArrowRight className="h-4 w-4" />
                          Captain application
                        </Link>
                      ) : null}
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
