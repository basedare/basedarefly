'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clipboard,
  Clock3,
  DollarSign,
  FileText,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserRoundSearch,
  XCircle,
} from 'lucide-react';
import { useAccount } from 'wagmi';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';

type IntakeStatus = 'NEW' | 'QUALIFIED' | 'NEEDS_INFO' | 'READY_TO_INVOICE' | 'LAUNCHED' | 'REJECTED';
type StatusFilter = IntakeStatus | 'ALL';

type ActivationIntake = {
  id: string;
  title: string;
  status: IntakeStatus;
  statusLabel: string;
  company: string;
  contactName: string;
  email: string;
  buyerType: string;
  city: string;
  venue: string;
  budgetLabel: string;
  timelineLabel: string;
  goal: string;
  packageId: string;
  website: string;
  notes: string;
  amount: number | null;
  ageHours: number;
  occurredAt: string;
  updatedAt: string;
  assignedCreator: string;
  assignedVenue: string;
  operatorNote: string;
  nextActionAt: string;
  positioningLine: string;
  proofLogic: string;
  repeatMetric: string;
  replyDraft: string;
  sparkRoutePacket: string;
  invoiceMemo: string;
  missionIdeas: Array<{
    title: string;
    detail: string;
    proofMetric: string;
  }>;
  creatorRecommendations: Array<{
    tag: string;
    score: number;
    trustScore: number;
    trustLabel: string;
    status: string;
    totalEarned: number;
    completedDares: number;
    venueReach: number;
    firstMarks: number;
    reviews: number;
    reasons: string[];
    createHref: string;
  }>;
  links: {
    createHref: string;
    scoutHref: string;
    mailtoHref: string | null;
  };
};

type IntakePayload = {
  summary: {
    total: number;
    active: number;
    readyToInvoice: number;
    needsInfo: number;
    launched: number;
    byStatus: Record<IntakeStatus, number>;
  };
  intakes: ActivationIntake[];
};

type IntakeDraft = {
  assignedCreator?: string;
  assignedVenue?: string;
  operatorNote?: string;
  nextActionAt?: string;
};

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'NEW', label: 'New' },
  { key: 'QUALIFIED', label: 'Qualified' },
  { key: 'NEEDS_INFO', label: 'Needs info' },
  { key: 'READY_TO_INVOICE', label: 'Ready invoice' },
  { key: 'LAUNCHED', label: 'Launched' },
  { key: 'REJECTED', label: 'Rejected' },
];

function statusClass(status: IntakeStatus) {
  if (status === 'NEW') return 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100';
  if (status === 'QUALIFIED') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
  if (status === 'NEEDS_INFO') return 'border-yellow-300/30 bg-yellow-300/10 text-yellow-100';
  if (status === 'READY_TO_INVOICE') return 'border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100';
  if (status === 'LAUNCHED') return 'border-white/15 bg-white/10 text-white';
  return 'border-red-300/25 bg-red-400/10 text-red-100';
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatNextActionInput(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoFromLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function ActivationIntakesPage() {
  const { address, isConnected } = useAccount();
  const [payload, setPayload] = useState<IntakePayload | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [drafts, setDrafts] = useState<Record<string, IntakeDraft>>({});
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    adminSecret,
    setAdminSecret,
    ensureAdminSession,
    clearAdminSecret,
    hasAdminSession,
  } = useSessionAdminSecret();

  const adminSecretTrimmed = adminSecret.trim();
  const hasAdminAuth = Boolean(address || hasAdminSession || adminSecretTrimmed);
  const hasReadyAdminAuth = Boolean(address || hasAdminSession);
  const adminAuthHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (address) headers['x-moderator-wallet'] = address;
    return headers;
  }, [address]);

  const loadIntakes = useCallback(async () => {
    if (!hasAdminAuth) return;

    setLoading(true);
    setError(null);

    try {
      if (!address && !(await ensureAdminSession())) {
        throw new Error('Invalid admin secret');
      }

      const response = await fetch('/api/admin/activation-intakes', {
        headers: adminAuthHeaders,
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.hint || data.error || 'Unable to load activation intakes');
      }

      setPayload(data.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load activation intakes');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [address, adminAuthHeaders, ensureAdminSession, hasAdminAuth]);

  useEffect(() => {
    const leadId = new URLSearchParams(window.location.search).get('leadId');
    setHighlightId(leadId);
  }, []);

  useEffect(() => {
    if (!hasReadyAdminAuth) return;
    void loadIntakes();
  }, [hasReadyAdminAuth, loadIntakes]);

  const filteredIntakes = useMemo(() => {
    const intakes = payload?.intakes ?? [];
    if (statusFilter === 'ALL') return intakes;
    return intakes.filter((intake) => intake.status === statusFilter);
  }, [payload?.intakes, statusFilter]);

  const updateDraft = (id: string, patch: IntakeDraft) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  };

  const replaceIntake = (nextIntake: ActivationIntake) => {
    setPayload((current) => {
      if (!current) return current;
      const nextIntakes = current.intakes.map((intake) => (intake.id === nextIntake.id ? nextIntake : intake));
      const byStatus = nextIntakes.reduce(
        (acc, intake) => ({
          ...acc,
          [intake.status]: (acc[intake.status] ?? 0) + 1,
        }),
        {
          NEW: 0,
          QUALIFIED: 0,
          NEEDS_INFO: 0,
          READY_TO_INVOICE: 0,
          LAUNCHED: 0,
          REJECTED: 0,
        } as Record<IntakeStatus, number>
      );
      return {
        summary: {
          total: nextIntakes.length,
          active: nextIntakes.filter((intake) => !['LAUNCHED', 'REJECTED'].includes(intake.status)).length,
          readyToInvoice: byStatus.READY_TO_INVOICE,
          needsInfo: byStatus.NEEDS_INFO,
          launched: byStatus.LAUNCHED,
          byStatus,
        },
        intakes: nextIntakes,
      };
    });
  };

  const updateIntake = async (
    id: string,
    patch: Partial<Omit<IntakeDraft, 'nextActionAt'>> & { nextActionAt?: string | null; status?: IntakeStatus }
  ) => {
    setUpdatingId(id);
    setError(null);

    try {
      const response = await fetch('/api/admin/activation-intakes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          id,
          ...patch,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to update intake');
      }

      replaceIntake(data.data);
      setDrafts((current) => ({ ...current, [id]: {} }));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update intake');
    } finally {
      setUpdatingId(null);
    }
  };

  const saveOps = async (intake: ActivationIntake) => {
    const draft = drafts[intake.id] ?? {};
    await updateIntake(intake.id, {
      assignedCreator: draft.assignedCreator ?? intake.assignedCreator,
      assignedVenue: draft.assignedVenue ?? intake.assignedVenue,
      operatorNote: draft.operatorNote ?? intake.operatorNote,
      nextActionAt: toIsoFromLocal(draft.nextActionAt ?? formatNextActionInput(intake.nextActionAt)),
    });
  };

  const copyText = async (copyKey: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(copyKey);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setError('Clipboard permission failed. Select and copy the text manually.');
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03040a] px-4 py-10 text-white sm:px-6 lg:px-10">
      <LiquidBackground />
      <GradualBlurOverlay />

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col gap-7">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <Link
              href="/admin"
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/70 transition hover:border-white/25 hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Back to admin
            </Link>
            <p className="text-xs font-black uppercase tracking-[0.36em] text-yellow-200/70">
              Paid activation pipeline
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase italic tracking-[-0.05em] sm:text-6xl">
              Intake <span className="text-yellow-300">Queue</span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-white/55 sm:text-base">
              Convert activation interest into a concrete route: qualify the buyer, assign venue and creator,
              copy a reply, then move the lead toward invoice or launch.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-3 text-yellow-100">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                  Operator boundary
                </p>
                <p className="max-w-sm text-sm font-black text-white">
                  Draft and qualify here. Funding, invoices, and public commitments stay human-approved.
                </p>
              </div>
            </div>
          </div>
        </div>

        {!hasReadyAdminAuth && (
          <div className="rounded-[2rem] border border-yellow-300/25 bg-yellow-300/10 p-6 text-sm font-bold text-yellow-100">
            Connect a moderator wallet or paste the admin secret to view activation leads.
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
              Admin secret
            </span>
            <input
              type="password"
              value={adminSecret}
              onChange={(event) => setAdminSecret(event.target.value)}
              placeholder={hasAdminSession ? 'Session active' : 'Paste ADMIN_SECRET'}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-yellow-300/40"
            />
          </label>
          <button
            type="button"
            onClick={() => void loadIntakes()}
            disabled={loading || !hasAdminAuth}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/30 bg-yellow-300/12 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:bg-yellow-300/18 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Load queue
          </button>
          {hasAdminSession && (
            <button
              type="button"
              onClick={() => void clearAdminSecret()}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/[0.08]"
            >
              Clear session
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-[1.5rem] border border-red-300/25 bg-red-500/10 p-4 text-sm font-bold text-red-100">
            {error}
          </div>
        )}

        {payload && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: 'Total leads', value: payload.summary.total, icon: Search },
                { label: 'Active', value: payload.summary.active, icon: ShieldCheck },
                { label: 'Needs info', value: payload.summary.needsInfo, icon: Clock3 },
                { label: 'Ready invoice', value: payload.summary.readyToInvoice, icon: DollarSign },
                { label: 'Launched', value: payload.summary.launched, icon: CheckCircle2 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-[1.7rem] border border-white/10 bg-black/42 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    <Icon className="h-4 w-4 text-yellow-200/75" />
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.26em] text-white/38">{item.label}</p>
                    <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-white">{item.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                    statusFilter === filter.key
                      ? 'border-yellow-200/40 bg-yellow-300/15 text-yellow-100'
                      : 'border-white/10 bg-white/[0.04] text-white/48 hover:bg-white/[0.08] hover:text-white/75'
                  }`}
                >
                  {filter.label}
                  {filter.key !== 'ALL' ? ` ${payload.summary.byStatus[filter.key] ?? 0}` : ''}
                </button>
              ))}
            </div>

            <div className="grid gap-5">
              {filteredIntakes.map((intake) => {
                const draft = drafts[intake.id] ?? {};
                const assignedCreator = draft.assignedCreator ?? intake.assignedCreator;
                const assignedVenue = draft.assignedVenue ?? intake.assignedVenue;
                const operatorNote = draft.operatorNote ?? intake.operatorNote;
                const nextActionAt = draft.nextActionAt ?? formatNextActionInput(intake.nextActionAt);
                const isUpdating = updatingId === intake.id;
                const isHighlighted = highlightId === intake.id;

                return (
                  <article
                    key={intake.id}
                    className={`rounded-[2rem] border bg-black/50 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_90px_rgba(0,0,0,0.38)] ${
                      isHighlighted ? 'border-yellow-200/45' : 'border-white/10'
                    }`}
                  >
                    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusClass(intake.status)}`}>
                            {intake.statusLabel}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                            {intake.ageHours}h old
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                            {intake.budgetLabel}
                          </span>
                        </div>

                        <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
                          {intake.company || 'Unnamed activation'}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-white/58">
                          {intake.positioningLine || `${intake.buyerType || 'Buyer'} wants activation in ${intake.city || 'the grid'}.`}
                        </p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          {[
                            ['Contact', `${intake.contactName || 'Unknown'} · ${intake.email || 'no email'}`],
                            ['Target', `${intake.assignedVenue || intake.venue || 'Venue TBD'}${intake.city ? ` · ${intake.city}` : ''}`],
                            ['Timeline', intake.timelineLabel],
                            ['Goal', intake.goal.replace(/_/g, ' ') || 'goal TBD'],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">{label}</p>
                              <p className="mt-2 text-sm font-black text-white/82">{value}</p>
                            </div>
                          ))}
                        </div>

                        {intake.missionIdeas.length > 0 && (
                          <div className="mt-5 rounded-[1.5rem] border border-yellow-200/12 bg-yellow-300/[0.05] p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/60">
                              Venue-aware mission ideas
                            </p>
                            <div className="mt-3 grid gap-2">
                              {intake.missionIdeas.slice(0, 3).map((mission) => (
                                <div key={`${mission.title}-${mission.detail}`} className="rounded-2xl border border-white/10 bg-black/35 p-3">
                                  <p className="text-sm font-black text-white">{mission.title}</p>
                                  <p className="mt-1 text-xs font-bold leading-5 text-white/52">{mission.detail}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label>
                            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">Assigned venue</span>
                            <input
                              value={assignedVenue}
                              onChange={(event) => updateDraft(intake.id, { assignedVenue: event.target.value })}
                              placeholder="Venue name"
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-yellow-300/35"
                            />
                          </label>
                          <label>
                            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">Assigned creator</span>
                            <input
                              value={assignedCreator}
                              onChange={(event) => updateDraft(intake.id, { assignedCreator: event.target.value })}
                              placeholder="@creator"
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-yellow-300/35"
                            />
                          </label>
                        </div>

                        {intake.creatorRecommendations.length > 0 && (
                          <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
                                  Creator match
                                </p>
                                <p className="mt-1 text-sm font-black text-white">
                                  Best routes for this activation
                                </p>
                              </div>
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
                                {intake.creatorRecommendations.length} ranked
                              </span>
                            </div>
                            <div className="mt-4 grid gap-2">
                              {intake.creatorRecommendations.slice(0, 3).map((creator) => (
                                <div
                                  key={`${intake.id}-${creator.tag}`}
                                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-black text-white">{creator.tag}</p>
                                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
                                        Fit {creator.score} / Trust {creator.trustScore} / {creator.trustLabel}
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => updateDraft(intake.id, { assignedCreator: creator.tag })}
                                        className="rounded-full border border-white/10 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-black transition hover:bg-white/85"
                                      >
                                        Assign
                                      </button>
                                      <Link
                                        href={creator.createHref}
                                        className="rounded-full border border-yellow-300/25 bg-yellow-300/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100 transition hover:bg-yellow-300/18"
                                      >
                                        Route
                                      </Link>
                                    </div>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-1.5">
                                    {creator.reasons.map((reason) => (
                                      <span
                                        key={reason}
                                        className="rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/45"
                                      >
                                        {reason}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">Next action</span>
                          <input
                            type="datetime-local"
                            value={nextActionAt}
                            onChange={(event) => updateDraft(intake.id, { nextActionAt: event.target.value })}
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-bold text-white outline-none focus:border-yellow-300/35"
                          />
                        </label>

                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">Operator note</span>
                          <textarea
                            value={operatorNote}
                            onChange={(event) => updateDraft(intake.id, { operatorNote: event.target.value })}
                            rows={4}
                            placeholder="Qualification notes, objection, invoice state, next move..."
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-bold leading-6 text-white outline-none placeholder:text-white/25 focus:border-yellow-300/35"
                          />
                        </label>

                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          <button
                            type="button"
                            onClick={() => void saveOps(intake)}
                            disabled={isUpdating}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/[0.12] disabled:opacity-45"
                          >
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            Save ops
                          </button>
                          <button
                            type="button"
                            onClick={() => void copyText(`${intake.id}:reply`, intake.replyDraft)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-300/15"
                          >
                            <Clipboard className="h-4 w-4" />
                            {copiedId === `${intake.id}:reply` ? 'Copied' : 'Reply'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void copyText(`${intake.id}:packet`, intake.sparkRoutePacket)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100 transition hover:bg-yellow-300/15"
                          >
                            <FileText className="h-4 w-4" />
                            {copiedId === `${intake.id}:packet` ? 'Copied' : 'Packet'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void copyText(`${intake.id}:invoice`, intake.invoiceMemo)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-100 transition hover:bg-fuchsia-300/15"
                          >
                            <DollarSign className="h-4 w-4" />
                            {copiedId === `${intake.id}:invoice` ? 'Copied' : 'Invoice'}
                          </button>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                          {(['QUALIFIED', 'NEEDS_INFO', 'READY_TO_INVOICE'] as IntakeStatus[]).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => void updateIntake(intake.id, { status })}
                              disabled={isUpdating}
                              className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/65 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-45"
                            >
                              {status === 'READY_TO_INVOICE' ? 'Invoice' : status.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                          <Link
                            href={intake.links.createHref}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/25 bg-yellow-300/12 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100 transition hover:bg-yellow-300/18"
                          >
                            <Send className="h-4 w-4" />
                            Create
                          </Link>
                          <Link
                            href={intake.links.scoutHref}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/72 transition hover:bg-white/[0.1]"
                          >
                            <UserRoundSearch className="h-4 w-4" />
                            Scout
                          </Link>
                          {intake.links.mailtoHref ? (
                            <a
                              href={intake.links.mailtoHref}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/72 transition hover:bg-white/[0.1]"
                            >
                              <Mail className="h-4 w-4" />
                              Email
                            </a>
                          ) : (
                            <span className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/25">
                              No email
                            </span>
                          )}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => void updateIntake(intake.id, { status: 'LAUNCHED' })}
                            disabled={isUpdating}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-45"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Mark launched
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateIntake(intake.id, { status: 'REJECTED' })}
                            disabled={isUpdating}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-400/15 disabled:opacity-45"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {filteredIntakes.length === 0 && (
              <div className="rounded-[2rem] border border-white/10 bg-black/42 p-10 text-center">
                <Lock className="mx-auto h-8 w-8 text-white/35" />
                <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-white/45">
                  No activation intakes in this lane.
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
