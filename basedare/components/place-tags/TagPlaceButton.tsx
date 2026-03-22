'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { Crosshair, Loader2, MapPin, Sparkles, Upload, X } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useToast } from '@/components/ui/use-toast';

type TagPlaceButtonProps = {
  placeId?: string;
  placeName: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  placeSource?: string | null;
  externalPlaceId?: string | null;
  buttonClassName?: string;
  onPlaceResolved?: (place: {
    id: string;
    slug: string;
    name: string;
    address: string | null;
    city: string | null;
    country: string | null;
    latitude: number;
    longitude: number;
  }) => void;
};

const ACCEPTED_MEDIA_COPY = 'Upload a short image or video proof from the place itself.';

type SessionShape = {
  token?: string | null;
  walletAddress?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

function getSessionFields(session: SessionShape | null | undefined) {
  const token = session?.token ?? null;
  const wallet = session?.walletAddress ?? session?.user?.walletAddress ?? null;
  return {
    token,
    walletAddress: wallet?.toLowerCase() ?? null,
  };
}

export default function TagPlaceButton({
  placeId,
  placeName,
  latitude,
  longitude,
  address,
  city,
  country,
  placeSource,
  externalPlaceId,
  buttonClassName,
  onPlaceResolved,
}: TagPlaceButtonProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [vibeTags, setVibeTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'success'>('idle');
  const [mounted, setMounted] = useState(false);
  const [resolvedPlaceId, setResolvedPlaceId] = useState<string | null>(placeId ?? null);
  const [fallbackSession, setFallbackSession] = useState<SessionShape | null>(null);
  const [authChecking, setAuthChecking] = useState(false);
  const { toast } = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const {
    coordinates,
    loading: geoLoading,
    error: geoError,
    requestLocation,
    isSupported: geoSupported,
  } = useGeolocation();

  const primarySession = getSessionFields((session as SessionShape | null) ?? null);
  const backupSession = getSessionFields(fallbackSession);
  const sessionToken = primarySession.token ?? backupSession.token;
  const sessionWallet = primarySession.walletAddress ?? backupSession.walletAddress;
  const canAuthenticate = Boolean(sessionToken && sessionWallet);
  const effectivePlaceId = placeId ?? resolvedPlaceId;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    setResolvedPlaceId(placeId ?? null);
  }, [placeId, latitude, longitude, externalPlaceId]);

  useEffect(() => {
    if (open && !coordinates && !geoLoading && !geoError && geoSupported) {
      requestLocation();
    }
  }, [open, coordinates, geoLoading, geoError, geoSupported, requestLocation]);

  useEffect(() => {
    if (!open || canAuthenticate) return;

    let cancelled = false;

    const hydrateSession = async () => {
      try {
        setAuthChecking(true);
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        const payload = (await response.json().catch(() => null)) as SessionShape | null;
        if (!cancelled) {
          setFallbackSession(payload);
        }
      } catch {
        if (!cancelled) {
          setFallbackSession(null);
        }
      } finally {
        if (!cancelled) {
          setAuthChecking(false);
        }
      }
    };

    void hydrateSession();

    return () => {
      cancelled = true;
    };
  }, [open, canAuthenticate]);

  const locationStatus = useMemo(() => {
    if (!geoSupported) return 'Location is not supported in this browser.';
    if (geoLoading) return 'Locating you near this place...';
    if (geoError) return geoError;
    if (coordinates) return 'Location locked. Proof will be checked against this place.';
    return 'We need your location to leave a verified mark.';
  }, [coordinates, geoError, geoLoading, geoSupported]);

  const authMessage = useMemo(() => {
    if (authChecking || sessionStatus === 'loading') {
      return {
        title: 'Checking session',
        description: 'Verifying your wallet-backed session before this mark can hit the grid.',
        cta: 'Checking...',
      };
    }

    if (sessionWallet && !sessionToken) {
      return {
        title: 'Reconnect required',
        description: 'Your wallet is visible, but the secure session token is missing. Refresh or reconnect instead of reclaiming your tag.',
        cta: 'Reconnect session',
      };
    }

    return {
      title: 'Sign in required',
      description: 'Place tagging needs your wallet-backed session. If you already claimed your tag, just reconnect your session here.',
      cta: 'Reconnect session',
    };
  }, [authChecking, sessionStatus, sessionToken, sessionWallet]);

  async function handleSubmit() {
    if (!canAuthenticate) {
      toast({
        title: 'Sign in required',
        description: 'Connect your wallet-backed session before leaving a mark.',
        variant: 'destructive',
      });
      return;
    }

    if (!file) {
      toast({
        title: 'Proof required',
        description: 'Upload an image or video from the place itself.',
        variant: 'destructive',
      });
      return;
    }

    if (!coordinates) {
      toast({
        title: 'Location required',
        description: 'Let BaseDare verify that you are actually near this place.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      let targetPlaceId = effectivePlaceId;

      if (!targetPlaceId) {
        const resolveResponse = await fetch('/api/places/resolve-or-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: placeName,
            latitude,
            longitude,
            address,
            city,
            country,
            placeSource,
            externalPlaceId,
          }),
        });

        const resolvePayload = (await resolveResponse.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
          data?: {
              place?: {
              id: string;
              slug: string;
              name: string;
              address: string | null;
              city: string | null;
              country: string | null;
              latitude: number;
              longitude: number;
            };
          };
        };

        if (!resolveResponse.ok || !resolvePayload.success || !resolvePayload.data?.place?.id) {
          throw new Error(resolvePayload.error || 'Failed to create place anchor');
        }

        targetPlaceId = resolvePayload.data.place.id;
        setResolvedPlaceId(targetPlaceId);
        onPlaceResolved?.(resolvePayload.data.place);
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', caption.trim());
      formData.append('vibeTags', vibeTags.trim());
      formData.append('lat', String(coordinates.lat));
      formData.append('lng', String(coordinates.lng));

      const response = await fetch(`/api/places/${targetPlaceId}/tags`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        data?: { message?: string };
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to submit place tag');
      }

      setSubmitState('success');
      setFile(null);
      setCaption('');
      setVibeTags('');
      toast({
        title: 'Mark submitted',
        description: payload.data?.message || `${placeName} is now waiting in the Chaos Inbox.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit place tag';
      toast({
        title: 'Could not submit mark',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setSubmitState('idle');
        }}
        className={buttonClassName ?? 'inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/24 bg-cyan-500/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200'}
      >
        <Sparkles className="h-4 w-4" />
        Tag this place
      </button>

      {open && mounted
        ? createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(2,4,10,0.82)] px-4 py-6 backdrop-blur-xl">
          <div className="relative w-full max-w-xl overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_10%,rgba(7,9,18,0.96)_58%,rgba(5,6,14,0.98)_100%)] shadow-[0_30px_100px_rgba(0,0,0,0.55),0_0_34px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-14px_24px_rgba(0,0,0,0.24)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_88%_100%,rgba(168,85,247,0.12),transparent_36%)]" />
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />

            <div className="relative px-6 py-6 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-200">
                    <Crosshair className="h-3.5 w-3.5" />
                    Leave your mark
                  </div>
                  <h3 className="mt-4 text-2xl font-black text-white">{placeName}</h3>
                  <p className="mt-2 max-w-lg text-sm text-white/60">
                    Verified marks turn places into living memory. Submit proof from the spot and we will route it into review.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/12 bg-white/[0.05] p-2 text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {submitState === 'success' ? (
                <div className="mt-6 rounded-[24px] border border-emerald-500/20 bg-emerald-500/[0.08] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">Submitted</p>
                  <p className="mt-3 text-lg font-bold text-white">Your mark is in the Chaos Inbox.</p>
                  <p className="mt-2 text-sm text-white/65">
                    Once approved, it will start feeding the place memory, heat, and soon the Crossed Paths layer.
                  </p>
                  <div className="mt-5 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmitState('idle')}
                      className="rounded-full border border-cyan-400/24 bg-cyan-500/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200"
                    >
                      Submit another
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Proof</p>
                      <label className="mt-3 flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-white/14 bg-white/[0.03] px-4 py-5 text-center transition hover:border-cyan-400/30 hover:bg-cyan-500/[0.04]">
                        <Upload className="h-6 w-6 text-cyan-200" />
                        <p className="mt-3 text-sm font-semibold text-white">
                          {file ? file.name : 'Upload image or video'}
                        </p>
                        <p className="mt-2 text-xs text-white/45">{ACCEPTED_MEDIA_COPY}</p>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                        />
                      </label>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Caption</p>
                        <textarea
                          value={caption}
                          onChange={(event) => setCaption(event.target.value)}
                          placeholder="What happened here?"
                          className="mt-3 h-24 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28 focus:border-cyan-400/28 focus:outline-none"
                        />
                      </div>

                      <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Vibe Tags</p>
                        <input
                          value={vibeTags}
                          onChange={(event) => setVibeTags(event.target.value)}
                          placeholder="hidden, nightlife, chaos"
                          className="mt-3 h-12 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 text-sm text-white placeholder:text-white/28 focus:border-cyan-400/28 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 text-cyan-200" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-white/40">Location Check</p>
                        <p className="mt-2 text-sm text-white/68">{locationStatus}</p>
                        <p className="mt-2 text-xs text-white/34">
                          Target anchor: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                        </p>
                        {!coordinates && geoSupported ? (
                          <button
                            type="button"
                            onClick={requestLocation}
                            className="mt-3 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75"
                          >
                            Refresh location
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {!canAuthenticate ? (
                    <div className="mt-5 rounded-[22px] border border-amber-400/20 bg-amber-500/[0.06] px-4 py-4 text-sm text-amber-100">
                      <p className="font-semibold">{authMessage.title}</p>
                      <p className="mt-2 text-amber-100/70">
                        {authMessage.description}
                      </p>
                      <Link
                        href="/claim-tag"
                        className="mt-4 inline-flex rounded-full border border-amber-300/24 bg-amber-500/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100"
                      >
                        {authMessage.cta}
                      </Link>
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting || authChecking}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/24 bg-cyan-500/[0.1] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 disabled:opacity-60"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Submit mark
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
