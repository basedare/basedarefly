'use client';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Zap, Wallet, Clock, Users, ChevronRight, Loader2, CheckCircle, Copy, AlertTriangle, MessageCircle, MapPin, Navigation, ImagePlus, X, Info } from "lucide-react";
import { useAccount, useReadContract, useWriteContract, usePublicClient, useSignMessage } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { FundButton } from '@coinbase/onchainkit/fund';
import DareGenerator from "@/components/DareGenerator";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";
import ShareComposerButton from "@/components/ShareComposerButton";
import InitProtocolButton from "@/components/InitProtocolButton";
import { useToast } from '@/components/ui/use-toast';
import { useFeedback } from '@/hooks/useFeedback';
import { USDC_ABI } from '@/abis/BaseDareBounty';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useBountyMode } from '@/hooks/useBountyMode';
import { buildBountyCreateMessage } from '@/lib/bounty-create-auth';
import { USDC_ADDRESS, CONTRACT_VALIDATION } from '@/lib/contracts';
import { submitBountyCreation } from '@/lib/bounty-flow';
import { trackClientEvent } from '@/lib/analytics';
import {
  formatSentinelPausedMessage,
  getSentinelRecommendation,
  getSentinelReasonForSelection,
  type SentinelRecommendationReason,
} from '@/lib/sentinel';
const NEARBY_TOAST_KEY = 'basedare_nearby_toast_seen_v1';

const dentInputClass =
  "bd-dent-surface bd-dent-surface--soft border-white/[0.06] backdrop-blur-2xl bg-white/[0.03]";

const dentGroupClass =
  "bd-dent-surface bd-dent-surface--soft border-white/[0.06] backdrop-blur-2xl bg-white/[0.03]";

// Liquid Metal Contact Button Component
function ContactButton() {
  const { trigger } = useFeedback();

  return (
    <a
      href="https://x.com/lizardlarry7"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trigger('click')}
      className="relative group p-[1px] rounded-xl overflow-hidden inline-flex"
    >
      {/* Liquid metal border - spins on hover */}
      <div
        className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#1a1a1a_0%,#525252_20%,#a1a1aa_25%,#525252_30%,#1a1a1a_50%,#525252_70%,#a1a1aa_75%,#525252_80%,#1a1a1a_100%)] opacity-60 group-hover:opacity-100 group-hover:animate-[spin_3s_linear_infinite] transition-opacity duration-500"
        aria-hidden="true"
      />

      {/* Button content */}
      <div className="relative flex items-center gap-2 bg-[#0a0a0a] backdrop-blur-xl px-4 py-2.5 rounded-[11px]">
        {/* Inner glass highlight */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.08] via-transparent to-white/[0.03] pointer-events-none rounded-[11px]" />

        <MessageCircle className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors relative z-10" />
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors relative z-10">
          Contact
        </span>
      </div>
    </a>
  );
}

// Validation schema matching the API
const CreateBountySchema = z.object({
  streamerTag: z
    .string()
    .max(20, 'Tag must be 20 characters or less')
    .regex(/^(@[a-zA-Z0-9_]+)?$/, 'Tag must start with @ (e.g., @KaiCenat)')
    .optional()
    .or(z.literal('')), // Allow empty string for open bounties
  title: z
    .string()
    .min(3, 'Mission must be at least 3 characters')
    .max(100, 'Mission too long'),
  amount: z
    .number({ message: 'Amount must be a number' })
    .min(5, 'Minimum bounty is $5 USDC')
    .max(10000, 'Maximum bounty is $10,000 USDC'),
  timeValue: z.number().min(1, 'Time value required'),
  timeUnit: z.enum(['Hours', 'Days', 'Weeks']),
  streamId: z.string().default('dev-stream-001'),
  missionMode: z.enum(['IRL', 'STREAM']).default('IRL'),
  missionTag: z.string().min(1).max(40).default('nightlife'),
  // Nearby dare fields
  isNearbyDare: z.boolean().default(true),
  locationLabel: z.string().max(100).optional(),
  discoveryRadiusKm: z.number().min(0.5).max(50).default(5),
  requireSentinel: z.boolean().default(false),
});

type FormData = z.input<typeof CreateBountySchema>;

interface SuccessData {
  dareId: string;
  simulated?: boolean;
  awaitingClaim?: boolean;
  inviteLink?: string | null;
  claimDeadline?: string | null;
  streamerTag?: string | null;
  shortId?: string;
  isOpenBounty?: boolean;
  isNearbyDare?: boolean;
  locationLabel?: string | null;
}

type DareImageUploadState = {
  previewUrl: string;
  file: File | null;
  uploadedUrl?: string;
  uploadedCid?: string;
};

type PublicAppSettings = {
  sentinelEnabled: boolean;
  sentinelPausedReason: string | null;
};

function CreateDareContent() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'approving' | 'funding' | 'verifying'>('idle');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { trigger } = useFeedback();
  const { data: session } = useSession();
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const sessionToken = (session as { token?: string } | null)?.token;
  const sessionWalletRaw = (session as { walletAddress?: string | null } | null)?.walletAddress;
  const sessionWallet = sessionWalletRaw?.toLowerCase() ?? null;
  const { simulated: isSimulationMode } = useBountyMode();
  const isOnchainContractsReady = CONTRACT_VALIDATION.coreValid;
  const onchainContractError = CONTRACT_VALIDATION.errors.join(' ');

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();
  const [dareImage, setDareImage] = useState<DareImageUploadState | null>(null);
  const [, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<PublicAppSettings>({
    sentinelEnabled: true,
    sentinelPausedReason: null,
  });
  const recommendationTrackedRef = useRef<SentinelRecommendationReason | null>(null);

  // Wallet & Balance Check
  const { address, isConnected } = useAccount();
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !isSimulationMode && !!address && isOnchainContractsReady },
  });

  // Geolocation for nearby dares
  const {
    coordinates,
    loading: geoLoading,
    error: geoError,
    requestLocation,
    clearLocation,
    isSupported: geoSupported,
  } = useGeolocation();

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<FormData>({
    resolver: zodResolver(CreateBountySchema),
    defaultValues: {
      streamerTag: '',
      title: '',
      amount: 100,
      timeValue: 24,
      timeUnit: 'Hours',
      streamId: 'dev-stream-001',
      missionMode: 'IRL',
      missionTag: 'nightlife',
      isNearbyDare: true,
      locationLabel: '',
      discoveryRadiusKm: 5,
      requireSentinel: false,
    },
  });

  // Watch nearby dare toggle to auto-request location
  const watchIsNearbyDare = watch('isNearbyDare');
  const watchTitle = watch('title');
  const watchMissionTag = watch('missionTag');
  const watchRequireSentinel = watch('requireSentinel');
  const watchAmount = watch('amount');
  const handleGeneratorContextChange = useCallback(
    ({ mode, tag }: { mode: 'IRL' | 'STREAM'; tag: string }) => {
      if (getValues('missionMode') !== mode) {
        setValue('missionMode', mode);
      }

      if (getValues('missionTag') !== tag) {
        setValue('missionTag', tag);
      }
    },
    [getValues, setValue]
  );
  const sentinelRecommendation = useMemo(
    () =>
      getSentinelRecommendation({
        amount: watchAmount,
        missionTag: watchMissionTag,
      }),
    [watchAmount, watchMissionTag]
  );
  const isSentinelRecommended = appSettings.sentinelEnabled && sentinelRecommendation.recommended;
  const sentinelRecommendationReason = appSettings.sentinelEnabled
    ? sentinelRecommendation.reason
    : 'none';

  // Pre-fill form from URL params (coming from home page)
  useEffect(() => {
    const streamer = searchParams.get('streamer');
    const title = searchParams.get('title');
    if (streamer) setValue('streamerTag', streamer);
    if (title) setValue('title', title);
  }, [searchParams, setValue]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(NEARBY_TOAST_KEY)) return;

    toast({
      title: 'Nearby Dares Enabled!',
      description: '3 challenges waiting within 500m — open now or turn off in Settings.',
      duration: 7000,
    });

    window.localStorage.setItem(NEARBY_TOAST_KEY, '1');
  }, [toast]);

  useEffect(() => {
    if (!watchIsNearbyDare) return;
    if (!geoSupported || geoLoading || coordinates || geoError) return;
    requestLocation();
  }, [watchIsNearbyDare, geoSupported, geoLoading, coordinates, geoError, requestLocation]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await fetch('/api/settings');
        const payload = await response.json();

        if (!response.ok || !payload?.success || cancelled) {
          return;
        }

        setAppSettings({
          sentinelEnabled: payload.data?.sentinelEnabled !== false,
          sentinelPausedReason: payload.data?.sentinelPausedReason ?? null,
        });
      } catch (error) {
        console.error('[CREATE] Failed to load public settings:', error);
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!appSettings.sentinelEnabled && watchRequireSentinel) {
      setValue('requireSentinel', false, { shouldDirty: false, shouldTouch: false });
      return;
    }

    if (dirtyFields.requireSentinel) {
      return;
    }

    if (watchRequireSentinel !== isSentinelRecommended) {
      setValue('requireSentinel', isSentinelRecommended, { shouldDirty: false, shouldTouch: false });
    }
  }, [
    appSettings.sentinelEnabled,
    dirtyFields.requireSentinel,
    isSentinelRecommended,
    setValue,
    watchRequireSentinel,
  ]);

  useEffect(() => {
    if (!isSentinelRecommended) {
      return;
    }

    if (recommendationTrackedRef.current === sentinelRecommendationReason) {
      return;
    }

    recommendationTrackedRef.current = sentinelRecommendationReason;
    trackClientEvent('sentinel_recommended_shown', {
      recommended: true,
      selected: watchRequireSentinel,
      reason: sentinelRecommendationReason,
      source: 'create_form',
    });
  }, [isSentinelRecommended, sentinelRecommendationReason, watchRequireSentinel]);

  // Balance check for FundButton (skip in simulation mode)
  const requiredAmount = watchAmount ? parseUnits(String(watchAmount), 6) : BigInt(0);
  const hasInsufficientBalance = !isSimulationMode && isConnected && usdcBalance !== undefined && usdcBalance < requiredAmount;
  const formattedBalance = usdcBalance ? formatUnits(usdcBalance, 6) : '0';

  // Debug: log validation errors
  const onError = (errors: FieldErrors<FormData>) => {
    console.log('[CREATE] Validation errors:', errors);
  };

  const requireSentinelField = register('requireSentinel', {
    onChange: (event) => {
      const selected = Boolean((event.target as HTMLInputElement).checked);
      trackClientEvent('sentinel_opt_in_toggled', {
        recommended: sentinelRecommendationReason !== 'none',
        selected,
        reason: getSentinelReasonForSelection({
          recommendedReason: sentinelRecommendationReason,
          selected,
        }),
        source: 'create_form',
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    trigger('fund');
    console.log('[CREATE] Form submitted with data:', data);
    setIsSubmitting(true);
    setSuccessData(null);
    setApprovalStatus('idle');

    try {
      const connectedWallet = address?.toLowerCase();
      const selectedSentinel = Boolean(data.requireSentinel);
      if (!connectedWallet) {
        throw new Error('Connect your wallet before deploying a dare');
      }

      let walletAuthHeaders: Record<string, string> | undefined;
      if (!sessionToken || !sessionWallet || sessionWallet !== connectedWallet) {
        const issuedAt = new Date().toISOString();
        const message = buildBountyCreateMessage({
          walletAddress: connectedWallet,
          issuedAt,
        });
        const signature = await signMessageAsync({ message });
        walletAuthHeaders = {
          'x-basedare-bounty-wallet': connectedWallet,
          'x-basedare-bounty-signature': String(signature),
          'x-basedare-bounty-issued-at': issuedAt,
        };
      }

      let uploadedDareImage = dareImage;
      if (dareImage?.file && (!dareImage.uploadedUrl || !dareImage.uploadedCid)) {
        setIsUploadingImage(true);
        setImageError(null);

        const uploadFormData = new FormData();
        uploadFormData.append('file', dareImage.file);
        uploadFormData.append('walletAddress', connectedWallet);

        const uploadHeaders: Record<string, string> = {
          ...(walletAuthHeaders ?? {}),
        };

        if (sessionToken) {
          uploadHeaders.Authorization = `Bearer ${sessionToken}`;
        }

        const uploadResponse = await fetch('/api/upload/dare-image', {
          method: 'POST',
          headers: uploadHeaders,
          body: uploadFormData,
        });

        const uploadPayload = await uploadResponse.json().catch(() => null) as {
          success?: boolean;
          error?: string;
          data?: { url: string; cid: string };
        } | null;

        if (!uploadResponse.ok || !uploadPayload?.success || !uploadPayload.data) {
          throw new Error(uploadPayload?.error || 'Failed to upload dare image');
        }

        uploadedDareImage = {
          ...dareImage,
          uploadedUrl: uploadPayload.data.url,
          uploadedCid: uploadPayload.data.cid,
        };
        setDareImage(uploadedDareImage);
      }

      const isNearbyDareEnabled = Boolean(data.isNearbyDare);
      const result = await submitBountyCreation(
        {
          title: data.title,
          amount: data.amount,
          streamerTag: data.streamerTag,
          streamId: data.streamId ?? 'dev-stream-001',
          missionMode: data.missionMode ?? 'IRL',
          missionTag: data.missionTag ?? 'nightlife',
          isNearbyDare: isNearbyDareEnabled,
          latitude: isNearbyDareEnabled ? coordinates?.lat : undefined,
          longitude: isNearbyDareEnabled ? coordinates?.lng : undefined,
          locationLabel: data.locationLabel || undefined,
          discoveryRadiusKm: data.discoveryRadiusKm ?? 5,
          creationContext: 'CREATE',
          imageUrl: uploadedDareImage?.uploadedUrl,
          imageCid: uploadedDareImage?.uploadedCid,
          requireSentinel: selectedSentinel,
          stakerAddress: connectedWallet,
        },
        {
          sessionToken,
          authHeaders: walletAuthHeaders,
          isSimulationMode,
          publicClient,
          writeContractAsync,
          onApprovalStatusChange: setApprovalStatus,
        }
      );

      trigger('success');
      setSuccessData(result);

      trackClientEvent('sentinel_dare_created', {
        recommended: sentinelRecommendationReason !== 'none',
        selected: selectedSentinel,
        reason: getSentinelReasonForSelection({
          recommendedReason: sentinelRecommendationReason,
          selected: selectedSentinel,
        }),
        source: 'create_form',
      });

      if (result.isNearbyDare) clearLocation();

      toast({
        title: result.simulated ? '🧪 SIMULATION SUCCESS' : '✅ CONTRACT DEPLOYED',
        description: `Dare ID: ${result.dareId}`,
        duration: 6000,
      });
      reset();
      setDareImage(null);
      setImageError(null);

    } catch (error: unknown) {
      trigger('error');
      const message = error instanceof Error ? error.message : 'Network error';
      toast({
        variant: 'destructive',
        title: 'Deploy Failed',
        description: message,
      });
    } finally {
      setIsUploadingImage(false);
      setIsSubmitting(false);
      setApprovalStatus('idle');
    }
  };

  const handleDareImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const connectedWallet = address?.toLowerCase();
    if (!connectedWallet) {
      setImageError('Connect your wallet before uploading a cover image.');
      event.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      setImageError('Please choose a JPG, PNG, or GIF image.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image file is too large. Max size is 5MB.');
      event.target.value = '';
      return;
    }
    setImageError(null);

    setDareImage((current) => {
      if (current?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return {
        previewUrl: URL.createObjectURL(file),
        file,
      };
    });

    event.target.value = '';
  };

  const clearDareImage = () => {
    if (dareImage?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(dareImage.previewUrl);
    }
    setDareImage(null);
    setImageError(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  useEffect(() => {
    return () => {
      if (dareImage?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(dareImage.previewUrl);
      }
    };
  }, [dareImage]);

  return (
    <div className="relative min-h-screen flex flex-col pt-20 pb-12 px-4 md:px-8 md:py-24">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay /></div>

      <div className="container mx-auto px-2 md:px-6 relative z-10 max-w-4xl flex-grow">

        {/* HEADER */}
        <div className="text-center mb-8 md:mb-12">
          {/* Contact button - top right on mobile, integrated on desktop */}
          <div className="flex justify-end mb-4 md:absolute md:right-6 md:top-0">
            <ContactButton />
          </div>

          <h1 className="text-4xl md:text-7xl font-display font-black uppercase italic tracking-tighter mb-3 md:mb-4">
            INIT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FACC15] to-[#FACC15]/70">PROTOCOL</span>
          </h1>
          <p className="text-gray-400 font-mono tracking-widest uppercase text-[10px] md:text-sm px-4">
            Deploy a new smart contract dare on Base L2
          </p>
        </div>

        {/* SUCCESS STATE - Liquid Glass */}
        {successData && (
          <div className={`mb-6 md:mb-8 p-4 md:p-6 rounded-xl md:rounded-2xl backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${successData.awaitingClaim
            ? 'bg-yellow-500/10 border border-yellow-500/20'
            : 'bg-green-500/10 border border-green-500/20'
            }`}>
            <div className="flex items-start md:items-center gap-3 md:gap-4">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${successData.awaitingClaim ? 'bg-yellow-500/20' : 'bg-green-500/20'
                }`}>
                {successData.awaitingClaim ? (
                  <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
                ) : (
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base md:text-xl font-black uppercase tracking-wider ${successData.awaitingClaim ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                  {successData.awaitingClaim
                    ? 'Awaiting Claim'
                    : successData.simulated
                      ? 'Simulation Success'
                      : 'Contract Deployed'}
                </h3>
                <p className={`text-xs md:text-sm font-mono mt-1 truncate ${successData.awaitingClaim ? 'text-yellow-400/80' : 'text-green-400/80'
                  }`}>
                  {successData.awaitingClaim
                    ? `Escrowed for ${successData.streamerTag}`
                    : successData.streamerTag
                      ? `Dare ID: ${successData.dareId}`
                      : 'Open dare - anyone can complete!'}
                </p>
              </div>
              {successData.simulated && !successData.awaitingClaim && (
                <span className="hidden md:inline-flex ml-auto px-3 py-1 text-xs font-mono uppercase bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                  Testnet
                </span>
              )}
            </div>

            {/* Awaiting Claim - Show Invite Link */}
            {successData.awaitingClaim && successData.inviteLink && (
              <div className="mt-4 md:mt-6 space-y-3 md:space-y-4">
                <div className="p-3 md:p-4 bg-black/30 rounded-xl border border-white/10">
                  <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Share with {successData.streamerTag}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-2 md:px-3 py-2 bg-black/40 rounded-lg text-xs md:text-sm text-yellow-400 font-mono truncate">
                      {typeof window !== 'undefined' ? `${window.location.origin}${successData.inviteLink}` : successData.inviteLink}
                    </code>
                    <button
                      onClick={() => {
                        trigger('click');
                        const fullUrl = `${window.location.origin}${successData.inviteLink}`;
                        navigator.clipboard.writeText(fullUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg transition-colors flex-shrink-0"
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                      )}
                    </button>
                  </div>
                </div>

                <ShareComposerButton
                  title="Live BaseDare invite"
                  streamerTag={successData.streamerTag}
                  inviteUrl={typeof window !== 'undefined' ? `${window.location.origin}${successData.inviteLink}` : successData.inviteLink}
                  placeName={successData.locationLabel}
                  status="invite"
                  buttonLabel="Share Invite"
                />

                {/* Refund Deadline */}
                {successData.claimDeadline && (
                  <p className="text-[10px] md:text-xs text-gray-500 text-center font-mono">
                    Auto-refund if unclaimed by{' '}
                    {new Date(successData.claimDeadline).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            )}

            {/* Normal Success - Show Share Link */}
            {!successData.awaitingClaim && successData.shortId && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ShareComposerButton
                  title={watchTitle || 'Live BaseDare challenge'}
                  bounty={watchAmount}
                  streamerTag={successData.streamerTag}
                  shortId={successData.shortId}
                  placeName={successData.locationLabel}
                  status="live"
                  buttonLabel="Share Live Dare"
                  compact
                />
                <a
                  href={`/dare/${successData.shortId}`}
                  className="text-sm text-purple-400 hover:text-purple-300 font-mono transition-colors"
                >
                  View dare →
                </a>
              </div>
            )}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit(onSubmit, onError)}>
          {/* Error Summary - Liquid Glass Style */}
          {Object.keys(errors).length > 0 && (
            <div className="mb-4 md:mb-6 p-3 md:p-4 rounded-xl backdrop-blur-xl bg-red-500/10 border border-red-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-red-400 font-bold text-xs md:text-sm mb-2">Please fix the following:</p>
              <ul className="list-disc list-inside text-red-400/80 text-xs md:text-sm space-y-1">
                {errors.streamerTag && <li>{errors.streamerTag.message}</li>}
                {errors.title && <li>{errors.title.message}</li>}
                {errors.amount && <li>{errors.amount.message}</li>}
                {errors.timeValue && <li>{errors.timeValue.message}</li>}
              </ul>
            </div>
          )}

          {/* Apple Liquid Glass Card */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-2 rounded-[1.75rem] bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.12),transparent_34%),radial-gradient(circle_at_18%_20%,rgba(168,85,247,0.14),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(56,189,248,0.08),transparent_28%)] blur-2xl md:-inset-3 md:rounded-[2rem]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-2xl border border-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_45px_rgba(168,85,247,0.08),0_0_70px_rgba(250,204,21,0.05)] md:rounded-3xl"
            />
            <div className="backdrop-blur-2xl bg-white/[0.02] border border-white/[0.06] rounded-2xl md:rounded-3xl p-5 md:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden">
              {/* Liquid glass gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/30 pointer-events-none rounded-2xl md:rounded-3xl" />
              {/* Top highlight line */}
              <div className="absolute top-0 left-4 right-4 md:left-0 md:right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              {/* Golden accent line */}
              <div className="absolute top-[1px] left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#FACC15]/40 to-transparent" />
              <div className="space-y-8 md:space-y-12">

              {/* 1. TARGET (Optional) */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-purple-400 uppercase tracking-widest">
                  <Users className="w-3.5 h-3.5 md:w-4 md:h-4" /> Target <span className="text-gray-500 text-[9px] md:text-[10px] font-normal lowercase">(optional)</span>
                </label>
                <input
                  {...register('streamerTag')}
                  placeholder="@username or @everyone for open dare"
                  className={`${dentInputClass} w-full h-14 md:h-16 text-lg md:text-xl font-bold text-white placeholder:text-white/20 rounded-xl pl-5 md:pl-6 focus:border-purple-500/50 focus:bg-white/[0.05] focus:outline-none transition-all`}
                />
                <p className="text-[10px] md:text-xs text-gray-500 font-mono">Use @everyone for open dares anyone can complete</p>
                {errors.streamerTag && (
                  <p className="text-red-400 text-xs md:text-sm">{errors.streamerTag.message}</p>
                )}
              </div>

              {/* 2. MISSION */}
              <div className="space-y-3">
                <div className="flex justify-between items-end gap-2">
                  <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-purple-400 uppercase tracking-widest">
                    <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" /> Mission Objective
                  </label>
                  <span className="text-[9px] md:text-[10px] text-gray-500 font-mono whitespace-nowrap">AI ASSIST ↓</span>
                </div>
                <DareGenerator
                  onSelect={(text) => setValue('title', text)}
                  shouldAutoFillTitle={!watchTitle || watchTitle.trim() === ''}
                  onContextChange={handleGeneratorContextChange}
                />
                <textarea
                  {...register('title')}
                  placeholder="Describe the dare in detail..."
                  className="bd-dent-surface border-white/[0.09] w-full min-h-[120px] md:min-h-[150px] backdrop-blur-2xl bg-[linear-gradient(145deg,rgba(12,10,18,0.98)_0%,rgba(16,14,24,0.95)_18%,rgba(32,24,44,0.88)_100%)] text-base md:text-lg text-white placeholder:text-white/20 rounded-xl p-4 md:p-6 focus:border-purple-400/45 focus:bg-[linear-gradient(145deg,rgba(14,12,22,0.99)_0%,rgba(18,16,28,0.96)_18%,rgba(36,27,50,0.9)_100%)] focus:outline-none transition-all resize-none font-mono"
                />
                {errors.title && (
                  <p className="text-red-400 text-xs md:text-sm">{errors.title.message}</p>
                )}
              </div>

              {/* 2.25. COVER IMAGE */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-purple-400 uppercase tracking-widest">
                  <ImagePlus className="w-3.5 h-3.5 md:w-4 md:h-4" /> Cover Image <span className="text-gray-500 text-[9px] md:text-[10px] font-normal lowercase">(optional)</span>
                </label>
                <div className={`${dentGroupClass} rounded-xl p-4 md:p-5`}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">
                        {dareImage ? 'Custom cover uploaded' : 'Use your own image for this dare'}
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-500 font-mono">
                        {dareImage
                          ? 'If you remove it, the dare will fall back to your profile image when available.'
                          : 'JPG, PNG, or GIF up to 5MB. If left empty, we fall back to your profile image.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/gif"
                        className="hidden"
                        onChange={handleDareImageSelected}
                      />
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-cyan-200 transition hover:bg-cyan-500/18 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <ImagePlus className="h-3.5 w-3.5" />
                        {dareImage ? 'Replace' : 'Upload'}
                      </button>
                      {dareImage && (
                        <button
                          type="button"
                          onClick={clearDareImage}
                          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/70 transition hover:bg-white/[0.06]"
                        >
                          <X className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  {dareImage && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                      <img
                        src={dareImage.previewUrl}
                        alt="Dare cover preview"
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  )}
                </div>
                {imageError && (
                  <p className="text-red-400 text-xs md:text-sm">{imageError}</p>
                )}
              </div>

              {/* 2.5. NEARBY DARE - Location-based discovery */}
              <div className="space-y-4">
                {/* Toggle */}
                <div className={`${dentGroupClass} flex items-center justify-between rounded-xl p-4`}>
                  <div className="flex items-center gap-3">
                    <MapPin className={`w-5 h-5 ${watchIsNearbyDare ? 'text-[#FACC15]' : 'text-gray-500'} transition-colors`} />
                    <div>
                      <p className={`text-sm font-bold ${watchIsNearbyDare ? 'text-[#FACC15]' : 'text-white'} transition-colors`}>
                        Nearby Dare
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        Let people nearby discover this dare
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newValue = !watchIsNearbyDare;
                      setValue('isNearbyDare', newValue);
                      if (newValue && !coordinates) {
                        requestLocation();
                      }
                      trigger('click');
                    }}
                    className={`relative w-14 h-8 rounded-full transition-all ${watchIsNearbyDare
                      ? 'bg-[#FACC15]/20 border-2 border-[#FACC15]'
                      : 'bg-white/[0.05] border-2 border-white/10'
                      }`}
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 rounded-full transition-all ${watchIsNearbyDare
                        ? 'left-7 bg-[#FACC15]'
                        : 'left-1 bg-gray-500'
                        }`}
                    />
                  </button>
                </div>

                {/* Location capture and options - shown when toggle is on */}
                {watchIsNearbyDare && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Location Status */}
                    <div className={`bd-dent-surface bd-dent-surface--soft rounded-xl p-4 border ${coordinates
                      ? 'bg-green-500/10 border-green-500/20'
                      : geoError
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-white/[0.03] border-white/[0.06]'
                      }`}>
                      <div className="flex items-center gap-3">
                        {geoLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 text-[#FACC15] animate-spin" />
                            <span className="text-sm text-gray-400">Getting your location...</span>
                          </>
                        ) : coordinates ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="text-sm text-green-400 font-mono">Location captured</span>
                          </>
                        ) : geoError ? (
                          <>
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            <div className="flex-1">
                              <span className="text-sm text-red-400">{geoError}</span>
                              <button
                                type="button"
                                onClick={requestLocation}
                                className="ml-2 text-xs text-[#FACC15] hover:underline"
                              >
                                Try again
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <Navigation className="w-5 h-5 text-gray-500" />
                            <button
                              type="button"
                              onClick={requestLocation}
                              className="text-sm text-[#FACC15] hover:underline font-medium"
                            >
                              Enable location access
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Location Label */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#FACC15] uppercase tracking-widest">
                        Name This Spot <span className="text-gray-500 text-[9px] font-normal lowercase">(optional)</span>
                      </label>
                      <input
                        {...register('locationLabel')}
                        placeholder="e.g., SM MOA, Poblacion, BGC"
                        className={`${dentInputClass} w-full h-12 text-base text-white placeholder:text-white/20 rounded-xl pl-4 focus:border-[#FACC15]/50 focus:bg-white/[0.05] focus:outline-none transition-all`}
                      />
                    </div>

                    {/* Discovery Radius */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#FACC15] uppercase tracking-widest">
                        Discovery Radius
                      </label>
                      <select
                        {...register('discoveryRadiusKm', { valueAsNumber: true })}
                        className={`${dentInputClass} w-full h-12 text-white rounded-xl px-4 focus:border-[#FACC15]/50 focus:bg-white/[0.05] focus:outline-none font-bold cursor-pointer transition-all text-sm`}
                      >
                        <option value={1}>1 km - Very local</option>
                        <option value={2}>2 km - Walking distance</option>
                        <option value={5}>5 km - Neighborhood (default)</option>
                        <option value={10}>10 km - District</option>
                        <option value={25}>25 km - City-wide</option>
                        <option value={50}>50 km - Metro area</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className={`${dentGroupClass} rounded-xl p-4`}>
                  <label className="flex cursor-pointer items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">Enable Sentinel Verification</p>
                        <span
                          title="Sentinel adds an extra trust layer before payout. Great for brand, venue, and higher-stakes dares."
                          className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] p-1 text-white/55"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </span>
                        {isSentinelRecommended ? (
                          <span className="rounded-full border border-emerald-400/25 bg-emerald-500/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                            Recommended
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[10px] md:text-xs text-gray-500 font-mono">
                        {appSettings.sentinelEnabled
                          ? 'Extra anti-deepfake proof with manual referee review. Recommended for brand, venue, or high-value dares.'
                          : formatSentinelPausedMessage(appSettings.sentinelPausedReason)}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      {...requireSentinelField}
                      disabled={!appSettings.sentinelEnabled}
                      className="mt-1 h-5 w-5 accent-emerald-500"
                    />
                  </label>
                </div>
              </div>

              {/* 3. BOUNTY & TIME */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-[#FACC15] uppercase tracking-widest">
                    <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4" /> Total Bounty
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      {...register('amount', { valueAsNumber: true })}
                      placeholder="100"
                      className={`${dentInputClass} w-full h-14 md:h-16 text-xl md:text-2xl font-black text-[#FACC15] placeholder:text-white/20 rounded-xl pl-5 md:pl-6 pr-20 md:pr-24 focus:border-[#FACC15]/50 focus:bg-white/[0.05] focus:outline-none transition-all`}
                    />
                    <span className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 text-xs md:text-sm font-bold text-gray-400">
                      USDC
                    </span>
                  </div>
                  {errors.amount && (
                    <p className="text-red-400 text-xs md:text-sm">{errors.amount.message}</p>
                  )}
                  <p className="text-[10px] md:text-xs text-gray-500 font-mono">Min: $5 • Max: $10,000</p>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-purple-400 uppercase tracking-widest">
                    <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" /> Time Limit
                  </label>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <input
                      type="number"
                      {...register('timeValue', { valueAsNumber: true })}
                      placeholder="24"
                      className={`${dentInputClass} w-full h-14 md:h-16 text-lg md:text-xl font-bold text-white text-center rounded-xl focus:border-purple-500/50 focus:bg-white/[0.05] focus:outline-none transition-all`}
                    />
                    <select
                      {...register('timeUnit')}
                      className={`${dentInputClass} h-14 md:h-16 text-white rounded-xl px-3 md:px-4 focus:border-purple-500/50 focus:bg-white/[0.05] focus:outline-none font-bold uppercase cursor-pointer transition-all text-sm md:text-base`}
                    >
                      <option value="Hours">Hours</option>
                      <option value="Days">Days</option>
                      <option value="Weeks">Weeks</option>
                    </select>
                  </div>
                  {errors.timeValue && (
                    <p className="text-red-400 text-xs md:text-sm">{errors.timeValue.message}</p>
                  )}
                </div>
              </div>

              {/* BALANCE & FUND BUTTON */}
              {isConnected && !isSimulationMode && (
                <div className="pt-4 md:pt-6 space-y-3">
                  {!isOnchainContractsReady && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                      Contract config error: {onchainContractError || 'NEXT_PUBLIC_USDC_ADDRESS / NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS not set in deployed environment.'}
                    </div>
                  )}

                  {/* Balance Display */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-gray-400 font-mono">Your Balance:</span>
                    <span className={`text-sm font-bold font-mono ${hasInsufficientBalance ? 'text-red-400' : 'text-green-400'}`}>
                      {parseFloat(formattedBalance).toFixed(2)} USDC
                    </span>
                  </div>

                  {/* FundButton when insufficient balance */}
                  {hasInsufficientBalance && (
                    <div className="relative group p-[1px] rounded-xl overflow-hidden">
                      <div
                        className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#1a1a1a_0%,#525252_20%,#a1a1aa_25%,#525252_30%,#1a1a1a_50%,#525252_70%,#a1a1aa_75%,#525252_80%,#1a1a1a_100%)] opacity-60 group-hover:opacity-100 group-hover:animate-[spin_3s_linear_infinite] transition-opacity duration-500"
                        aria-hidden="true"
                      />
                      <div className="relative bg-[#0a0a0a] rounded-[11px] p-4 flex flex-col items-center gap-3">
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.05] via-transparent to-white/[0.02] pointer-events-none rounded-[11px]" />
                        <p className="text-xs text-gray-400 font-mono text-center relative z-10">
                          You need {watchAmount} USDC to deploy this bounty
                        </p>
                        <FundButton className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-all relative z-10">
                          Get USDC
                        </FundButton>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SIMULATION MODE INDICATOR */}
              {isSimulationMode && (
                <div className="pt-4 md:pt-6 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-yellow-400 text-xs md:text-sm font-bold text-center">
                    🧪 SIMULATION MODE - No USDC required, database-only testing
                  </p>
                </div>
              )}

              {/* DEPLOY BUTTON - Liquid Metal Style */}
              <div className={`${isConnected && !isSimulationMode ? "pt-3" : "pt-4 md:pt-6"}`}>
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[linear-gradient(155deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_22%,rgba(10,8,16,0.9)_62%,rgba(7,5,12,0.96)_100%)] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_32px_rgba(0,0,0,0.45),0_0_30px_rgba(250,204,21,0.05),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-16px_24px_rgba(0,0,0,0.35)] md:p-4">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.14),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(168,85,247,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.1)_0%,transparent_28%,transparent_72%,rgba(0,0,0,0.35)_100%)]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-black/50 to-transparent"
                  />

                  <div className="relative">
                    <div className="mb-3 flex items-center justify-between px-1">
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">Launch Control</p>
                        <p className="mt-1 text-xs font-mono uppercase tracking-wider text-white/25">
                          {isSimulationMode ? 'Database simulation active' : 'Onchain escrow deployment'}
                        </p>
                      </div>
                      <div className="h-2.5 w-2.5 rounded-full bg-[#FACC15] shadow-[0_0_12px_rgba(250,204,21,0.65)]" />
                    </div>

                    {hasInsufficientBalance || (!isSimulationMode && !isOnchainContractsReady) ? (
                      /* Disabled state - no spinning border */
                      <button
                        type="button"
                        disabled
                        className="w-full h-16 md:h-20 text-lg md:text-2xl font-black uppercase tracking-widest rounded-xl flex items-center justify-center cursor-not-allowed border border-[#f5d977]/30 bg-[linear-gradient(180deg,rgba(250,204,21,0.45)_0%,rgba(250,204,21,0.34)_48%,rgba(150,111,9,0.55)_100%)] text-black/45 shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_-8px_14px_rgba(126,82,0,0.18)_inset,0_10px_18px_rgba(0,0,0,0.28)]"
                      >
                        {!isSimulationMode && !isOnchainContractsReady ? 'Contract Misconfigured' : 'Insufficient Balance'}
                      </button>
                    ) : (
                      <InitProtocolButton
                          active={isSubmitting}
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full"
                          buttonClassName="h-16 md:h-20"
                          activeContent={
                            <>
                              <Loader2 className="w-6 h-6 md:w-8 md:h-8 relative animate-spin" />
                              <span className="relative text-base md:text-xl font-black italic uppercase tracking-[0.18em] text-yellow-400">
                                {approvalStatus === 'approving' ? 'Approving USDC...' :
                                  approvalStatus === 'funding' ? 'Deploying Dare...' :
                                    approvalStatus === 'verifying' ? 'Verifying...' : 'Processing...'}
                              </span>
                            </>
                          }
                        >
                          <div className="relative flex items-center justify-center gap-3">
                            <span className="font-black italic uppercase tracking-[0.2em] text-lg text-white md:text-xl">
                              Initiate Protocol
                            </span>
                            <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
                          </div>
                        </InitProtocolButton>
                    )}

                    <p className="text-center text-[9px] md:text-[10px] text-gray-500 font-mono mt-3 md:mt-4 uppercase px-4">
                      {(!isSimulationMode && !isOnchainContractsReady)
                        ? '* Configure contract env vars and redeploy.'
                        : hasInsufficientBalance
                        ? '* Fund your wallet with USDC to deploy'
                        : '* Gas fees apply. Smart contract is immutable once deployed.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateDarePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <CreateDareContent />
    </Suspense>
  );
}
