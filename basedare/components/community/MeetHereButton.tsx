'use client';

import Link from 'next/link';
import { CalendarClock, MapPin, Send, Users, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

import PlanShareButton from '@/components/community/PlanShareButton';
import {
  getDefaultMeetHereStart,
  getMeetupShareText,
  normalizeMeetupInviteTags,
} from '@/lib/meetup-plan';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';

type CommunitySession = {
  token?: string;
  walletAddress?: string | null;
  user?: { walletAddress?: string | null } | null;
};

function toDateTimeLocal(date: Date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

export default function MeetHereButton({
  venueId,
  venueSlug,
  venueName,
  latitude,
  longitude,
}: {
  venueId: string;
  venueSlug: string;
  venueName: string;
  latitude: number;
  longitude: number;
}) {
  const { data: session } = useSession();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const sessionShape = session as CommunitySession | null;
  const sessionWallet = sessionShape?.walletAddress ?? sessionShape?.user?.walletAddress ?? null;
  const actorWallet = address ?? sessionWallet;

  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [note, setNote] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [created, setCreated] = useState<{ href: string; startTime: string; invitedCount: number } | null>(null);

  const openPlanner = () => {
    setOpen(true);
    setState(null);
    setCreated(null);
    if (!startTime) setStartTime(toDateTimeLocal(getDefaultMeetHereStart()));
  };

  const createInvite = async () => {
    setState(null);
    if (!actorWallet) {
      setState({ type: 'error', message: 'Sign in from the top bar, then tap Meet me here again.' });
      return;
    }
    const startsAt = new Date(startTime);
    if (!startTime || !Number.isFinite(startsAt.getTime())) {
      setState({ type: 'error', message: 'Choose a time.' });
      return;
    }

    setPending(true);
    try {
      const headers = await buildWalletActionAuthHeaders({
        walletAddress: actorWallet,
        sessionToken: sessionShape?.token ?? null,
        sessionWallet,
        action: 'meetups:host',
        resource: 'meetups:host',
        signMessageAsync,
      });
      const inviteTags = normalizeMeetupInviteTags(inviteInput.split(/[\s,]+/));
      const response = await fetch('/api/meetups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          title: `Meet at ${venueName}`,
          type: 'custom',
          placeLabel: venueName,
          venueId,
          venueSlug,
          walletAddress: actorWallet,
          approxLat: latitude,
          approxLng: longitude,
          startTime: startsAt.toISOString(),
          note: note.trim(),
          inviteTags,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success || !payload.data?.shareHref) {
        throw new Error(payload?.error || 'Could not create this invite.');
      }
      setCreated({
        href: payload.data.shareHref,
        startTime: startsAt.toISOString(),
        invitedCount: Number(payload.data.invitedCount) || 0,
      });
      setState({
        type: 'success',
        message: payload.data.invitedCount
          ? `Plan live · ${payload.data.invitedCount} BaseDare mate${payload.data.invitedCount === 1 ? '' : 's'} notified.`
          : 'Plan live · share it with your mates.',
      });
    } catch (error) {
      setState({ type: 'error', message: error instanceof Error ? error.message : 'Could not create this invite.' });
    } finally {
      setPending(false);
    }
  };

  const shareText = created
    ? getMeetupShareText({ placeLabel: venueName, startTime: created.startTime, note: note.trim() || null, rsvpCount: 1 })
    : '';

  return (
    <>
      <button
        id="meet-here"
        type="button"
        onClick={openPlanner}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-violet-200/24 bg-violet-300/[0.1] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-100 transition hover:border-violet-100/42 hover:bg-violet-300/[0.16]"
      >
        <Users className="h-4 w-4" /> Meet me here
      </button>

      {open ? (
        <div role="dialog" aria-modal="true" aria-labelledby="meet-here-title" className="fixed inset-0 z-[1500] flex items-end justify-center bg-black/72 p-3 backdrop-blur-sm sm:items-center sm:p-5">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-violet-200/18 bg-[linear-gradient(155deg,rgba(27,20,48,0.98),rgba(5,8,14,0.99))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.09)] sm:p-6">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close meetup invite" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/26 text-white/58">
              <X className="h-4 w-4" />
            </button>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-violet-200/68">Make a plan</p>
            <h2 id="meet-here-title" className="mt-2 pr-12 text-3xl font-black">Meet me at {venueName}</h2>
            <p className="mt-2 flex items-center gap-2 text-xs text-white/46"><MapPin className="h-4 w-4 text-cyan-200" /> Public venue · short-lived invite</p>

            {!created ? (
              <div className="mt-6 space-y-4">
                <label className="block text-[9px] font-black uppercase tracking-[0.16em] text-white/44">
                  When
                  <span className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3">
                    <CalendarClock className="h-4 w-4 text-violet-200" />
                    <input type="datetime-local" required value={startTime} onChange={(event) => setStartTime(event.target.value)} className="min-h-12 w-full bg-transparent text-sm font-bold text-white outline-none" />
                  </span>
                </label>
                <label className="block text-[9px] font-black uppercase tracking-[0.16em] text-white/44">
                  Note · optional
                  <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={160} placeholder="First drink, then we decide." className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-bold text-white outline-none placeholder:text-white/24 focus:border-violet-200/28" />
                </label>
                <label className="block text-[9px] font-black uppercase tracking-[0.16em] text-white/44">
                  Ping BaseDare mates · optional
                  <input value={inviteInput} onChange={(event) => setInviteInput(event.target.value)} maxLength={180} placeholder="@maya, @kai" className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-bold text-white outline-none placeholder:text-white/24 focus:border-violet-200/28" />
                </label>
                {state?.type === 'error' ? <p role="alert" className="rounded-2xl border border-rose-200/20 bg-rose-300/[0.08] p-3 text-xs font-bold text-rose-100">{state.message}</p> : null}
                <button type="button" disabled={pending} onClick={() => void createInvite()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] px-5 text-[11px] font-black uppercase tracking-[0.16em] text-[#171006] disabled:opacity-45">
                  <Send className="h-4 w-4" /> {pending ? 'Making plan…' : 'Create invite'}
                </button>
                <p className="text-center text-[10px] leading-4 text-white/34">Meet in public. This is a community plan—not a venue booking or BaseDare-hosted event.</p>
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-emerald-200/18 bg-emerald-300/[0.07] p-4">
                <p className="font-black text-emerald-100">{state?.message}</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/58">{shareText}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <PlanShareButton title={`Meet at ${venueName}`} text={shareText} href={created.href} label="Share" />
                  <Link href={created.href} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] px-4 text-[10px] font-black uppercase tracking-[0.13em] text-white/74">Open invite</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
