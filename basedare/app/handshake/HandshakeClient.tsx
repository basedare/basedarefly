'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import {
  CheckCircle2,
  Clock3,
  Crosshair,
  Loader2,
  MapPin,
  Radio,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wallet,
  Zap,
} from 'lucide-react';
import { IdentityButton } from '@/components/IdentityButton';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';
import { triggerHaptic } from '@/lib/mobile-haptics';
import type { VenueDetail } from '@/lib/venue-types';

type SessionShape = {
  token?: string | null;
  walletAddress?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

type HandshakeParams = {
  scope: string;
  venueSlug: string;
  venueId: string;
  sessionId: string;
  token: string;
  expiresAtMs: number;
};

type CheckInResult = {
  checkInId: string;
  venueId: string;
  venueSlug: string;
  proofLevel: 'QR_ONLY' | 'QR_AND_GPS';
  geoDistanceMeters: number | null;
  scannedAt: string;
  windowEndAt: string;
  memory: {
    bucketType: string;
    bucketStartAt: string;
    bucketEndAt: string;
    checkInCount: number;
    uniqueVisitorCount: number;
  };
};

type CheckInMode = 'gps' | 'qr-only';
type SubmitPhase = 'idle' | 'locating' | 'signing' | 'submitting' | 'success' | 'error';

const shellClass =
  'relative overflow-hidden rounded-[34px] border border-white/[0.1] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_18%,rgba(7,9,18,0.94)_100%)] shadow-[0_30px_90px_rgba(0,0,0,0.46),0_0_34px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.28)]';

const insetClass =
  'rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(3,5,10,0.72)_0%,rgba(8,10,18,0.94)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-12px_20px_rgba(0,0,0,0.28)]';

function normalizeWallet(value?: string | null) {
  const wallet = value?.trim();
  return wallet ? wallet.toLowerCase() : null;
}

function formatCountdown(msRemaining: number) {
  const seconds = Math.max(0, Math.floor(msRemaining / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getVenueCheckInAuthResource(venueId: string, sessionId: string) {
  return `venue:${venueId}:session:${sessionId}`;
}

function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('GPS is not available in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => reject(new Error('GPS permission was blocked or unavailable.')),
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 8_000,
      }
    );
  });
}

function parseHandshakeParams(searchParams: URLSearchParams): HandshakeParams | null {
  const venueSlug = searchParams.get('venue')?.trim() ?? '';
  const venueId = searchParams.get('venueId')?.trim() ?? '';
  const sessionId = searchParams.get('session')?.trim() ?? '';
  const token = searchParams.get('token')?.trim() ?? '';
  const rawExp = searchParams.get('exp')?.trim() ?? '';
  const expiresAtMs = Number(rawExp);

  if (!venueSlug || !venueId || !sessionId || !token || !rawExp || !Number.isFinite(expiresAtMs)) {
    return null;
  }

  return {
    scope: searchParams.get('scope')?.trim() || 'VENUE_CHECKIN',
    venueSlug,
    venueId,
    sessionId,
    token,
    expiresAtMs,
  };
}

function getStatusCopy(phase: SubmitPhase) {
  switch (phase) {
    case 'locating':
      return 'Locking GPS proximity...';
    case 'signing':
      return 'Waiting for wallet signature...';
    case 'submitting':
      return 'Submitting venue check-in...';
    case 'success':
      return 'Presence confirmed.';
    case 'error':
      return 'Handshake needs attention.';
    default:
      return 'Ready for secure venue proof.';
  }
}

export default function HandshakeClient() {
  const searchParams = useSearchParams();
  const handshake = useMemo(() => parseHandshakeParams(searchParams), [searchParams]);
  const { data: session, status: sessionStatus } = useSession();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [venueError, setVenueError] = useState<string | null>(null);
  const [creatorTag, setCreatorTag] = useState('');
  const [phase, setPhase] = useState<SubmitPhase>('idle');
  const [gpsWarning, setGpsWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);

  const sessionFields = session as SessionShape | null;
  const sessionToken = sessionFields?.token ?? null;
  const sessionWallet =
    normalizeWallet(sessionFields?.walletAddress) ??
    normalizeWallet(sessionFields?.user?.walletAddress);
  const liveWallet = normalizeWallet(address);
  const activeWallet = liveWallet ?? sessionWallet;
  const isExpired = handshake ? nowMs > handshake.expiresAtMs : false;
  const msRemaining = handshake ? handshake.expiresAtMs - nowMs : 0;
  const hasActiveDares = Boolean(venue?.activeDares.length);
  const topDares = venue?.activeDares.slice(0, 3) ?? [];
  const canSubmit =
    Boolean(handshake) &&
    Boolean(activeWallet) &&
    !isExpired &&
    phase !== 'locating' &&
    phase !== 'signing' &&
    phase !== 'submitting';

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!handshake?.venueSlug) return undefined;

    let cancelled = false;
    async function loadVenue() {
      try {
        const response = await fetch(`/api/venues/${encodeURIComponent(handshake!.venueSlug)}`, {
          cache: 'no-store',
        });
        const payload = await response.json();
        if (cancelled) return;

        if (!response.ok || !payload?.success) {
          setVenueError(payload?.error ?? 'Unable to load this venue.');
          setVenue(null);
          return;
        }

        setVenue(payload.data.venue);
        setVenueError(null);
      } catch (loadError) {
        if (!cancelled) {
          setVenueError(loadError instanceof Error ? loadError.message : 'Unable to load this venue.');
          setVenue(null);
        }
      }
    }

    void loadVenue();

    return () => {
      cancelled = true;
    };
  }, [handshake]);

  const submitCheckIn = useCallback(
    async (mode: CheckInMode) => {
      if (!handshake) {
        setError('This QR payload is missing required handshake fields.');
        setPhase('error');
        return;
      }

      if (isExpired) {
        setError('This QR window expired. Scan the live venue QR again.');
        setPhase('error');
        triggerHaptic('warning');
        return;
      }

      if (!activeWallet) {
        setError('Connect a wallet before checking in.');
        setPhase('error');
        triggerHaptic('warning');
        return;
      }

      setError(null);
      setGpsWarning(null);
      setResult(null);

      let location: { lat: number; lng: number } | null = null;
      if (mode === 'gps') {
        setPhase('locating');
        try {
          location = await getPosition();
        } catch (locationError) {
          setGpsWarning(
            locationError instanceof Error
              ? `${locationError.message} Continuing as QR-only proof.`
              : 'GPS unavailable. Continuing as QR-only proof.'
          );
        }
      }

      try {
        setPhase('signing');
        const authHeaders = await buildWalletActionAuthHeaders({
          walletAddress: activeWallet,
          sessionToken,
          sessionWallet,
          action: 'venue-check-in',
          resource: getVenueCheckInAuthResource(handshake.venueId, handshake.sessionId),
          signMessageAsync: liveWallet ? signMessageAsync : undefined,
        });

        if (!authHeaders.Authorization && !authHeaders['x-basedare-wallet']) {
          throw new Error('Wallet signature required. Connect a wallet and approve the BaseDare check-in request.');
        }

        setPhase('submitting');
        const response = await fetch('/api/venues/check-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            venueId: handshake.venueId,
            sessionId: handshake.sessionId,
            token: handshake.token,
            walletAddress: activeWallet,
            tag: creatorTag.trim() || undefined,
            lat: location?.lat,
            lng: location?.lng,
          }),
        });
        const payload = await response.json();

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error ?? 'Unable to complete this check-in.');
        }

        setResult(payload.data);
        setPhase('success');
        triggerHaptic('success');
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Unable to complete this check-in.');
        setPhase('error');
        triggerHaptic('warning');
      }
    },
    [
      activeWallet,
      creatorTag,
      handshake,
      isExpired,
      liveWallet,
      sessionToken,
      sessionWallet,
      signMessageAsync,
    ]
  );

  const venueLocation = [venue?.city, venue?.country].filter(Boolean).join(', ');
  const walletLabel = activeWallet ? `${activeWallet.slice(0, 6)}...${activeWallet.slice(-4)}` : 'No wallet';

  return (
    <section className="relative min-h-[78vh] overflow-hidden px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-6 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[90px]" />
        <div className="absolute bottom-12 right-0 h-72 w-72 rounded-full bg-[#f8dd72]/10 blur-[95px]" />
        <div className="absolute left-[-20%] top-1/3 h-72 w-72 rounded-full bg-[#b87fff]/12 blur-[90px]" />
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href={venue?.slug ? `/venues/${venue.slug}` : '/map'}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/58 transition hover:border-white/20 hover:text-white"
          >
            {venue?.slug ? 'Venue page' : 'Open map'}
          </Link>
          <div className="rounded-full border border-cyan-200/14 bg-cyan-300/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/76">
            Secure handshake
          </div>
        </div>

        <div className={shellClass}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(190,249,255,0.12),transparent_44%),linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.05)_44%,transparent_68%)]" />
          <div className="relative p-5 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200/18 bg-cyan-300/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    BaseDare Secure Handshake
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/28 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/54">
                    <Clock3 className="h-3.5 w-3.5" />
                    {handshake ? (isExpired ? 'Expired' : formatCountdown(msRemaining)) : 'Invalid'}
                  </span>
                </div>
                <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                  {venue?.name ?? 'Venue check-in'}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/58 sm:text-base">
                  {venue
                    ? `Prove you are at ${venue.name}${venueLocation ? ` in ${venueLocation}` : ''}. QR plus GPS earns the stronger proof level.`
                    : venueError || 'Loading venue memory...'}
                </p>
              </div>
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] border border-cyan-200/16 bg-[radial-gradient(circle_at_45%_30%,rgba(255,255,255,0.2),transparent_34%),linear-gradient(180deg,rgba(34,211,238,0.18),rgba(7,9,18,0.96))] shadow-[0_18px_44px_rgba(0,0,0,0.34),0_0_24px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.1)]">
                <Radio className="h-9 w-9 text-cyan-100" />
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className={insetClass + ' px-4 py-4'}>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/36">
                  <Wallet className="h-3.5 w-3.5" />
                  Wallet
                </div>
                <p className="mt-2 font-mono text-sm font-bold text-white">{walletLabel}</p>
              </div>
              <div className={insetClass + ' px-4 py-4'}>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/36">
                  <MapPin className="h-3.5 w-3.5" />
                  Venue Radius
                </div>
                <p className="mt-2 text-sm font-bold text-white">
                  {venue ? `${venue.checkInRadiusMeters}m GPS gate` : 'Loading'}
                </p>
              </div>
              <div className={insetClass + ' px-4 py-4'}>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/36">
                  <Zap className="h-3.5 w-3.5" />
                  Live Dares
                </div>
                <p className="mt-2 text-sm font-bold text-white">{venue ? venue.activeDares.length : '...'}</p>
              </div>
            </div>

            {!handshake ? (
              <div className="mt-6 rounded-[24px] border border-red-400/18 bg-red-500/[0.08] p-4 text-sm text-red-100">
                This QR is missing required fields. Scan the current venue QR from the BaseDare console.
              </div>
            ) : null}

            {isExpired && handshake ? (
              <div className="mt-6 rounded-[24px] border border-amber-300/20 bg-amber-400/[0.08] p-4 text-sm text-amber-100">
                This QR window has expired. The venue console rotates codes for safety; scan the fresh QR on-site.
              </div>
            ) : null}

            {!activeWallet ? (
              <div className="mt-6 rounded-[28px] border border-white/10 bg-black/28 p-4">
                <p className="text-sm font-semibold text-white">Connect a wallet to check in.</p>
                <p className="mt-1 text-xs leading-5 text-white/50">
                  The signature only authorizes this venue check-in. It does not move funds.
                </p>
                <div className="mt-4 max-w-[220px]">
                  <IdentityButton />
                </div>
              </div>
            ) : null}

            <div className="mt-6">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                Creator tag optional
              </label>
              <input
                value={creatorTag}
                onChange={(event) => setCreatorTag(event.target.value)}
                placeholder="@yourtag"
                className="mt-2 w-full rounded-[22px] border border-white/10 bg-black/34 px-4 py-3 text-sm font-semibold text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.22)] placeholder:text-white/24 focus:border-cyan-200/34"
              />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void submitCheckIn('gps')}
                className="group relative min-h-14 overflow-hidden rounded-[22px] border border-cyan-200/20 bg-[linear-gradient(180deg,rgba(190,249,255,0.22),rgba(34,211,238,0.12)_46%,rgba(7,12,22,0.96)_100%)] px-5 py-4 text-left shadow-[0_18px_36px_rgba(0,0,0,0.32),0_0_24px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.16)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="relative z-10 flex items-center justify-between gap-3">
                  <span>
                    <span className="block text-sm font-black uppercase tracking-[0.16em] text-white">
                      Check in with GPS + QR
                    </span>
                    <span className="mt-1 block text-xs text-cyan-50/58">
                      Highest-trust venue presence proof.
                    </span>
                  </span>
                  {phase === 'locating' || phase === 'signing' || phase === 'submitting' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-100" />
                  ) : (
                    <Crosshair className="h-5 w-5 text-cyan-100" />
                  )}
                </span>
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void submitCheckIn('qr-only')}
                className="min-h-14 rounded-[22px] border border-white/12 bg-white/[0.045] px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white/72 shadow-[0_16px_28px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-white/20 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
              >
                QR only
              </button>
            </div>

            <div className="mt-4 min-h-6 text-sm">
              <span className={phase === 'error' ? 'text-red-200' : phase === 'success' ? 'text-emerald-200' : 'text-white/42'}>
                {getStatusCopy(phase)}
              </span>
              {sessionStatus === 'loading' ? (
                <span className="ml-2 text-white/34">Checking session...</span>
              ) : null}
            </div>

            {gpsWarning ? (
              <div className="mt-4 flex gap-3 rounded-[22px] border border-amber-300/18 bg-amber-400/[0.07] p-4 text-sm leading-5 text-amber-100">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{gpsWarning}</span>
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 flex gap-3 rounded-[22px] border border-red-400/18 bg-red-500/[0.08] p-4 text-sm leading-5 text-red-100">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {result ? (
              <div className="mt-6 rounded-[28px] border border-emerald-300/18 bg-[linear-gradient(180deg,rgba(16,185,129,0.16),rgba(6,10,16,0.92))] p-5 shadow-[0_18px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-200" />
                  <div>
                    <p className="text-lg font-black text-white">Checked in</p>
                    <p className="mt-1 text-sm text-white/58">
                      {result.proofLevel === 'QR_AND_GPS' ? 'QR + GPS proof confirmed.' : 'QR proof confirmed.'}
                      {typeof result.geoDistanceMeters === 'number' ? ` ${result.geoDistanceMeters}m from venue anchor.` : ''}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-[20px] border border-white/10 bg-black/24 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/36">Today</p>
                    <p className="mt-1 text-2xl font-black text-white">{result.memory.checkInCount}</p>
                    <p className="text-xs text-white/42">check-ins</p>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-black/24 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/36">Visitors</p>
                    <p className="mt-1 text-2xl font-black text-cyan-100">{result.memory.uniqueVisitorCount}</p>
                    <p className="text-xs text-white/42">unique today</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_0.82fr]">
          <div className={insetClass + ' p-5'}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/36">Live venue dares</p>
                <h2 className="mt-1 text-xl font-black text-white">Next move</h2>
              </div>
              <Sparkles className="h-5 w-5 text-[#f8dd72]" />
            </div>
            <div className="mt-4 space-y-3">
              {hasActiveDares ? (
                topDares.map((dare) => (
                  <Link
                    key={dare.id}
                    href={`/dare/${dare.shortId}`}
                    className="block rounded-[20px] border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#f8dd72]/30 hover:bg-[#f8dd72]/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold leading-5 text-white">{dare.title}</p>
                      <span className="shrink-0 rounded-full bg-[#f8dd72] px-2 py-1 text-[10px] font-black text-black">
                        ${Math.round(dare.bounty)}
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
                      Open dare
                    </p>
                  </Link>
                ))
              ) : (
                <p className="rounded-[20px] border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-white/50">
                  No active dares here yet. Your check-in still adds place memory and gives the venue a measurable signal.
                </p>
              )}
            </div>
          </div>

          <div className={insetClass + ' p-5'}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/36">Why this matters</p>
            <h2 className="mt-1 text-xl font-black text-white">Venue memory</h2>
            <p className="mt-3 text-sm leading-6 text-white/52">
              This scan turns a venue visit into owned BaseDare data: presence, creator identity, repeat traffic, and proof quality.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={venue?.slug ? `/venues/${venue.slug}` : '/map'}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/70 transition hover:border-white/20 hover:text-white"
              >
                Open venue
              </Link>
              <Link
                href="/map"
                className="rounded-full border border-cyan-200/16 bg-cyan-300/[0.08] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-200/30"
              >
                Open map
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
