'use client';

import Link from 'next/link';
import { Clock3, Loader2, MapPin, MessageCircle, Send, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

import type { CrewRoomCoordinationKind, CrewRoomPlanType } from '@/lib/live-plan-room';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';

type SessionShape = {
  token?: string | null;
  walletAddress?: string | null;
  user?: { walletAddress?: string | null } | null;
};

type RoomSnapshot = {
  threadId: string;
  title: string;
  placeLabel: string;
  startsAt: string;
  participantCount: number;
  participants: Array<{ tag: string; coordinationKind: string | null }>;
  messages: Array<{
    id: string;
    body: string;
    mine: boolean;
    senderTag: string;
    coordinationKind: unknown;
    createdAt: string;
  }>;
};

const QUICK_ACTIONS: Array<{ kind: CrewRoomCoordinationKind; label: string }> = [
  { kind: 'COMING', label: 'I’m coming' },
  { kind: 'HERE', label: 'I’m here' },
  { kind: 'ETA_10', label: '10 min away' },
  { kind: 'ETA_20', label: '20 min away' },
  { kind: 'RUNNING_LATE', label: 'Running late' },
  { kind: 'NEED_GEAR', label: 'Need gear' },
];

function formatRoomTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Soon';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function coordinationLabel(kind: string, planType: CrewRoomPlanType) {
  switch (kind) {
    case 'HERE': return 'here';
    case 'RUNNING_LATE': return 'running late';
    case 'ETA_10': return '10 min away';
    case 'ETA_20': return '20 min away';
    case 'NEED_GEAR': return planType === 'boat' ? 'needs a board' : 'needs gear';
    case 'COMING': return 'coming';
    default: return null;
  }
}

export default function CrewRoomClient({
  planType,
  planId,
  onCantMakeIt,
}: {
  planType: CrewRoomPlanType;
  planId: string;
  onCantMakeIt?: () => Promise<void>;
}) {
  const { data: session } = useSession();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const sessionShape = session as SessionShape | null;
  const sessionWallet = sessionShape?.walletAddress ?? sessionShape?.user?.walletAddress ?? null;
  const actorWallet = address ?? sessionWallet;
  const listEndRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useCallback(async (action: 'read' | 'post', allowSignPrompt: boolean) => {
    if (!actorWallet) return {};
    return buildWalletActionAuthHeaders({
      walletAddress: actorWallet,
      sessionToken: sessionShape?.token ?? null,
      sessionWallet,
      action: `live-plan-room:${action}`,
      resource: `${planType}:${planId}`,
      allowSignPrompt,
      signMessageAsync,
    });
  }, [actorWallet, planId, planType, sessionShape?.token, sessionWallet, signMessageAsync]);

  const loadRoom = useCallback(async (allowSignPrompt = false, quiet = false) => {
    if (!actorWallet) return;
    if (!quiet) setPending('load');
    try {
      const headers = await authHeaders('read', allowSignPrompt);
      const query = new URLSearchParams({ walletAddress: actorWallet });
      const response = await fetch(`/api/live-plans/${planType}/${encodeURIComponent(planId)}/room?${query}`, {
        cache: 'no-store',
        headers,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        if (response.status === 401) setNeedsAuth(true);
        throw new Error(payload?.error || 'Crew Room unavailable.');
      }
      setNeedsAuth(false);
      setError(null);
      setRoom(payload.data as RoomSnapshot);
    } catch (loadError) {
      if (!quiet) setError(loadError instanceof Error ? loadError.message : 'Crew Room unavailable.');
    } finally {
      if (!quiet) setPending(null);
    }
  }, [actorWallet, authHeaders, planId, planType]);

  useEffect(() => {
    void loadRoom(false);
    const interval = window.setInterval(() => void loadRoom(false, true), 12_000);
    return () => window.clearInterval(interval);
  }, [loadRoom]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [room?.messages.length]);

  const post = async (coordinationKind?: CrewRoomCoordinationKind) => {
    if (!actorWallet || (!coordinationKind && !message.trim())) return false;
    setPending(coordinationKind ?? 'message');
    setError(null);
    try {
      const headers = await authHeaders('post', true);
      const response = await fetch(`/api/live-plans/${planType}/${encodeURIComponent(planId)}/room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          walletAddress: actorWallet,
          coordinationKind,
          body: coordinationKind ? undefined : message,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Could not send this update.');
      setMessage('');
      await loadRoom(false, true);
      return true;
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : 'Could not send this update.');
      return false;
    } finally {
      setPending(null);
    }
  };

  const cantMakeIt = async () => {
    if (!onCantMakeIt) return;
    const posted = await post('CANT_MAKE_IT');
    if (posted) {
      try {
        await onCantMakeIt();
      } catch {
        // The parent plan control owns the visible leave error.
      }
    }
  };

  if (!actorWallet) return null;

  return (
    <section id="crew-room" className="mt-4 scroll-mt-28 overflow-hidden rounded-[1.65rem] border border-cyan-200/16 bg-[linear-gradient(155deg,rgba(9,29,38,0.9),rgba(7,7,16,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <header className="border-b border-white/8 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/66"><MessageCircle className="h-4 w-4" /> Crew Room</p>
            <h2 className="mt-2 truncate text-lg font-black text-white">{room?.title ?? 'Plan coordination'}</h2>
          </div>
          {room ? <Link href={`/chat?threadId=${encodeURIComponent(room.threadId)}`} className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[8px] font-black uppercase tracking-[0.12em] text-white/52">Open chat</Link> : null}
        </div>
        {room ? (
          <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold text-white/45">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-cyan-200" /> {room.placeLabel}</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-[#f8dd72]" /> {formatRoomTime(room.startsAt)}</span>
            <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-violet-200" /> {room.participantCount} in room</span>
          </div>
        ) : null}
      </header>

      {pending === 'load' && !room ? <div className="grid min-h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-cyan-100/60" /></div> : null}
      {needsAuth && !room ? (
        <div className="p-4">
          <p className="text-xs font-bold leading-5 text-white/48">Authorize the wallet that joined this plan. The room stays private to the crew.</p>
          <button type="button" onClick={() => void loadRoom(true)} className="mt-3 min-h-10 w-full rounded-full bg-cyan-200 text-[9px] font-black uppercase tracking-[0.14em] text-[#02171d]">Unlock Crew Room</button>
        </div>
      ) : null}

      {room ? (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {QUICK_ACTIONS.map((action) => (
              <button key={action.kind} type="button" disabled={pending !== null} onClick={() => void post(action.kind)} className="min-h-10 rounded-full border border-cyan-200/13 bg-cyan-300/[0.055] px-2 text-[8px] font-black uppercase tracking-[0.09em] text-cyan-50/72 disabled:opacity-40">
                {pending === action.kind ? 'Sending…' : action.kind === 'NEED_GEAR' && planType === 'boat' ? 'Need a board' : action.label}
              </button>
            ))}
          </div>
          {room.participants.some((participant) => coordinationLabel(participant.coordinationKind ?? '', planType)) ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {room.participants.map((participant) => {
                const label = coordinationLabel(participant.coordinationKind ?? '', planType);
                return label ? <span key={`${participant.tag}:${label}`} className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-white/48">{participant.tag} · {label}</span> : null;
              })}
            </div>
          ) : null}
          <p className="mt-2 text-[9px] font-bold leading-4 text-white/30">ETA is a temporary message—not live location. Useful updates can alert the crew; normal chat stays quiet.</p>

          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-white/7 bg-black/25 p-3">
            {room.messages.length ? room.messages.map((entry) => (
              <div key={entry.id} className={`flex ${entry.mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl border px-3 py-2 ${entry.mine ? 'border-[#f5c518]/20 bg-[#f5c518]/[0.08]' : 'border-white/8 bg-white/[0.035]'}`}>
                  <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">{entry.mine ? 'You' : entry.senderTag} · {formatRoomTime(entry.createdAt)}</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-white/72">{entry.body}</p>
                </div>
              </div>
            )) : <p className="py-6 text-center text-xs font-bold text-white/34">Coordinate here when the plan needs it.</p>}
            <div ref={listEndRef} />
          </div>

          <div className="mt-3 flex gap-2">
            <input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} placeholder="Message the crew…" className="min-h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-black/35 px-4 text-sm font-bold text-white outline-none placeholder:text-white/28 focus:border-cyan-200/30" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void post(); } }} />
            <button type="button" aria-label="Send to crew" disabled={pending !== null || !message.trim()} onClick={() => void post()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f5c518] text-[#171006] disabled:opacity-35"><Send className="h-4 w-4" /></button>
          </div>
          {onCantMakeIt ? <button type="button" disabled={pending !== null} onClick={() => void cantMakeIt()} className="mt-3 text-[9px] font-black uppercase tracking-[0.12em] text-rose-100/42 hover:text-rose-100/72">Can’t make it? Tell the crew and release your place</button> : null}
        </div>
      ) : null}
      {error ? <p role="status" className="border-t border-rose-200/10 bg-rose-300/[0.04] px-4 py-3 text-xs font-bold text-rose-100/72">{error}</p> : null}
    </section>
  );
}
