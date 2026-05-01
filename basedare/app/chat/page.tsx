'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSignMessage } from 'wagmi';
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Inbox,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
} from 'lucide-react';
import { isAddress } from 'viem';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';

type InboxThread = {
  id: string;
  type: string;
  subject: string;
  counterpartWallets: string[];
  participantWallets: string[];
  unreadCount: number;
  lastMessageAt: string;
  lastMessage: {
    body: string;
    mine: boolean;
    createdAt: string;
  } | null;
  context: {
    label: string;
    venue: { name: string; href: string; city: string | null; country: string | null } | null;
    dare: { title: string; href: string; status: string } | null;
    campaign: { title: string; href: string; status: string } | null;
  };
};

type InboxMessage = {
  id: string;
  senderWallet: string;
  body: string;
  redacted: boolean;
  mine: boolean;
  createdAt: string;
};

type InboxPayload = {
  threads: InboxThread[];
  activeThread: InboxThread | null;
  messages: InboxMessage[];
};

type WalletSession = {
  token?: string | null;
};

function shortWallet(wallet: string) {
  if (!wallet) return 'unknown';
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

function initialTarget(searchParams: URLSearchParams) {
  return (
    searchParams.get('to') ||
    searchParams.get('wallet') ||
    searchParams.get('creator') ||
    searchParams.get('tag') ||
    ''
  );
}

function ChatInbox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, sessionWallet, isConnected } = useActiveWallet();
  const { data: session } = useSession();
  const { signMessageAsync } = useSignMessage();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [payload, setPayload] = useState<InboxPayload | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(searchParams.get('threadId'));
  const [target, setTarget] = useState(() => initialTarget(searchParams));
  const [subject, setSubject] = useState(() => searchParams.get('subject') || '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const sessionToken = (session as WalletSession | null)?.token ?? null;
  const normalizedAddress = address?.toLowerCase() ?? null;
  const activeThread = payload?.activeThread ?? null;
  const threads = payload?.threads ?? [];
  const messages = payload?.messages ?? [];
  const venueSlug = searchParams.get('venue') || searchParams.get('venueSlug') || '';
  const dareId = searchParams.get('dareId') || searchParams.get('dare') || '';
  const campaignId = searchParams.get('campaignId') || searchParams.get('campaign') || '';
  const supportMode = searchParams.get('support') === '1' || searchParams.get('mode') === 'support';
  const activeSupportThread = activeThread?.type === 'SUPPORT';
  const hasContext = Boolean(venueSlug || dareId || campaignId || supportMode);

  const getWalletAuthHeaders = useCallback(
    async (action: string, resource: string, allowSignPrompt = false) => {
      if (!normalizedAddress) return {};

      return buildWalletActionAuthHeaders({
        walletAddress: normalizedAddress,
        sessionToken,
        sessionWallet,
        action,
        resource,
        allowSignPrompt,
        signMessageAsync,
      });
    },
    [normalizedAddress, sessionToken, sessionWallet, signMessageAsync]
  );

  const loadInbox = useCallback(
    async (threadId = activeThreadId, allowSignPrompt = false, quiet = false) => {
      if (!normalizedAddress) return;

      if (!quiet) {
        setLoading(true);
        setError(null);
      }

      try {
        const headers = await getWalletAuthHeaders('inbox:read', normalizedAddress, allowSignPrompt);
        const params = new URLSearchParams({ wallet: normalizedAddress });
        if (threadId) params.set('threadId', threadId);

        const response = await fetch(`/api/inbox?${params.toString()}`, { headers });
        const data = await response.json();

        if (!response.ok || !data.success) {
          if (response.status === 401) {
            setNeedsAuth(true);
            throw new Error('Authorize your wallet to open the inbox.');
          }
          throw new Error(data.error || 'Unable to load inbox');
        }

        setNeedsAuth(false);
        setPayload(data.data);
        setActiveThreadId(data.data.activeThread?.id ?? threadId ?? null);
        setLastSyncedAt(new Date());
      } catch (loadError) {
        if (!quiet) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load inbox');
        }
      } finally {
        if (!quiet) {
          setLoading(false);
        }
      }
    },
    [activeThreadId, getWalletAuthHeaders, normalizedAddress]
  );

  useEffect(() => {
    if (!normalizedAddress) {
      setPayload(null);
      return;
    }

    void loadInbox(searchParams.get('threadId'), false);
  }, [loadInbox, normalizedAddress, searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  useEffect(() => {
    if (!normalizedAddress || !activeThreadId || needsAuth) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || sending) return;
      void loadInbox(activeThreadId, false, true);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [activeThreadId, loadInbox, needsAuth, normalizedAddress, sending]);

  const selectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    router.replace(`/chat?threadId=${encodeURIComponent(threadId)}`, { scroll: false });
    void loadInbox(threadId, false);
  };

  const sendMessage = async () => {
    if (!normalizedAddress || !message.trim()) return;

    const trimmedTarget = target.trim();
    const creatingThread = !activeThreadId;
    if (creatingThread && !trimmedTarget && !hasContext) {
      setError('Add a wallet, creator tag, venue, dare, campaign, or support mode before starting a thread.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const authResource = activeThreadId ?? normalizedAddress;
      const headers = await getWalletAuthHeaders('inbox:write', authResource, true);
      const response = await fetch('/api/inbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          wallet: normalizedAddress,
          threadId: activeThreadId ?? undefined,
          recipientWallet: trimmedTarget && isAddress(trimmedTarget) ? trimmedTarget : undefined,
          recipientTag: trimmedTarget && !isAddress(trimmedTarget) ? trimmedTarget : undefined,
          venueSlug: venueSlug || undefined,
          dareId: dareId || undefined,
          campaignId: campaignId || undefined,
          support: supportMode || activeSupportThread || undefined,
          subject: subject || undefined,
          body: message,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Message failed');
      }

      setMessage('');
      const nextThreadId = data.data.threadId as string;
      setActiveThreadId(nextThreadId);
      router.replace(`/chat?threadId=${encodeURIComponent(nextThreadId)}`, { scroll: false });
      await loadInbox(nextThreadId, false);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Message failed');
    } finally {
      setSending(false);
    }
  };

  const startFresh = () => {
    setActiveThreadId(null);
    setSubject('');
    setTarget('');
    setMessage('');
    router.replace('/chat', { scroll: false });
  };

  const startSupport = () => {
    setActiveThreadId(null);
    setTarget('');
    setSubject('BaseDare Support');
    setMessage('');
    router.replace('/chat?support=1&subject=BaseDare%20Support', { scroll: false });
  };

  const targetHint = useMemo(() => {
    if (supportMode) return 'Routes straight to BaseDare admin support';
    if (venueSlug) return `Venue context: ${venueSlug}`;
    if (dareId) return `Dare context: ${dareId}`;
    if (campaignId) return `Campaign context: ${campaignId}`;
    return 'Wallet address or @creator tag';
  }, [campaignId, dareId, supportMode, venueSlug]);

  const syncLabel = lastSyncedAt
    ? `Synced ${lastSyncedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : 'Live sync ready';

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060f] px-4 py-8 text-white sm:px-6 lg:px-10">
      <LiquidBackground />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(103,232,249,0.16),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(250,204,21,0.1),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.045),transparent_42%,rgba(125,92,255,0.1))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.24),rgba(2,6,23,0.58))]" />
      <GradualBlurOverlay />

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/75">
              <Inbox className="h-3.5 w-3.5" />
              BaseDare Inbox
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase italic tracking-[-0.06em] sm:text-6xl">
              Secure <span className="text-cyan-200">handshakes</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/55">
              Live message creators, venue owners, brands, and later support without leaking phone numbers
              or emails. Keep the deal, venue, proof, and payout trail inside BaseDare.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-300/10 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/75">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.75)]" />
              {syncLabel}
            </div>
            <button
              type="button"
              onClick={() => void loadInbox(activeThreadId, true)}
              disabled={!normalizedAddress || loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-300/22 bg-cyan-300/10 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300/15 disabled:opacity-45"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {needsAuth ? 'Authorize' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={startFresh}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/62 transition hover:bg-white/[0.09] hover:text-white"
            >
              <Plus className="h-4 w-4" />
              New
            </button>
            <button
              type="button"
              onClick={startSupport}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-yellow-300/24 bg-yellow-300/12 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:bg-yellow-300/18"
            >
              <Shield className="h-4 w-4" />
              Support
            </button>
          </div>
        </div>

        {!isConnected || !normalizedAddress ? (
          <div className="rounded-[2rem] border border-yellow-300/20 bg-yellow-300/10 p-6 text-sm font-bold leading-6 text-yellow-100">
            Connect a wallet first. Inbox access is wallet-scoped so only thread participants can read or send messages.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[1.5rem] border border-red-300/25 bg-red-500/10 p-4 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}

        <div className="grid min-h-[68vh] gap-5 lg:grid-cols-[23rem_1fr]">
          <aside className="relative flex min-h-0 flex-col gap-4 overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-cyan-100/35 before:to-transparent">
            <div className="rounded-[1.5rem] border border-cyan-300/14 bg-cyan-300/[0.075] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-100/80" />
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70">
                  Contact guard
                </p>
              </div>
              <p className="mt-2 text-xs font-bold leading-5 text-white/50">
                Emails, phone numbers, and contact links are redacted before storage. Route the mission, not the user off-platform.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/12 bg-black/28 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">
                Start thread
              </p>
              <input
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                disabled={supportMode}
                placeholder={targetHint}
                className="mt-3 w-full rounded-2xl border border-white/12 bg-black/46 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/28 shadow-[inset_0_1px_10px_rgba(0,0,0,0.35)] focus:border-cyan-300/40 disabled:cursor-not-allowed disabled:text-yellow-100/60 disabled:placeholder:text-yellow-100/42"
              />
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Subject, venue, mission, or deal"
                className="mt-2 w-full rounded-2xl border border-white/12 bg-black/46 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/28 shadow-[inset_0_1px_10px_rgba(0,0,0,0.35)] focus:border-cyan-300/40"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]">
              {threads.length === 0 ? (
                <div className="rounded-[1.5rem] border border-white/12 bg-black/24 p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <MessageSquare className="mx-auto h-8 w-8 text-white/25" />
                  <p className="mt-3 text-sm font-black text-white/70">No inbox threads yet.</p>
                  <p className="mt-1 text-xs leading-5 text-white/38">
                    Start with a wallet, creator tag, or context link from a venue/campaign.
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
                            ? 'border-cyan-300/35 bg-cyan-300/[0.09] shadow-[0_0_24px_rgba(34,211,238,0.08)]'
                            : 'border-white/10 bg-black/22 hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-black text-white">{thread.subject}</p>
                            <p className="mt-1 line-clamp-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/34">
                              {thread.type} · {thread.counterpartWallets.map(shortWallet).join(', ') || 'solo'}
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
                            {thread.lastMessage.mine ? 'You: ' : ''}
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

          <section className="relative flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent">
            <div className="shrink-0 border-b border-white/10 bg-black/26 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/55">
                    {activeThread ? activeThread.type : 'New thread'}
                  </p>
                  <h2 className="mt-1 truncate text-2xl font-black tracking-[-0.04em] text-white">
                    {activeThread?.subject || subject || 'Route a private handshake'}
                  </h2>
                  <p className="mt-1 text-xs font-bold leading-5 text-white/42">
                    {activeThread
                      ? `Participants: ${activeThread.participantWallets.map(shortWallet).join(' / ')}`
                      : 'Use @creator or wallet address. Optional venue/dare/campaign context is preserved.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeThread?.context.venue ? (
                    <Link
                      href={activeThread.context.venue.href}
                      className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/62 transition hover:bg-white/[0.09] hover:text-white"
                    >
                      Venue
                    </Link>
                  ) : null}
                  {activeThread?.context.dare ? (
                    <Link
                      href={activeThread.context.dare.href}
                      className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100/80 transition hover:bg-yellow-300/15"
                    >
                      Dare
                    </Link>
                  ) : null}
                  {activeThread?.context.campaign ? (
                    <Link
                      href={activeThread.context.campaign.href}
                      className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/62 transition hover:bg-white/[0.09] hover:text-white"
                    >
                      Campaign
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-black/18 p-4 [-webkit-overflow-scrolling:touch]">
              {loading && !payload ? (
                <div className="grid h-full min-h-[24rem] place-items-center">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-100/70" />
                    <p className="mt-3 text-sm font-black uppercase tracking-[0.2em] text-white/40">Loading inbox</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="grid h-full min-h-[24rem] place-items-center">
                  <div className="max-w-md text-center">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.4rem] border border-cyan-300/18 bg-cyan-300/10 text-cyan-100">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-white">
                      Start inside the grid.
                    </h3>
                    <p className="mt-2 text-sm font-bold leading-6 text-white/45">
                      Keep creator routing, venue requests, and proof coordination in one private BaseDare thread.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex ${entry.mine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-[1.35rem] border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_34px_rgba(0,0,0,0.22)] backdrop-blur-xl ${
                          entry.mine
                            ? 'border-cyan-300/20 bg-cyan-300/[0.11] text-cyan-50'
                            : 'border-white/12 bg-white/[0.075] text-white'
                        }`}
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
                            {entry.mine ? 'You' : shortWallet(entry.senderWallet)}
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

            <div className="shrink-0 border-t border-white/10 bg-black/32 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-100/70" />
                Live thread
                <span className="text-white/18">/</span>
                <Lock className="h-3.5 w-3.5 text-cyan-100/70" />
                Contact details blocked
                <span className="text-white/18">/</span>
                <BellRing className="h-3.5 w-3.5 text-yellow-100/70" />
                Support-ready rail
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={activeThread || target || hasContext ? 'Write a BaseDare message...' : 'Add a recipient or context first...'}
                  rows={2}
                  className="min-h-14 flex-1 resize-none rounded-[1.25rem] border border-white/12 bg-black/52 px-4 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-white/28 shadow-[inset_0_1px_16px_rgba(0,0,0,0.44)] focus:border-cyan-300/40"
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                      void sendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!normalizedAddress || sending || !message.trim()}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[1.25rem] border border-cyan-300/24 bg-[linear-gradient(180deg,rgba(103,232,249,0.18),rgba(8,145,178,0.16))] px-5 text-xs font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_14px_32px_rgba(0,0,0,0.3)] transition hover:bg-cyan-300/[0.16] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#03040a]" />}>
      <ChatInbox />
    </Suspense>
  );
}
