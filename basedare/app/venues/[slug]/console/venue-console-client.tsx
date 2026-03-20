'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Activity, MapPin, PauseCircle, RefreshCcw, Timer, Waves } from 'lucide-react';
import type { VenueDetail, VenueQrPayload } from '@/lib/venue-types';

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
    <main className="min-h-screen bg-[#05010c] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.18),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(245,158,11,0.14),_transparent_30%)] pointer-events-none" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-10 sm:px-6">
        <section className="w-full overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,7,20,0.98),rgba(6,4,14,0.96))] shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
          <div className="border-b border-white/10 bg-white/[0.02] px-5 py-4 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-fuchsia-300/80">Venue Console</p>
                <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{venue.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/55">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-300" />
                    {venue.address ? `${venue.address}, ` : ''}{venue.city}, {venue.country}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Waves className="h-4 w-4 text-cyan-300" />
                    {liveSession?.campaignLabel ?? 'Venue check-in ready'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] ${
                  isLive
                    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                    : isPaused
                      ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                      : 'border-white/10 bg-white/5 text-white/60'
                }`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    isLive ? 'bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]' : isPaused ? 'bg-amber-300' : 'bg-white/35'
                  }`} />
                  {isLive ? 'Live' : isPaused ? 'Paused' : 'Offline'}
                </div>
                <Link
                  href="/map"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/75 transition hover:border-fuchsia-400/40 hover:text-white"
                >
                  Exit
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/40">BaseDare Secure Handshake</p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight">Scan to check in to this venue</h2>
                </div>
                <div className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-2 text-sm font-medium text-fuchsia-200">
                  <span className="inline-flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Rotates in {formatCountdown(secondsLeft)}
                  </span>
                </div>
              </div>

              <div className="mt-8 flex flex-col items-center">
                <div className="relative rounded-[30px] border border-white/15 bg-white p-5 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
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
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Scans Last Hour</p>
                  <div className="mt-3 inline-flex items-center gap-3">
                    <Activity className="h-5 w-5 text-emerald-300" />
                    <span className="text-3xl font-black">{liveStats.scansLastHour}</span>
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Unique Visitors Today</p>
                  <div className="mt-3 text-3xl font-black">{liveStats.uniqueVisitorsToday}</div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Active Dares</p>
                  <div className="mt-3 text-3xl font-black">{liveStats.activeDares}</div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Controls</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/45"
                  >
                    <PauseCircle className="h-4 w-4" />
                    Pause QR
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/45"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                  </button>
                  <div className="rounded-2xl border border-dashed border-fuchsia-400/30 bg-fuchsia-500/5 px-4 py-3 text-sm text-fuchsia-100/80">
                    Mocked UI for the pilot venue. Session controls wire up next.
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Recent Presence</p>
                <div className="mt-4 space-y-3">
                  {venue.recentCheckIns.length > 0 ? (
                    venue.recentCheckIns.map((checkIn) => (
                      <div
                        key={`${checkIn.walletAddress}-${checkIn.scannedAt}`}
                        className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3"
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
