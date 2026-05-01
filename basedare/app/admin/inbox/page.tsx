'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BellRing, Inbox, Loader2, Lock, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { useAccount } from 'wagmi';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';

type AdminSupportThread = {
  id: string;
  subject: string;
  requesterWallet: string;
  participantWallets: string[];
  status: string;
  unreadCount: number;
  lastMessageAt: string;
  lastMessage: {
    body: string;
    fromAdmin: boolean;
    createdAt: string;
  } | null;
};

type AdminSupportMessage = {
  id: string;
  senderWallet: string;
  senderLabel: string;
  body: string;
  redacted: boolean;
  fromAdmin: boolean;
  createdAt: string;
};

type AdminInboxPayload = {
  threads: AdminSupportThread[];
  activeThread: AdminSupportThread | null;
  messages: AdminSupportMessage[];
};

function shortWallet(wallet: string) {
  if (!wallet || wallet === 'unknown') return 'unknown';
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminInboxPage() {
  const { address } = useAccount();
  const {
    adminSecret,
    setAdminSecret,
    ensureAdminSession,
    clearAdminSecret,
    hasAdminSession,
    hasSessionAdminSecret,
  } = useSessionAdminSecret();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [payload, setPayload] = useState<AdminInboxPayload | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const adminSecretTrimmed = adminSecret.trim();
  const hasAdminAuth = Boolean(address || hasAdminSession || adminSecretTrimmed);
  const hasReadyAdminAuth = Boolean(address || hasAdminSession);
  const activeThread = payload?.activeThread ?? null;
  const threads = payload?.threads ?? [];
  const messages = payload?.messages ?? [];

  const adminAuthHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (adminSecretTrimmed) {
      headers['x-admin-secret'] = adminSecretTrimmed;
      return headers;
    }
    if (address) {
      headers['x-moderator-wallet'] = address.toLowerCase();
    }
    return headers;
  }, [address, adminSecretTrimmed]);

  const ensureAdminAccess = useCallback(async () => {
    if (address || hasAdminSession) return true;
    return ensureAdminSession();
  }, [address, ensureAdminSession, hasAdminSession]);

  const loadInbox = useCallback(
    async (threadId = activeThreadId, quiet = false) => {
      if (!hasAdminAuth) return;

      if (!quiet) {
        setLoading(true);
        setError(null);
      }

      try {
        if (!(await ensureAdminAccess())) {
          throw new Error('Admin session required.');
        }

        const params = new URLSearchParams();
        if (threadId) params.set('threadId', threadId);
        const response = await fetch(`/api/admin/inbox${params.toString() ? `?${params.toString()}` : ''}`, {
          headers: adminAuthHeaders,
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Unable to load admin inbox');
        }

        setPayload(data.data);
        setActiveThreadId(data.data.activeThread?.id ?? threadId ?? null);
        setLastSyncedAt(new Date());
      } catch (loadError) {
        if (!quiet) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load admin inbox');
        }
      } finally {
        if (!quiet) {
          setLoading(false);
        }
      }
    },
    [activeThreadId, adminAuthHeaders, ensureAdminAccess, hasAdminAuth]
  );

  useEffect(() => {
    if (!hasReadyAdminAuth) return;
    void loadInbox(null, false);
  }, [hasReadyAdminAuth, loadInbox]);

  useEffect(() => {
    if (!hasReadyAdminAuth || !activeThreadId) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || sending) return;
      void loadInbox(activeThreadId, true);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [activeThreadId, hasReadyAdminAuth, loadInbox, sending]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const selectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    void loadInbox(threadId, false);
  };

  const sendReply = async () => {
    if (!activeThreadId || !reply.trim()) return;

    setSending(true);
    setError(null);

    try {
      if (!(await ensureAdminAccess())) {
        throw new Error('Admin session required.');
      }

      const response = await fetch('/api/admin/inbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          threadId: activeThreadId,
          body: reply,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Reply failed');
      }

      setReply('');
      await loadInbox(activeThreadId, true);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Reply failed');
    } finally {
      setSending(false);
    }
  };

  const syncLabel = lastSyncedAt
    ? `Synced ${lastSyncedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : 'Support sync ready';

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03040a] px-4 py-8 text-white sm:px-6 lg:px-10">
      <LiquidBackground />
      <GradualBlurOverlay />

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/55 transition hover:bg-white/[0.09] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Admin
            </Link>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100/75">
              <Inbox className="h-3.5 w-3.5" />
              Support Inbox
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase italic tracking-[-0.06em] sm:text-6xl">
              Admin <span className="text-emerald-100">live support</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/55">
              User support messages from `/chat?support=1` land here. Replies go back into the same
              wallet-scoped user inbox and trigger the existing notification rail.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-300/10 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/75">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.75)]" />
              {syncLabel}
            </div>
            <button
              type="button"
              onClick={() => void loadInbox(activeThreadId, false)}
              disabled={!hasAdminAuth || loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/65 transition hover:bg-white/[0.09] disabled:opacity-45"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>

        {!hasReadyAdminAuth ? (
          <div className="rounded-[2rem] border border-yellow-300/20 bg-yellow-300/10 p-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-yellow-100/80">
              Admin access required
            </p>
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                value={adminSecret}
                onChange={(event) => setAdminSecret(event.target.value)}
                placeholder={hasAdminSession ? 'Session active' : 'Paste ADMIN_SECRET'}
                className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-black/45 px-4 text-sm font-bold text-white outline-none placeholder:text-white/28 focus:border-yellow-300/35"
              />
              <button
                type="button"
                onClick={() => void loadInbox(activeThreadId, false)}
                disabled={!hasAdminAuth || loading}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-yellow-300 px-5 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-200 disabled:opacity-45"
              >
                Open support inbox
              </button>
              {hasSessionAdminSecret ? (
                <button
                  type="button"
                  onClick={() => void clearAdminSecret()}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] px-5 text-xs font-black uppercase tracking-[0.16em] text-white/60 transition hover:text-white"
                >
                  Clear session
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[1.5rem] border border-red-300/25 bg-red-500/10 p-4 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}

        <div className="grid min-h-[68vh] gap-5 lg:grid-cols-[23rem_1fr]">
          <aside className="flex min-h-0 flex-col gap-3 rounded-[2rem] border border-white/10 bg-black/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_90px_rgba(0,0,0,0.35)]">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-100/75" />
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">
                  Admin queue
                </p>
              </div>
              <p className="mt-2 text-xs font-bold leading-5 text-white/45">
                Replies are saved in the same user inbox thread. Contact details remain redacted.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]">
              {threads.length === 0 ? (
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 text-center">
                  <BellRing className="mx-auto h-8 w-8 text-white/25" />
                  <p className="mt-3 text-sm font-black text-white/70">No support threads yet.</p>
                  <p className="mt-1 text-xs leading-5 text-white/38">
                    User messages from the support lane will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {threads.map((thread) => {
                    const active = activeThread?.id === thread.id || activeThreadId === thread.id;
                    return (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => selectThread(thread.id)}
                        className={`w-full rounded-[1.35rem] border p-3 text-left transition ${
                          active
                            ? 'border-emerald-300/35 bg-emerald-300/[0.09] shadow-[0_0_24px_rgba(110,231,183,0.08)]'
                            : 'border-white/10 bg-white/[0.035] hover:bg-white/[0.065]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-black text-white">{thread.subject}</p>
                            <p className="mt-1 line-clamp-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/34">
                              {shortWallet(thread.requesterWallet)}
                            </p>
                          </div>
                          {thread.unreadCount > 0 ? (
                            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-red-500 px-2 text-[10px] font-black text-white">
                              {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                            </span>
                          ) : null}
                        </div>
                        {thread.lastMessage ? (
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/45">
                            {thread.lastMessage.fromAdmin ? 'Admin: ' : 'User: '}
                            {thread.lastMessage.body}
                          </p>
                        ) : null}
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/28">
                          {formatTime(thread.lastMessageAt)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-black/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_90px_rgba(0,0,0,0.35)]">
            <div className="shrink-0 border-b border-white/8 bg-white/[0.045] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100/55">
                {activeThread ? shortWallet(activeThread.requesterWallet) : 'No thread selected'}
              </p>
              <h2 className="mt-1 truncate text-2xl font-black tracking-[-0.04em] text-white">
                {activeThread?.subject || 'Support queue'}
              </h2>
              <p className="mt-1 text-xs font-bold leading-5 text-white/42">
                {activeThread
                  ? `Participants: ${activeThread.participantWallets.map(shortWallet).join(' / ')}`
                  : 'Select a support thread to reply.'}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 [-webkit-overflow-scrolling:touch]">
              {loading && !payload ? (
                <div className="grid h-full min-h-[24rem] place-items-center">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-100/70" />
                    <p className="mt-3 text-sm font-black uppercase tracking-[0.2em] text-white/40">Loading support</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="grid h-full min-h-[24rem] place-items-center">
                  <div className="max-w-md text-center">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.4rem] border border-emerald-300/18 bg-emerald-300/10 text-emerald-100">
                      <Inbox className="h-7 w-7" />
                    </div>
                    <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-white">
                      Support lives here.
                    </h3>
                    <p className="mt-2 text-sm font-bold leading-6 text-white/45">
                      Once users send from the support lane, the conversation and reply history will stay attached to their wallet.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((entry) => (
                    <div key={entry.id} className={`flex ${entry.fromAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-[1.35rem] border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
                          entry.fromAdmin
                            ? 'border-emerald-300/20 bg-emerald-300/[0.11] text-emerald-50'
                            : 'border-white/10 bg-white/[0.055] text-white'
                        }`}
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
                            {entry.senderLabel}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/24">
                            {formatTime(entry.createdAt)}
                          </span>
                          {entry.redacted ? (
                            <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-yellow-100/70">
                              Contact blocked
                            </span>
                          ) : null}
                        </div>
                        <p className="whitespace-pre-wrap text-sm font-bold leading-6 text-white/78">{entry.body}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/8 bg-black/35 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                <Lock className="h-3.5 w-3.5 text-emerald-100/70" />
                Admin guarded
                <span className="text-white/18">/</span>
                User notified on reply
                <span className="text-white/18">/</span>
                Contact details blocked
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder={activeThread ? 'Reply as BaseDare Support...' : 'Select a thread first...'}
                  rows={2}
                  className="min-h-14 flex-1 resize-none rounded-[1.25rem] border border-white/10 bg-black/55 px-4 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-white/25 focus:border-emerald-300/35"
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                      void sendReply();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void sendReply()}
                  disabled={!activeThreadId || sending || !reply.trim()}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[1.25rem] border border-emerald-300/24 bg-[linear-gradient(180deg,rgba(167,243,208,0.18),rgba(5,150,105,0.16))] px-5 text-xs font-black uppercase tracking-[0.18em] text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_14px_32px_rgba(0,0,0,0.3)] transition hover:bg-emerald-300/[0.16] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Reply
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
