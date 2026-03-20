'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Activity, MapPin, PauseCircle, RefreshCcw, Timer, Waves } from 'lucide-react';
import type { VenueDetail, VenueQrPayload } from '@/lib/venue-types';

const raisedPanelClass =
  'relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';

const softCardClass =
  'relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]';

const insetCardClass =
  'rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]';

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getSecondsLeft(lastRotatedAt: string, rotationSeconds: number, nowMs: number) {
  const lastRotatedMs = new Date(lastRotatedAt).getTime();
  const elapsed = Math.floor((nowMs - lastRotatedMs) / 1000);
  const cycle = rotationSeconds || 45;
  return Math.max(0, cycle - ((elapsed % cycle) + (elapsed < 0 ? cycle : 0)));
}

export default function VenueConsoleClient({ venue }: { venue: VenueDetail }) {
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [qrPayload, setQrPayload] = useState<VenueQrPayload | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState(venue.liveStats);

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadQr() {
      try {
        const response = await fetch(`/api/venues/id/${venue.id}/qr`, {
          cache: 'no-store',
        });
        const payload = await response.json();
        if (cancelled) return;

        if (!response.ok || !payload?.success) {
          setQrError(payload?.error ?? 'Unable to fetch live venue QR');
          setQrPayload(null);
          return;
        }

        setQrPayload(payload.data);
        setQrError(null);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Unable to fetch live venue QR';
        setQrError(message);
        setQrPayload(null);
      }
    }

    void loadQr();
    const interval = window.setInterval(() => {
      void loadQr();
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [venue.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const response = await fetch(`/api/venues/id/${venue.id}/stats/live`, {
          cache: 'no-store',
        });
        const payload = await response.json();
        if (cancelled || !response.ok || !payload?.success) {
          return;
        }

        setLiveStats(payload.data);
      } catch {
        // Keep the seeded/server-rendered stats if live polling fails.
      }
    }

    void loadStats();
    const interval = window.setInterval(() => {
      void loadStats();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [venue.id]);

  const liveSession = venue.liveSession;
  const isLive = liveSession?.status === 'LIVE';
  const isPaused = liveSession?.status === 'PAUSED';
  const rotationSeconds = liveSession?.rotationSeconds ?? venue.qrRotationSeconds;
  const effectiveNowMs = nowMs ?? (liveSession ? new Date(liveSession.lastRotatedAt).getTime() : 0);
  const qrWindowStart = qrPayload?.windowStartedAt ?? liveSession?.lastRotatedAt ?? null;
  const secondsLeft = qrWindowStart ? getSecondsLeft(qrWindowStart, rotationSeconds, effectiveNowMs) : 0;
  const qrValue = useMemo(() => qrPayload?.qrValue ?? `basedare://handshake?scope=VENUE_CHECKIN&venue=${encodeURIComponent(venue.slug)}&session=offline-preview`, [qrPayload, venue.slug]);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-transparent text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.12),transparent_28%),radial-gradient(circle_at_15%_75%,rgba(34,211,238,0.08),transparent_24%),radial-gradient(circle_at_90%_85%,rgba(250,204,21,0.06),transparent_22%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-10 sm:px-6">
        <section className="w-full space-y-6">
          <div className={`${raisedPanelClass} px-5 py-5 sm:px-8`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />
            <div className="relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-fuchsia-300/80">Venue Console</p>
                <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{venue.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/55">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <MapPin className="h-4 w-4 text-amber-300" />
                    {venue.address ? `${venue.address}, ` : ''}{venue.city}, {venue.country}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/14 bg-cyan-500/[0.06] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <Waves className="h-4 w-4 text-cyan-300" />
                    {liveSession?.campaignLabel ?? 'Venue check-in ready'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] ${
                  isLive
                    ? 'border-emerald-400/30 bg-[linear-gradient(180deg,rgba(16,185,129,0.16)_0%,rgba(6,20,15,0.92)_100%)] text-emerald-300 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.1)]'
                    : isPaused
                      ? 'border-amber-400/30 bg-[linear-gradient(180deg,rgba(245,158,11,0.14)_0%,rgba(24,15,6,0.92)_100%)] text-amber-200 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.1)]'
                      : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(10,10,14,0.92)_100%)] text-white/60 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]'
                }`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    isLive ? 'bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]' : isPaused ? 'bg-amber-300' : 'bg-white/35'
                  }`} />
                  {isLive ? 'Live' : isPaused ? 'Paused' : 'Offline'}
                </div>
                <Link
                  href="/map"
                  className="rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(10,10,14,0.92)_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/75 shadow-[0_12px_22px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-fuchsia-400/40 hover:text-white"
                >
                  Exit
                </Link>
              </div>
            </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className={`${softCardClass} p-5 sm:p-8`}>
              <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/40">BaseDare Secure Handshake</p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight">Scan to check in to this venue</h2>
                </div>
                <div className="rounded-full border border-fuchsia-400/20 bg-[linear-gradient(180deg,rgba(217,70,239,0.16)_0%,rgba(88,28,135,0.08)_100%)] px-4 py-2 text-sm font-medium text-fuchsia-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.1)]">
                  <span className="inline-flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Rotates in {formatCountdown(secondsLeft)}
                  </span>
                </div>
              </div>

              <div className="mt-8 flex flex-col items-center">
                <div className="relative rounded-[30px] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(242,243,248,0.96)_100%)] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.45),0_0_22px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.7)]">
                  <QRCodeSVG value={qrValue} size={260} level="H" includeMargin bgColor="#ffffff" fgColor="#09090b" />
                  <div className="pointer-events-none absolute inset-x-8 top-4 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />
                </div>
                <p className="mt-5 text-center text-sm text-white/60">
                  {isLive
                    ? "Guests scan here to prove presence, light up the venue memory, and unlock live dares."
                    : isPaused
                      ? 'The console is paused. Resume the session to re-enable trusted venue check-ins.'
                      : 'No live venue session is active yet. This screen is showing the seeded pilot preview.'}
                </p>
                {qrError ? (
                  <p className="mt-3 text-center text-xs uppercase tracking-[0.24em] text-rose-300/80">
                    {qrError}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                <div className={`${softCardClass} p-5`}>
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Scans Last Hour</p>
                  <div className="mt-3 inline-flex items-center gap-3">
                    <Activity className="h-5 w-5 text-emerald-300" />
                    <span className="text-3xl font-black">{liveStats.scansLastHour}</span>
                  </div>
                </div>
                <div className={`${softCardClass} p-5`}>
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Unique Visitors Today</p>
                  <div className="mt-3 text-3xl font-black">{liveStats.uniqueVisitorsToday}</div>
                </div>
                <div className={`${softCardClass} p-5`}>
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Active Dares</p>
                  <div className="mt-3 text-3xl font-black">{liveStats.activeDares}</div>
                </div>
              </div>

              <div className={`${softCardClass} p-5`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Controls</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <button
                    type="button"
                    disabled
                    className={`${insetCardClass} inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white/45`}
                  >
                    <PauseCircle className="h-4 w-4" />
                    Pause QR
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className={`${insetCardClass} inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white/55 transition hover:text-white`}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                  </button>
                  <div className="rounded-[22px] border border-dashed border-fuchsia-400/30 bg-[linear-gradient(180deg,rgba(217,70,239,0.08)_0%,rgba(12,7,22,0.92)_100%)] px-4 py-3 text-sm text-fuchsia-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    Mocked UI for the pilot venue. Session controls wire up next.
                  </div>
                </div>
              </div>

              <div className={`${softCardClass} p-5`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Recent Presence</p>
                <div className="mt-4 space-y-3">
                  {venue.recentCheckIns.length > 0 ? (
                    venue.recentCheckIns.map((checkIn) => (
                      <div
                        key={`${checkIn.walletAddress}-${checkIn.scannedAt}`}
                        className={`${insetCardClass} flex items-center justify-between px-4 py-3`}
                      >
                        <div>
                          <p className="font-semibold text-white">{checkIn.tag ?? checkIn.walletAddress.slice(0, 10)}</p>
                          <p className="text-xs uppercase tracking-[0.24em] text-white/35">{checkIn.proofLevel}</p>
                        </div>
                        <p className="text-sm text-white/55">
                          {new Date(checkIn.scannedAt).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-white/50">No recent check-ins yet for this venue.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
