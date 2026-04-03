'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { Crosshair, Loader2, Sparkles, Target, Wallet, X, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { submitBountyCreation, type BountyApprovalStatus, type BountyCreationResult } from '@/lib/bounty-flow';
import { getPlaceChallengeTemplates, type PlaceChallengeTemplate } from '@/lib/place-challenge-templates';

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

type CreatePlaceChallengeButtonProps = {
  placeId?: string;
  placeName: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  categories?: string[] | null;
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
  onChallengeCreated?: (payload: {
    placeId: string;
    result: BountyCreationResult;
  }) => void;
};

const PROTOCOL_WINDOW_COPY = 'Current protocol window: 24h expiry under the live dare engine.';

export default function CreatePlaceChallengeButton({
  placeId,
  placeName,
  latitude,
  longitude,
  address,
  city,
  country,
  categories,
  placeSource,
  externalPlaceId,
  buttonClassName,
  onPlaceResolved,
  onChallengeCreated,
}: CreatePlaceChallengeButtonProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [resolvedPlaceId, setResolvedPlaceId] = useState<string | null>(placeId ?? null);
  const [fallbackSession, setFallbackSession] = useState<SessionShape | null>(null);
  const [authChecking, setAuthChecking] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('10');
  const [missionTag, setMissionTag] = useState('place');
  const [discoveryRadiusKm, setDiscoveryRadiusKm] = useState('0.5');
  const [isTargeted, setIsTargeted] = useState(false);
  const [streamerTag, setStreamerTag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<BountyApprovalStatus>('idle');
  const [submitState, setSubmitState] = useState<'idle' | 'success'>('idle');
  const [creationResult, setCreationResult] = useState<BountyCreationResult | null>(null);
  const { toast } = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const { address: walletAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const primarySession = getSessionFields((session as SessionShape | null) ?? null);
  const backupSession = getSessionFields(fallbackSession);
  const sessionToken = primarySession.token ?? backupSession.token;
  const sessionWallet = primarySession.walletAddress ?? backupSession.walletAddress;
  const normalizedConnectedWallet = walletAddress?.toLowerCase() ?? null;
  const hasVerifiedSession = Boolean(sessionToken && sessionWallet);
  const hasWalletConnection = Boolean(isConnected && normalizedConnectedWallet);
  const canAuthenticate = Boolean(hasVerifiedSession || hasWalletConnection);
  const hasWalletMismatch = Boolean(
    hasVerifiedSession &&
      normalizedConnectedWallet &&
      sessionWallet &&
      sessionWallet !== normalizedConnectedWallet
  );
  const effectivePlaceId = placeId ?? resolvedPlaceId;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    setResolvedPlaceId(placeId ?? null);
  }, [placeId, latitude, longitude, externalPlaceId]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || hasVerifiedSession) return;

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
  }, [hasVerifiedSession, open]);

  const authMessage = useMemo(() => {
    if (authChecking || sessionStatus === 'loading') {
      return {
        title: 'Checking session',
        description: 'Verifying your wallet-backed session before this challenge can hit the grid.',
        cta: 'Checking...',
      };
    }

    if (hasWalletMismatch) {
      return {
        title: 'Wallet mismatch',
        description: 'Your connected wallet does not match the session we found. Reconnect the same wallet before funding this challenge.',
        cta: 'Reconnect wallet',
      };
    }

    if (hasWalletConnection && !hasVerifiedSession) {
      return {
        title: 'Wallet connected',
        description: 'Your wallet is live. We can use the connected wallet for funding even if the old session token has gone stale.',
        cta: 'Wallet ready',
      };
    }

    if (sessionWallet && !sessionToken) {
      return {
        title: 'Reconnect required',
        description: 'Your wallet is visible, but the secure session token is missing. Refresh or reconnect instead of starting a fresh claim flow.',
        cta: 'Reconnect session',
      };
    }

    return {
      title: 'Sign in required',
      description: 'Place-native challenges need your wallet-backed session so the funding flow stays tied to a real operator.',
      cta: 'Reconnect session',
    };
  }, [authChecking, hasVerifiedSession, hasWalletConnection, hasWalletMismatch, sessionStatus, sessionToken, sessionWallet]);

  const statusCopy = useMemo(() => {
    switch (approvalStatus) {
      case 'approving':
        return 'Approve USDC spend in your wallet...';
      case 'funding':
        return 'Funding challenge onchain...';
      case 'verifying':
        return 'Registering challenge with BaseDare...';
      default:
        return PROTOCOL_WINDOW_COPY;
    }
  }, [approvalStatus]);

  const placeChallengeSuggestions = useMemo(
    () =>
      getPlaceChallengeTemplates({
        placeName,
        address,
        city,
        country,
        categories,
      }),
    [address, categories, city, country, placeName]
  );

  function applyTemplate(template: PlaceChallengeTemplate) {
    setTitle(template.title);
    setDescription(template.description);
    setMissionTag(template.missionTag);
    setDiscoveryRadiusKm(String(template.discoveryRadiusKm));
  }

  async function resolvePlaceAnchor() {
    if (effectivePlaceId) {
      return effectivePlaceId;
    }

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
      throw new Error(resolvePayload.error || 'This challenge must be attached to a valid place. Retry or reselect the location.');
    }

    setResolvedPlaceId(resolvePayload.data.place.id);
    onPlaceResolved?.(resolvePayload.data.place);
    return resolvePayload.data.place.id;
  }

  async function handleSubmit() {
    if (hasWalletMismatch) {
      toast({
        title: 'Wallet mismatch',
        description: 'Reconnect the same wallet you used for your current BaseDare session before funding this challenge.',
        variant: 'destructive',
      });
      return;
    }

    if (!canAuthenticate || !normalizedConnectedWallet) {
      toast({
        title: 'Wallet required',
        description: 'Connect your wallet before launching a place challenge.',
        variant: 'destructive',
      });
      return;
    }

    if (title.trim().length < 3) {
      toast({
        title: 'Title required',
        description: 'Give the challenge a title that people can actually act on.',
        variant: 'destructive',
      });
      return;
    }

    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue < 5) {
      toast({
        title: 'Amount too low',
        description: 'Minimum challenge bounty is $5 USDC.',
        variant: 'destructive',
      });
      return;
    }

    if (isTargeted && streamerTag.trim() && !/^@[a-zA-Z0-9_]+$/.test(streamerTag.trim())) {
      toast({
        title: 'Invalid target tag',
        description: 'Targeted challenges need a valid @handle.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      setApprovalStatus('idle');

      const targetPlaceId = await resolvePlaceAnchor();
      const result = await submitBountyCreation(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          amount: amountValue,
          streamerTag: isTargeted ? streamerTag.trim() || undefined : undefined,
          streamId: 'dev-stream-001',
          missionMode: 'IRL',
          missionTag: missionTag.trim() || 'place',
          isNearbyDare: true,
          latitude,
          longitude,
          locationLabel: placeName,
          discoveryRadiusKm: Number(discoveryRadiusKm) || 0.5,
          venueId: targetPlaceId,
          creationContext: 'MAP',
          stakerAddress: normalizedConnectedWallet,
        },
        {
          sessionToken,
          publicClient,
          writeContractAsync,
          onApprovalStatusChange: setApprovalStatus,
        }
      );

      setCreationResult(result);
      setSubmitState('success');
      onChallengeCreated?.({ placeId: targetPlaceId, result });
      toast({
        title: 'Challenge live',
        description: `${placeName} now has active stakes on the grid.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create challenge';
      toast({
        title: 'Could not launch challenge',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setApprovalStatus('idle');
    }
  }

  function resetComposer() {
    const leadTemplate = placeChallengeSuggestions.templates[0];
    setSubmitState('idle');
    setCreationResult(null);
    setTitle('');
    setDescription('');
    setAmount('10');
    setMissionTag(leadTemplate?.missionTag ?? 'place');
    setDiscoveryRadiusKm(String(leadTemplate?.discoveryRadiusKm ?? 0.5));
    setIsTargeted(false);
    setStreamerTag('');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          resetComposer();
        }}
        className={
          buttonClassName ??
          'inline-flex items-center justify-center gap-2 rounded-full border border-[#f5c518]/26 bg-[#f5c518]/[0.1] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#f8dd72]'
        }
      >
        <Zap className="h-4 w-4" />
        <span className="max-w-[6.5rem] text-balance leading-[1.08] sm:max-w-none">
          Create challenge
        </span>
      </button>

      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[125] bg-[rgba(2,4,10,0.56)] backdrop-blur-lg sm:flex sm:items-center sm:justify-center sm:bg-[rgba(2,4,10,0.82)] sm:px-4 sm:py-6 sm:backdrop-blur-xl"
              onClick={() => setOpen(false)}
            >
              <div className="relative flex h-full w-full items-end sm:items-center sm:justify-center">
                <div
                  onClick={(event) => event.stopPropagation()}
                  className="relative mt-auto flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[30px] border border-white/12 border-b-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_10%,rgba(10,8,18,0.97)_58%,rgba(6,6,14,0.98)_100%)] shadow-[0_30px_100px_rgba(0,0,0,0.55),0_0_34px_rgba(245,197,24,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-14px_24px_rgba(0,0,0,0.24)] sm:mt-0 sm:max-h-[92dvh] sm:max-w-2xl sm:rounded-[30px] sm:border-b"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(245,197,24,0.16),transparent_34%),radial-gradient(circle_at_88%_100%,rgba(168,85,247,0.12),transparent_36%)]" />
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />

                  <div className="relative flex flex-1 flex-col overflow-hidden">
                    <div className="sticky top-0 z-10 border-b border-white/8 bg-[rgba(8,10,20,0.88)] px-5 pb-4 pt-3 backdrop-blur-xl sm:border-b-0 sm:bg-transparent sm:px-7 sm:pb-0 sm:pt-6">
                      <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-white/15 sm:hidden" />
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/22 bg-[#f5c518]/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#f8dd72]">
                            <Crosshair className="h-3.5 w-3.5" />
                            Fund a place challenge
                          </div>
                          <h3 className="mt-4 text-2xl font-black text-white">{placeName}</h3>
                          <p className="mt-2 max-w-lg text-sm text-white/60">
                            Turn this place into a live challenge market. Fund a real-world mission here and let the completion become memory.
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
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-6 sm:pt-6">
                      {submitState === 'success' && creationResult ? (
                        <div className="rounded-[24px] border border-[#f5c518]/25 bg-[#f5c518]/[0.08] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          <p className="text-xs uppercase tracking-[0.24em] text-[#f8dd72]">Challenge live</p>
                          <p className="mt-3 text-lg font-bold text-white">The bounty is now anchored to {placeName}.</p>
                          <p className="mt-2 text-sm text-white/65">
                            Next step: someone completes it, the proof clears, and the place gains new memory automatically.
                          </p>
                          {creationResult.shortId ? (
                            <Link
                              href={`/dare/${creationResult.shortId}`}
                              className="mt-4 inline-flex rounded-full border border-white/12 bg-black/22 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/82"
                            >
                              Open dare
                            </Link>
                          ) : null}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">
                                  {placeChallengeSuggestions.title}
                                </p>
                                <p className="mt-2 max-w-xl text-sm text-white/62">
                                  {placeChallengeSuggestions.description}
                                </p>
                              </div>
                              <div className="hidden rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f8dd72] sm:inline-flex">
                                {placeChallengeSuggestions.archetype.replace('-', ' ')}
                              </div>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              {placeChallengeSuggestions.templates.map((template) => {
                                const active =
                                  title.trim() === template.title &&
                                  description.trim() === template.description;

                                return (
                                  <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => applyTemplate(template)}
                                    className={`rounded-[20px] border px-4 py-4 text-left transition ${
                                      active
                                        ? 'border-[#f5c518]/35 bg-[#f5c518]/[0.12] shadow-[0_14px_26px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]'
                                        : 'border-white/10 bg-black/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-[#f5c518]/22 hover:bg-[#f5c518]/[0.06]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f8dd72]">
                                      <Sparkles className="h-3.5 w-3.5" />
                                      {template.label}
                                    </div>
                                    <p className="mt-3 text-sm font-semibold text-white">
                                      {template.title}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/48">
                                        {template.missionTag}
                                      </span>
                                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/48">
                                        {template.discoveryRadiusKm} km
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Challenge title</p>
                              <input
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder={placeChallengeSuggestions.templates[0]?.title ?? 'Film the wildest sunrise jump here'}
                                className="mt-3 h-12 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 text-sm text-white placeholder:text-white/28 focus:border-[#f5c518]/32 focus:outline-none"
                              />
                            </div>

                            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Bounty amount</p>
                              <div className="mt-3 flex items-center gap-3 rounded-[18px] border border-white/10 bg-black/20 px-4">
                                <Wallet className="h-4 w-4 text-[#f8dd72]" />
                                <input
                                  value={amount}
                                  onChange={(event) => setAmount(event.target.value)}
                                  type="number"
                                  min={5}
                                  step={1}
                                  className="h-12 w-full bg-transparent text-sm font-semibold text-white outline-none"
                                />
                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">USDC</span>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Instructions</p>
                            <textarea
                              value={description}
                              onChange={(event) => setDescription(event.target.value)}
                              placeholder={
                                placeChallengeSuggestions.templates[0]?.description ??
                                'What exactly should happen at this place?'
                              }
                              className="mt-3 h-28 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/28 focus:border-[#f5c518]/32 focus:outline-none"
                            />
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Challenge vibe</p>
                              <input
                                value={missionTag}
                                onChange={(event) => setMissionTag(event.target.value)}
                                placeholder="nightlife"
                                className="mt-3 h-12 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 text-sm text-white placeholder:text-white/28 focus:border-[#f5c518]/32 focus:outline-none"
                              />
                            </div>

                            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Discovery radius</p>
                              <select
                                value={discoveryRadiusKm}
                                onChange={(event) => setDiscoveryRadiusKm(event.target.value)}
                                className="mt-3 h-12 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white focus:border-[#f5c518]/32 focus:outline-none"
                              >
                                <option value="0.5">0.5 km</option>
                                <option value="1">1 km</option>
                                <option value="2">2 km</option>
                                <option value="5">5 km</option>
                              </select>
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Targeting</p>
                                <p className="mt-2 text-sm text-white/62">
                                  Launch open to anyone, or tether it to a specific creator tag.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsTargeted((current) => !current)}
                                className={`relative h-8 w-14 rounded-full border transition ${
                                  isTargeted
                                    ? 'border-[#f5c518]/55 bg-[#f5c518]/[0.18]'
                                    : 'border-white/10 bg-white/[0.04]'
                                }`}
                              >
                                <span
                                  className={`absolute top-1 h-5 w-5 rounded-full transition ${
                                    isTargeted ? 'left-8 bg-[#f5c518]' : 'left-1 bg-white/40'
                                  }`}
                                />
                              </button>
                            </div>
                            {isTargeted ? (
                              <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-white/10 bg-black/20 px-4">
                                <Target className="h-4 w-4 text-[#f8dd72]" />
                                <input
                                  value={streamerTag}
                                  onChange={(event) => setStreamerTag(event.target.value)}
                                  placeholder="@basedarebear"
                                  className="h-12 w-full bg-transparent text-sm text-white placeholder:text-white/28 outline-none"
                                />
                              </div>
                            ) : null}
                          </div>

                          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
                            <div className="flex items-start gap-3">
                              <Sparkles className="mt-0.5 h-4 w-4 text-[#f8dd72]" />
                              <div>
                                <p className="text-xs uppercase tracking-[0.24em] text-white/40">Place lock</p>
                                <p className="mt-2 text-sm text-white/68">
                                  This challenge will be anchored to {placeName}. The map flow will not create a loose-coordinate bounty.
                                </p>
                                <p className="mt-2 text-xs text-white/34">{statusCopy}</p>
                              </div>
                            </div>
                          </div>

                          {!hasVerifiedSession ? (
                            <div
                              className={`rounded-[22px] px-4 py-4 text-sm ${
                                hasWalletConnection && !hasWalletMismatch
                                  ? 'border border-emerald-400/18 bg-emerald-500/[0.06] text-emerald-100'
                                  : 'border border-amber-400/20 bg-amber-500/[0.06] text-amber-100'
                              }`}
                            >
                              <p className="font-semibold">{authMessage.title}</p>
                              <p
                                className={`mt-2 ${
                                  hasWalletConnection && !hasWalletMismatch
                                    ? 'text-emerald-100/72'
                                    : 'text-amber-100/70'
                                }`}
                              >
                                {authMessage.description}
                              </p>
                              {hasWalletConnection && !hasWalletMismatch ? (
                                <div className="mt-4 inline-flex rounded-full border border-emerald-300/20 bg-emerald-500/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                                  {authMessage.cta}
                                </div>
                              ) : (
                                <Link
                                  href="/claim-tag"
                                  className="mt-4 inline-flex rounded-full border border-amber-300/24 bg-amber-500/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100"
                                >
                                  {authMessage.cta}
                                </Link>
                              )}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {submitState !== 'success' ? (
                      <div className="sticky bottom-0 z-10 border-t border-white/10 bg-[rgba(7,9,18,0.92)] px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl sm:px-7">
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/75"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#f5c518]/36 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.09),transparent_42%),linear-gradient(180deg,rgba(245,197,24,0.24)_0%,rgba(102,63,11,0.88)_48%,rgba(38,22,4,0.98)_100%)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#fff3be] shadow-[0_18px_34px_rgba(0,0,0,0.26),0_0_28px_rgba(245,197,24,0.14),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-18px_20px_rgba(0,0,0,0.28)] transition hover:-translate-y-[1px] hover:border-[#f8dd72]/62 hover:shadow-[0_22px_42px_rgba(0,0,0,0.3),0_0_32px_rgba(245,197,24,0.2),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-20px_22px_rgba(0,0,0,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                            <span className="text-balance leading-[1.1]">
                              {approvalStatus === 'idle' ? 'Fund & launch challenge' : statusCopy}
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="sticky bottom-0 z-10 border-t border-white/10 bg-[rgba(7,9,18,0.92)] px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl sm:px-7">
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/75"
                          >
                            Close
                          </button>
                          <button
                            type="button"
                            onClick={resetComposer}
                            className="rounded-full border border-[#f5c518]/32 bg-[#f5c518]/[0.1] px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#f8dd72]"
                          >
                            Launch another
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
