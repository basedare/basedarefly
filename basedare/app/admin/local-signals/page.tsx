'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Radio, RefreshCw, Send, ShieldCheck, XCircle } from 'lucide-react';
import { useAccount } from 'wagmi';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';

type LocalSignalStatus = 'NEW' | 'APPROVED' | 'REJECTED';
type StatusFilter = LocalSignalStatus | 'ALL';

type LocalSignalItem = {
  id: string;
  title: string;
  status: LocalSignalStatus;
  category: string;
  venueName: string;
  city: string;
  notes: string;
  sourceUrl: string;
  startsAt: string | null;
  endsAt: string | null;
  latitude: number | null;
  longitude: number | null;
  submittedBy: string;
  operatorNote: string;
  createdAt: string;
  updatedAt: string;
};

type LocalSignalPayload = {
  signals: LocalSignalItem[];
  summary: {
    total: number;
    new: number;
    approved: number;
    rejected: number;
  };
};

const FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'NEW', label: 'New' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

function statusClass(status: LocalSignalStatus) {
  if (status === 'APPROVED') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
  if (status === 'REJECTED') return 'border-red-300/25 bg-red-400/10 text-red-100';
  return 'border-yellow-300/30 bg-yellow-300/10 text-yellow-100';
}

function formatDateTime(value: string | null) {
  if (!value) return 'Now / check locally';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Now / check locally';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function signalLocation(signal: LocalSignalItem) {
  const parts = [signal.venueName, signal.city].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  if (typeof signal.latitude === 'number' && typeof signal.longitude === 'number') {
    return `${signal.latitude.toFixed(4)}, ${signal.longitude.toFixed(4)}`;
  }
  return 'No exact place attached';
}

export default function AdminLocalSignalsPage() {
  const { address } = useAccount();
  const {
    adminSecret,
    setAdminSecret,
    ensureAdminSession,
    clearAdminSecret,
    hasAdminSession,
    hasSessionAdminSecret,
  } = useSessionAdminSecret();
  const [filter, setFilter] = useState<StatusFilter>('NEW');
  const [payload, setPayload] = useState<LocalSignalPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [operatorNotes, setOperatorNotes] = useState<Record<string, string>>({});

  const adminSecretTrimmed = adminSecret.trim();
  const hasAdminAuth = Boolean(address || hasAdminSession || adminSecretTrimmed);
  const hasReadyAdminAuth = Boolean(address || hasAdminSession);
  const adminAuthHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (address) {
      headers['x-moderator-wallet'] = address;
    }
    return headers;
  }, [address]);

  const selectedSignalId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('signalId') || '';
  }, []);

  const loadSignals = useCallback(async () => {
    if (!hasAdminAuth) {
      setError('Admin auth required. Open /admin once with your admin secret.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (!address && !(await ensureAdminSession())) {
        throw new Error('Invalid admin secret');
      }

      const params = new URLSearchParams();
      params.set('status', filter);
      const response = await fetch(`/api/admin/local-signals?${params.toString()}`, {
        headers: adminAuthHeaders,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to load local signals');
      }

      setPayload(data.data);
      setOperatorNotes((current) => {
        const next = { ...current };
        (data.data.signals as LocalSignalItem[]).forEach((signal) => {
          if (next[signal.id] === undefined) {
            next[signal.id] = signal.operatorNote || '';
          }
        });
        return next;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load local signals');
    } finally {
      setLoading(false);
    }
  }, [address, adminAuthHeaders, ensureAdminSession, filter, hasAdminAuth]);

  useEffect(() => {
    if (!hasReadyAdminAuth) return;
    void loadSignals();
  }, [hasReadyAdminAuth, loadSignals]);

  const updateSignal = useCallback(async (signal: LocalSignalItem, status: LocalSignalStatus, broadcast = false) => {
    if (!hasAdminAuth) return;

    setUpdatingId(signal.id);
    setError(null);
    try {
      if (!address && !(await ensureAdminSession())) {
        throw new Error('Invalid admin secret');
      }

      const response = await fetch('/api/admin/local-signals', {
        method: 'PATCH',
        headers: {
          ...adminAuthHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: signal.id,
          status,
          operatorNote: operatorNotes[signal.id] || '',
          broadcast,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to update local signal');
      }
      await loadSignals();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update local signal');
    } finally {
      setUpdatingId(null);
    }
  }, [address, adminAuthHeaders, ensureAdminSession, hasAdminAuth, loadSignals, operatorNotes]);

  const signals = payload?.signals ?? [];
  const sortedSignals = selectedSignalId
    ? [...signals].sort((a, b) => (a.id === selectedSignalId ? -1 : b.id === selectedSignalId ? 1 : 0))
    : signals;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060f] px-4 py-24 text-white sm:px-6 lg:px-8">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 hidden pointer-events-none md:block">
        <GradualBlurOverlay />
      </div>

      <section className="relative z-20 mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full border border-cyan-200/20 bg-cyan-300/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70">
              Signal Ops
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase italic tracking-[-0.06em] md:text-6xl">
              Local Signal Queue
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/56">
              Review tourist tips, venue events, surf checks, nightlife signals, and local happenings before they hit
              the map or the public Signal Room.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/map"
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/68 transition hover:border-white/20 hover:text-white"
            >
              Open map
            </Link>
            <button
              type="button"
              onClick={() => void loadSignals()}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-200/34"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {!hasReadyAdminAuth ? (
          <div className="mt-6 grid gap-3 rounded-[24px] border border-yellow-300/18 bg-yellow-300/[0.06] p-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label>
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-100/56">
                Admin secret fallback
              </span>
              <input
                type="password"
                value={adminSecret}
                onChange={(event) => setAdminSecret(event.target.value)}
                placeholder="Paste ADMIN_SECRET"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/24 focus:border-yellow-200/34"
              />
              {hasSessionAdminSecret ? (
                <button
                  type="button"
                  onClick={() => void clearAdminSecret()}
                  className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100/62 hover:text-yellow-100"
                >
                  Clear session
                </button>
              ) : null}
            </label>
            <button
              type="button"
              onClick={() => void loadSignals()}
              disabled={!hasAdminAuth || loading}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-yellow-200/28 bg-yellow-300/[0.16] px-5 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:border-yellow-200/44 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Authorize queue
            </button>
          </div>
        ) : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          {[
            ['New', payload?.summary.new ?? 0],
            ['Approved', payload?.summary.approved ?? 0],
            ['Rejected', payload?.summary.rejected ?? 0],
            ['Loaded', payload?.summary.total ?? 0],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-[24px] border border-white/10 bg-black/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_42px_rgba(0,0,0,0.24)]"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">{label}</p>
              <p className="mt-2 text-3xl font-black tracking-[-0.05em]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              data-active={filter === item.key}
              onClick={() => setFilter(item.key)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/48 transition hover:border-white/18 hover:text-white data-[active=true]:border-yellow-300/30 data-[active=true]:bg-yellow-300/[0.1] data-[active=true]:text-yellow-100"
            >
              {item.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4">
          {loading ? (
            <div className="rounded-[30px] border border-white/10 bg-black/44 p-8 text-center text-white/50">
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.2em]">Loading signals</p>
            </div>
          ) : sortedSignals.length ? (
            sortedSignals.map((signal) => (
              <article
                key={signal.id}
                className="relative isolate overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055)_0%,rgba(8,9,18,0.94)_100%)] p-4 shadow-[0_22px_56px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.1)] md:p-5"
              >
                <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />
                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${statusClass(signal.status)}`}>
                        {signal.status}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/50">
                        {signal.category}
                      </span>
                      <span className="rounded-full border border-cyan-200/15 bg-cyan-300/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/70">
                        {formatDateTime(signal.startsAt)}
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white">{signal.title}</h2>
                    <p className="mt-2 text-sm font-bold text-white/58">{signalLocation(signal)}</p>
                    {signal.notes ? (
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/56">{signal.notes}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/36">
                      <span>Submitted {formatDateTime(signal.createdAt)}</span>
                      {signal.submittedBy ? <span>From {signal.submittedBy}</span> : null}
                      {signal.sourceUrl ? (
                        <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-100/70 hover:text-cyan-100">
                          Source
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <textarea
                      value={operatorNotes[signal.id] ?? ''}
                      onChange={(event) => setOperatorNotes((current) => ({ ...current, [signal.id]: event.target.value }))}
                      placeholder="Operator note..."
                      className="min-h-[96px] w-full resize-none rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/24 focus:border-cyan-200/30"
                    />
                    <div className="grid gap-2">
                      <button
                        type="button"
                        disabled={updatingId === signal.id}
                        onClick={() => updateSignal(signal, 'APPROVED', true)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-yellow-200/28 bg-yellow-300/[0.14] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:border-yellow-200/45 disabled:opacity-50"
                      >
                        {updatingId === signal.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />}
                        Approve + broadcast
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={updatingId === signal.id}
                          onClick={() => updateSignal(signal, 'APPROVED', false)}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-emerald-200/22 bg-emerald-300/[0.1] px-3 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-200/38 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === signal.id}
                          onClick={() => updateSignal(signal, 'REJECTED', false)}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-200/22 bg-red-400/[0.1] px-3 text-[10px] font-black uppercase tracking-[0.16em] text-red-100 transition hover:border-red-200/38 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[30px] border border-white/10 bg-black/44 p-8 text-center">
              <ShieldCheck className="mx-auto h-6 w-6 text-white/36" />
              <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-white/56">
                No local signals in this queue
              </p>
              <p className="mt-2 text-sm text-white/40">Submitted local happenings will land here before going public.</p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-black/36 p-4 text-sm leading-6 text-white/46">
          <div className="flex items-start gap-3">
            <Send className="mt-1 h-4 w-4 shrink-0 text-cyan-100/60" />
            <p>
              Approval publishes the signal to the map. Broadcast sends it to the public Signal Room. Keep anything
              uncertain as approved-only until you have checked the venue or local source.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
