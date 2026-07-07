'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useAccount, useSignMessage } from 'wagmi';
import { X } from 'lucide-react';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';
import { MEETUP_TYPES, MEETUP_TYPE_LABELS, type MeetupType } from '@/lib/meetups';

type HostSessionShape = {
  token?: string;
  walletAddress?: string | null;
  user?: { walletAddress?: string | null } | null;
};

const TYPE_EMOJI: Record<MeetupType, string> = {
  surf: '🏄',
  skate: '🛹',
  sunset: '🌅',
  jam: '🎸',
  dwmb: '🚲',
  custom: '✨',
};

type WhenChoice = '30m' | '2h' | 'tonight' | 'custom';

function computeStartTime(choice: WhenChoice, customValue: string): Date | null {
  const now = Date.now();
  if (choice === '30m') return new Date(now + 30 * 60_000);
  if (choice === '2h') return new Date(now + 2 * 60 * 60_000);
  if (choice === 'tonight') {
    const tonight = new Date();
    tonight.setHours(19, 0, 0, 0);
    // Past 6:45pm already? Tonight means tomorrow night.
    if (tonight.getTime() < now + 15 * 60_000) tonight.setDate(tonight.getDate() + 1);
    return tonight;
  }
  if (!customValue) return null;
  const parsed = new Date(customValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDatetimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * The meetup composer — free community gatherings, venue-bound. Posts to the
 * existing gated endpoint (Baretag session + bearer); the map refreshes the
 * moment one goes live. No USDC, no seal, no proof language: this is the
 * lower-rung community layer by design.
 */
export default function MeetupComposerSheet({
  venueSlug,
  venueName,
  latitude,
  longitude,
  onClose,
  onCreated,
}: {
  venueSlug: string;
  venueName: string;
  latitude: number;
  longitude: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const { address, isConnected: walletConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [fallbackSession, setFallbackSession] = useState<HostSessionShape | null>(null);
  const [sessionChecking, setSessionChecking] = useState(false);
  const primaryToken = (session as HostSessionShape | null)?.token ?? null;
  const sessionToken = primaryToken ?? fallbackSession?.token ?? null;

  // useSession() sometimes misses a live session the API still honors (same
  // gotcha TagPlaceButton handles) — hydrate a fallback before telling anyone
  // to claim a tag they already own.
  useEffect(() => {
    if (primaryToken || sessionStatus === 'loading') return;
    let cancelled = false;
    (async () => {
      try {
        setSessionChecking(true);
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        const payload = (await response.json().catch(() => null)) as HostSessionShape | null;
        if (!cancelled) setFallbackSession(payload);
      } catch {
        if (!cancelled) setFallbackSession(null);
      } finally {
        if (!cancelled) setSessionChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [primaryToken, sessionStatus]);

  const [type, setType] = useState<MeetupType>('sunset');
  const [title, setTitle] = useState('');
  const [titleDirty, setTitleDirty] = useState(false);
  const [when, setWhen] = useState<WhenChoice>('tonight');
  const [customTime, setCustomTime] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  // Title follows the type until the host edits it themselves.
  useEffect(() => {
    if (titleDirty) return;
    setTitle(`${MEETUP_TYPE_LABELS[type]} at ${venueName}`);
  }, [type, venueName, titleDirty]);

  // Escape closes; background scroll locks while open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const datetimeBounds = useMemo(() => {
    const min = new Date(Date.now() + 10 * 60_000);
    const max = new Date(Date.now() + 72 * 60 * 60_000);
    return { min: toDatetimeLocal(min), max: toDatetimeLocal(max) };
  }, []);

  // Session OR connected wallet: the API accepts signed wallet-actions (same
  // auth as proofs/verdicts), so wallet users host without any session dance —
  // at most one signature prompt at submit.
  const canHost = Boolean(sessionToken) || (walletConnected && Boolean(address));
  const authResolving = sessionStatus === 'loading' || sessionChecking;

  const handleSubmit = async () => {
    setError(null);
    const startTime = computeStartTime(when, customTime);
    if (!startTime) {
      setError('Pick a time for the meetup.');
      return;
    }
    if (startTime.getTime() < Date.now() + 5 * 60_000 || startTime.getTime() > Date.now() + 72 * 60 * 60_000) {
      setError('Meetups start between 10 minutes and 72 hours from now.');
      return;
    }
    if (title.trim().length < 2) {
      setError('Give it a title.');
      return;
    }

    setSubmitting(true);
    try {
      // Session bearer when we have one; otherwise the standard signed
      // wallet-action (one signature prompt, same as taking proof).
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let bodyWallet: string | null = null;
      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      } else if (address) {
        const sessionShape = session as HostSessionShape | null;
        const authHeaders = await buildWalletActionAuthHeaders({
          walletAddress: address,
          sessionToken: sessionShape?.token ?? null,
          sessionWallet: sessionShape?.walletAddress ?? sessionShape?.user?.walletAddress ?? null,
          action: 'meetups:host',
          resource: 'meetups:host',
          signMessageAsync,
        });
        Object.assign(headers, authHeaders);
        bodyWallet = address;
      }

      const response = await fetch('/api/meetups', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: title.trim(),
          type,
          placeLabel: venueName,
          venueSlug,
          approxLat: latitude,
          approxLng: longitude,
          startTime: startTime.toISOString(),
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(bodyWallet ? { walletAddress: bodyWallet } : {}),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (response.status === 401) {
        setError('No claimed Baretag on this wallet yet — claim your @tag first.');
        return;
      }
      if (response.status === 429) {
        setError('Hosting limit hit — try again in an hour.');
        return;
      }
      if (!response.ok || !payload?.success) {
        setError(payload?.error || 'Could not post the meetup. Try again.');
        return;
      }
      setCreated(true);
      window.setTimeout(() => onCreated(), 900);
    } catch {
      setError('Network hiccup — try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-label={`Start a free meetup at ${venueName}`}
    >
      <div className="relative w-full max-w-md rounded-t-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(10,10,18,0.97)_30%,rgba(5,5,12,0.99)_100%)] p-5 pb-7 shadow-[0_-24px_80px_rgba(0,0,0,0.6)] sm:rounded-[28px]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white/70 transition hover:text-white"
          aria-label="Close composer"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">Free meetup</p>
        <h3 className="mt-1 text-xl font-black leading-tight text-white">🤙 {venueName}</h3>
        <p className="mt-1 text-[11px] leading-snug text-white/45">
          Public and free — no bounty, no proof required. Shows on the map at the venue&apos;s public spot, never
          your GPS.
        </p>

        {created ? (
          <div className="mt-6 rounded-[18px] border border-emerald-300/25 bg-emerald-500/[0.1] px-4 py-5 text-center">
            <p className="text-lg font-black text-emerald-100">Meetup is live on the map 🤙</p>
            <p className="mt-1 text-sm text-emerald-100/70">Anyone nearby can now see it and RSVP.</p>
          </div>
        ) : !canHost && authResolving ? (
          <div className="mt-6 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/55">
            Checking your hosting session…
          </div>
        ) : !canHost ? (
          <div className="mt-6 rounded-[18px] border border-amber-400/22 bg-amber-500/[0.08] px-4 py-4">
            <p className="text-sm font-semibold text-amber-100">Hosting needs a Baretag.</p>
            <p className="mt-1 text-sm text-amber-100/70">
              Claim your @tag once and you can post meetups anywhere on the island.
            </p>
            <Link
              href="/claim-tag"
              className="mt-3 inline-flex rounded-full border border-amber-300/28 bg-amber-500/[0.12] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-100"
            >
              Claim your @tag
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {MEETUP_TYPES.map((meetupType) => (
                <button
                  key={meetupType}
                  type="button"
                  onClick={() => setType(meetupType)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] transition ${
                    type === meetupType
                      ? 'border-[#f5c518]/45 bg-[#f5c518]/[0.12] text-[#f8dd72]'
                      : 'border-white/10 bg-white/[0.04] text-white/55 hover:text-white/80'
                  }`}
                >
                  {TYPE_EMOJI[meetupType]} {MEETUP_TYPE_LABELS[meetupType]}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={title}
              maxLength={120}
              onChange={(event) => {
                setTitleDirty(true);
                setTitle(event.target.value);
              }}
              placeholder="What's the plan?"
              className="mt-3 w-full rounded-[14px] border border-white/10 bg-black/30 px-3.5 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:border-[#f5c518]/40 focus:outline-none"
            />

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(
                [
                  ['30m', 'In 30 min'],
                  ['2h', 'In 2 hours'],
                  ['tonight', 'Tonight 7pm'],
                  ['custom', 'Pick a time'],
                ] as [WhenChoice, string][]
              ).map(([choice, label]) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setWhen(choice)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] transition ${
                    when === choice
                      ? 'border-cyan-300/40 bg-cyan-500/[0.12] text-cyan-100'
                      : 'border-white/10 bg-white/[0.04] text-white/55 hover:text-white/80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {when === 'custom' ? (
              <input
                type="datetime-local"
                value={customTime}
                min={datetimeBounds.min}
                max={datetimeBounds.max}
                onChange={(event) => setCustomTime(event.target.value)}
                className="mt-2 w-full rounded-[14px] border border-white/10 bg-black/30 px-3.5 py-3 text-sm text-white focus:border-cyan-300/40 focus:outline-none"
              />
            ) : null}

            <textarea
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional note — what to bring, where exactly to stand…"
              rows={2}
              className="mt-3 w-full resize-none rounded-[14px] border border-white/10 bg-black/30 px-3.5 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/25 focus:outline-none"
            />

            {error ? (
              <p className="mt-3 rounded-[12px] border border-rose-400/25 bg-rose-500/[0.1] px-3 py-2 text-xs leading-5 text-rose-200">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || sessionStatus === 'loading'}
              className="mt-4 w-full rounded-full border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(20,22,36,0.96)_100%)] px-4 py-3.5 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_22px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:-translate-y-[1px] disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? 'Posting…' : '🤙 Post the meetup'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
