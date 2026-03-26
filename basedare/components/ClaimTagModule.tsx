'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Wallet,
  CheckCircle,
  XCircle,
  Loader2,
  Tag,
  Shield,
  AlertTriangle,
  Copy,
  ExternalLink,
  Zap,
  Gift,
  Clock,
  MapPin,
  Share2,
} from 'lucide-react';
import { LiquidMetalButton } from '@/components/ui/LiquidMetalButton';
import { useToast } from '@/components/ui/use-toast';

// Platform icons as SVG components
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TwitchIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
  </svg>
);

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const KickIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M1.333 0v24h5.334v-8l2.666 2.667L14.667 24H22l-8-8 8-8h-7.333l-5.334 5.333V0z" />
  </svg>
);

type Platform = 'twitter' | 'twitch' | 'youtube' | 'kick';

interface InviteData {
  streamerHandle: string;
  totalBounty: number;
  dareCount: number;
  claimDeadline: string | null;
  pendingDares: Array<{
    id: string;
    shortId: string | null;
    title: string;
    bounty: number;
    createdAt: string;
  }>;
}

interface PlatformConfig {
  id: Platform;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  provider: string | null; // null = manual verification
  Icon: React.FC<{ className?: string }>;
}

interface ExistingTag {
  tag: string;
  status: string;
  walletAddress: string;
  verificationMethod?: string | null;
}

interface SessionPlatformData {
  provider?: string;
  platformHandle?: string;
  platformId?: string;
  token?: string;
  platformBio?: string | null;
  platformFollowerCount?: number | null;
}

interface CreatorFootprint {
  handle: string;
  displayHandle: string;
  verified: boolean;
  tags: string[];
  stats: {
    total: number;
    completed: number;
    live: number;
    totalEarned: number;
  };
}

function formatCompactCount(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return null;

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  }

  return value.toString();
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'twitter',
    name: 'Twitter/X',
    color: 'text-white',
    bgColor: 'bg-black/80',
    borderColor: 'border-white/30',
    provider: 'twitter',
    Icon: TwitterIcon,
  },
  {
    id: 'twitch',
    name: 'Twitch',
    color: 'text-[#9146FF]',
    bgColor: 'bg-[#9146FF]/20',
    borderColor: 'border-[#9146FF]/50',
    provider: 'twitch',
    Icon: TwitchIcon,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    color: 'text-[#FF0000]',
    bgColor: 'bg-[#FF0000]/20',
    borderColor: 'border-[#FF0000]/50',
    provider: 'google',
    Icon: YouTubeIcon,
  },
  {
    id: 'kick',
    name: 'Kick',
    color: 'text-[#53FC18]',
    bgColor: 'bg-[#53FC18]/20',
    borderColor: 'border-[#53FC18]/50',
    provider: null, // Manual verification
    Icon: KickIcon,
  },
];

const OAUTH_ERRORS: Record<string, string> = {
  OAuthSignin: 'Error starting OAuth signin. Check provider configuration.',
  OAuthCallback: 'Error during OAuth callback. Try again.',
  OAuthCreateAccount: 'Could not create account with OAuth provider.',
  EmailCreateAccount: 'Could not create email account.',
  Callback: 'Error in OAuth callback.',
  OAuthAccountNotLinked: 'This account is already linked to another user.',
  EmailSignin: 'Email signin failed.',
  CredentialsSignin: 'Sign in failed. Check your credentials.',
  SessionRequired: 'Please sign in to access this page.',
  twitter: 'Twitter OAuth failed. Check if callback URL is configured: http://localhost:3000/api/auth/callback/twitter',
  twitch: 'Twitch OAuth failed. Check if callback URL is configured: http://localhost:3000/api/auth/callback/twitch',
  google: 'Google OAuth failed. Check if callback URL is configured: http://localhost:3000/api/auth/callback/google',
  default: 'OAuth authentication failed. Please try again.',
};

export function ClaimTagModule() {
  const router = useRouter();
  const { data: session } = useSession();
  const { address, isConnected } = useAccount();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [tag, setTag] = useState('');
  const [tagAvailable, setTagAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingTags, setExistingTags] = useState<ExistingTag[]>([]);

  // Manual verification state (works for any platform)
  const [manualCode, setManualCode] = useState<string | null>(null);
  const [manualUsername, setManualUsername] = useState('');
  const [useManualVerification, setUseManualVerification] = useState(false);

  // Invite flow state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [footprintLoading, setFootprintLoading] = useState(false);
  const [footprintData, setFootprintData] = useState<CreatorFootprint | null>(null);

  // Get platform handle from session
  const sessionData = session as SessionPlatformData | null;
  const provider = sessionData?.provider;
  const platformHandle = sessionData?.platformHandle;
  const platformBio = sessionData?.platformBio?.trim() || null;
  const platformFollowerCount = sessionData?.platformFollowerCount ?? null;
  const compactFollowerCount = formatCompactCount(platformFollowerCount);

  const isPlatformConnected = !!platformHandle && !!provider;

  // Determine which platform is connected via OAuth
  const getConnectedPlatform = (): Platform | null => {
    if (!provider) return null;
    if (provider === 'twitter') return 'twitter';
    if (provider === 'twitch') return 'twitch';
    if (provider === 'google') return 'youtube';
    return null;
  };

  const connectedPlatform = getConnectedPlatform();
  const normalizedPlatformHandle = platformHandle?.replace(/^@/, '').trim().toLowerCase() || null;
  const hasMatchingVerifiedTag = Boolean(
    normalizedPlatformHandle &&
      existingTags.some((existingTag) => existingTag.tag.replace(/^@/, '').toLowerCase() === normalizedPlatformHandle)
  );

  // Auto-set selectedPlatform when returning from OAuth redirect
  useEffect(() => {
    if (connectedPlatform && !selectedPlatform) {
      setSelectedPlatform(connectedPlatform);
    }
  }, [connectedPlatform, selectedPlatform]);

  // Pre-fill tag from platform handle after OAuth return
  useEffect(() => {
    if (platformHandle && !tag) {
      setTag(platformHandle);
    }
  }, [platformHandle, tag]);

  // Check for OAuth errors in URL params
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      const errorMessage = OAUTH_ERRORS[oauthError] || OAUTH_ERRORS['default'];
      setError(errorMessage);
      // Clear the error param from URL to prevent showing on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      url.searchParams.delete('callbackUrl');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  // Fetch invite data from URL params
  useEffect(() => {
    const invite = searchParams.get('invite');
    const handle = searchParams.get('handle');

    if (invite) {
      setInviteToken(invite);
      setInviteLoading(true);

      fetch(`/api/invite/${invite}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data.pendingDares) {
            setInviteData(data.data);
            // Pre-fill tag from invite data
            const streamerHandle = data.data.streamerHandle?.replace('@', '') || handle || '';
            if (streamerHandle && !tag) {
              setTag(streamerHandle);
            }
          } else if (data.data?.alreadyClaimed) {
            setInviteError('This invite has already been claimed!');
          } else {
            setInviteError(data.error || 'Invite not found');
          }
        })
        .catch((err) => {
          console.error('Failed to fetch invite:', err);
          setInviteError('Failed to load invite data');
        })
        .finally(() => setInviteLoading(false));
    } else if (handle) {
      // Pre-fill from handle param even without invite token
      setTag(handle);
    }
  }, [searchParams, tag]);

  // Fetch existing tags for this wallet
  useEffect(() => {
    if (address) {
      fetch(`/api/tags?wallet=${address}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.tags) setExistingTags(data.tags);
        })
        .catch(console.error);
    }
  }, [address, success]);

  useEffect(() => {
    if (!platformHandle) {
      setFootprintData(null);
      setFootprintLoading(false);
      return;
    }

    let cancelled = false;
    setFootprintLoading(true);

    fetch(`/api/creator/${encodeURIComponent(platformHandle)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success || !data.data) {
          return null;
        }
        return data.data as CreatorFootprint;
      })
      .then((data) => {
        if (!cancelled) {
          setFootprintData(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFootprintData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFootprintLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [platformHandle]);

  // Check tag availability
  const checkTagAvailability = useCallback(async (tagValue: string) => {
    if (tagValue.length < 2) {
      setTagAvailable(null);
      return;
    }

    setChecking(true);
    try {
      const res = await fetch(`/api/tags?tag=${encodeURIComponent(tagValue)}`);
      const data = await res.json();
      setTagAvailable(data.available);
    } catch (err) {
      console.error('Failed to check tag:', err);
    } finally {
      setChecking(false);
    }
  }, []);

  // Debounced tag check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tag) checkTagAvailability(tag);
    }, 300);
    return () => clearTimeout(timer);
  }, [tag, checkTagAvailability]);

  // Generate manual verification code (works for any platform)
  const generateManualCode = () => {
    const code = `BASEDARE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setManualCode(code);
  };

  // Copy code to clipboard
  const copyCode = async () => {
    if (manualCode) {
      await navigator.clipboard.writeText(manualCode);
    }
  };

  // Switch to manual verification mode
  const enableManualVerification = (platform: Platform) => {
    setSelectedPlatform(platform);
    setUseManualVerification(true);
    generateManualCode();
  };

  // Check if using manual verification for current platform
  const isManualMode = useManualVerification || selectedPlatform === 'kick';

  // Claim the tag
  const handleClaimTag = async () => {
    if (!address || !tag) return;

    // For manual verification, need username and code
    if (isManualMode && (!manualUsername || !manualCode)) return;

    // For OAuth platforms (not manual), need to be connected
    if (!isManualMode && !isPlatformConnected) return;

    setClaiming(true);
    setError(null);
    setSuccess(null);

    try {
      const body: Record<string, string> = {
        walletAddress: address,
        tag: tag.startsWith('@') ? tag : `@${tag}`,
      };

      let endpoint = '/api/claim-tag';
      const headers: HeadersInit = { 'Content-Type': 'application/json' };

      // Manual/Kick flow still uses /api/tags (admin-reviewed path)
      if (isManualMode) {
        endpoint = '/api/tags';
        body.platform = selectedPlatform || 'twitter';
        body.manualUsername = manualUsername;
        body.manualCode = manualCode!;
      } else {
        const sessionToken = (session as { token?: string } | null)?.token;
        if (sessionToken) {
          headers.Authorization = `Bearer ${sessionToken}`;
        }
        if (inviteToken) {
          body.inviteToken = inviteToken;
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        data = {};
      }

      if (res.ok && data.success === true) {
        const payload = data.data as { message?: string } | undefined;
        const message = payload?.message || 'Tag claimed successfully!';
        setSuccess(message);
        setTag('');
        setTagAvailable(null);
        setManualCode(null);
        setManualUsername('');
        setSelectedPlatform(null);
        setUseManualVerification(false);
        toast({
          title: 'Tag Claimed',
          description: message,
          duration: 7000,
        });
      } else {
        const message = typeof data.error === 'string' ? data.error : 'Failed to claim tag';
        setError(message);
        toast({
          variant: 'destructive',
          title: 'Claim Failed',
          description: message,
          duration: 7000,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to claim tag';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Claim Failed',
        description: message,
        duration: 7000,
      });
    } finally {
      setClaiming(false);
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const getPlatformConfig = (id: Platform) => PLATFORMS.find((p) => p.id === id)!;

  // Handle platform selection
  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform);
    setError(null);
    setUseManualVerification(false);

    // If it's an OAuth platform, redirect to provider
    // After OAuth, NextAuth redirects back to /claim-tag and the
    // session will contain provider/platformHandle. The useEffect
    // above auto-restores selectedPlatform from the session.
    const config = getPlatformConfig(platform);
    if (config.provider && !connectedPlatform) {
      const callbackUrl = typeof window !== 'undefined' ? window.location.href : '/claim-tag';
      signIn(config.provider, { callbackUrl });
      return;
    }

    // For Kick (always manual), generate a verification code
    if (platform === 'kick' && !manualCode) {
      generateManualCode();
    }
  };

  return (
    <div id="claim-tag-section" className="relative w-full max-w-2xl mx-auto">
      <div className="flex-grow relative z-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-2 mb-4">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-400 font-medium tracking-wide">CLAIM TAG</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-3">
            {inviteData ? (
              <>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-green-400">
                  ${inviteData.totalBounty.toLocaleString()}
                </span>{' '}
                Waiting For You!
              </>
            ) : (
              <>
                Claim Your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                  Tag
                </span>
              </>
            )}
          </h1>
          <p className="text-gray-400 font-mono text-sm max-w-md mx-auto">
            {inviteData
              ? 'Verify your identity to unlock your pending bounties'
              : 'Verify your identity and claim your unique creator tag to receive payouts'}
          </p>
        </motion.div>

        <div className="max-w-xl mx-auto space-y-3 sm:space-y-4">
          {/* Invite Banner - Show pending bounties */}
          {inviteLoading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="backdrop-blur-xl bg-yellow-500/5 border border-yellow-500/30 rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                <span className="text-sm text-yellow-400">Loading invite data...</span>
              </div>
            </motion.div>
          )}

          {inviteError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="backdrop-blur-xl bg-red-500/5 border border-red-500/30 rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm text-red-400">{inviteError}</span>
              </div>
            </motion.div>
          )}

          {inviteData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="backdrop-blur-xl bg-gradient-to-br from-yellow-500/10 to-green-500/10 border border-yellow-500/40 rounded-2xl p-5 sm:p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-yellow-500/20 border border-yellow-500/40 rounded-xl flex items-center justify-center">
                  <Gift className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Bounties Waiting For You!</h3>
                  <p className="text-xs text-gray-400 font-mono">
                    {inviteData.dareCount} dare{inviteData.dareCount > 1 ? 's' : ''} pending
                  </p>
                </div>
              </div>

              {/* Total Bounty */}
              <div className="bg-black/30 rounded-xl p-4 mb-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Available</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-yellow-400">
                    ${inviteData.totalBounty.toLocaleString()}
                  </span>
                  <span className="text-sm text-yellow-400/70 font-mono">USDC</span>
                </div>
              </div>

              {/* Pending Dares List */}
              <div className="space-y-2 mb-4">
                {inviteData.pendingDares.slice(0, 3).map((dare) => (
                  <div
                    key={dare.id}
                    className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5"
                  >
                    <span className="text-sm text-white truncate flex-1 mr-2">{dare.title}</span>
                    <span className="text-sm font-bold text-yellow-400 shrink-0">
                      ${dare.bounty.toLocaleString()}
                    </span>
                  </div>
                ))}
                {inviteData.pendingDares.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{inviteData.pendingDares.length - 3} more dare{inviteData.pendingDares.length - 3 > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Claim Deadline */}
              {inviteData.claimDeadline && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Claim by{' '}
                    {new Date(inviteData.claimDeadline).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 1: Connect Wallet */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`backdrop-blur-xl border rounded-2xl p-4 transition-all ${isConnected
              ? 'bg-green-500/5 border-green-500/30'
              : 'bg-black/20 border-white/10'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${isConnected ? 'bg-green-500/20 border border-green-500/30' : 'bg-white/5 border border-white/10'
                    }`}
                >
                  <Wallet className={`w-5 h-5 ${isConnected ? 'text-green-400' : 'text-gray-400'}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white">Connect Wallet</h3>
                  <p className="text-xs text-gray-500 font-mono truncate">
                    {isConnected ? formatAddress(address!) : 'Connect your wallet to continue'}
                  </p>
                </div>
              </div>
              {isConnected ? (
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              ) : (
                <span className="text-[10px] text-yellow-400 font-mono shrink-0">Required</span>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.125 }}
            className={`backdrop-blur-xl border rounded-2xl p-4 transition-all ${
              isPlatformConnected
                ? 'bg-cyan-500/5 border-cyan-400/30'
                : 'bg-[linear-gradient(180deg,rgba(34,211,238,0.06)_0%,rgba(7,9,18,0.92)_100%)] border-cyan-400/18'
            } ${!isConnected ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 sm:gap-4">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isPlatformConnected
                      ? 'bg-cyan-400/15 border border-cyan-400/30'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <Share2 className={`w-5 h-5 ${isPlatformConnected ? 'text-cyan-200' : 'text-gray-400'}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white">Connect Identity</h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Plug your creator identity into BaseDare so claim flow, share rails, and your map all point the same way.
                  </p>
                </div>
              </div>
              {isPlatformConnected ? (
                <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-100">
                  Connected
                </div>
              ) : (
                <span className="text-[10px] text-cyan-200/80 font-mono shrink-0">Optional but powerful</span>
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-cyan-200">
                  <Shield className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Identity</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">
                  {isPlatformConnected ? `Anchored as @${platformHandle}` : 'Connect your real handle'}
                </p>
                <p className="mt-2 text-xs leading-5 text-white/55">
                  Clean handle alignment keeps payouts, claim review, and BaseDare Brain routing grounded in one creator identity.
                </p>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-[#f5c518]">
                  <Share2 className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Cross-Post</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">Approved wins share cleaner now</p>
                <p className="mt-2 text-xs leading-5 text-white/55">
                  One consistent BaseDare share payload means tighter growth loops, cleaner proof framing, and better deep links back to the map.
                </p>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-purple-200">
                  <MapPin className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Your Map</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">
                  {inviteData ? 'Claim first, then wake the place up' : 'This becomes your place layer'}
                </p>
                <p className="mt-2 text-xs leading-5 text-white/55">
                  Social connect is the front door to Suggested Footprint now, and later to imported residue review without weakening verified memory.
                </p>
              </div>
            </div>

            {!isPlatformConnected && !isManualMode && (
              <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Choose Platform</p>
                    <p className="mt-1 text-xs text-white/52">
                      Connect a platform now, or fall back to manual verification if OAuth gives you trouble.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-200/80">Step 2</span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => handlePlatformSelect(platform.id)}
                      disabled={!isConnected}
                      className={`p-3 sm:p-4 rounded-xl border transition-all flex flex-col items-center gap-1.5 sm:gap-2 ${platform.bgColor} ${platform.borderColor} hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <platform.Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${platform.color}`} />
                      <span className={`text-xs sm:text-sm font-bold ${platform.color}`}>{platform.name}</span>
                      {platform.provider === null && (
                        <span className="text-[10px] sm:text-xs text-gray-400">Manual</span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <p className="text-xs text-gray-400 mb-2">
                    {error && error.includes('OAuth')
                      ? 'OAuth not working? Use manual verification instead:'
                      : 'Having trouble with OAuth? Try manual verification:'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.filter(p => p.provider !== null).map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => enableManualVerification(platform.id)}
                        disabled={!isConnected}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${platform.bgColor} ${platform.borderColor} ${platform.color} hover:opacity-80 disabled:opacity-50`}
                      >
                        {platform.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(isPlatformConnected && connectedPlatform && !isManualMode) ? (
              <div className="mt-4 rounded-[20px] border border-cyan-400/18 bg-cyan-400/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const config = getPlatformConfig(connectedPlatform);
                        return <config.Icon className={`w-5 h-5 shrink-0 ${config.color}`} />;
                      })()}
                      <span className="text-sm font-semibold text-white">@{platformHandle}</span>
                      {compactFollowerCount ? (
                        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-white/60">
                          {compactFollowerCount} audience
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-white/55">
                      {platformBio || 'Connected identity is ready for claim matching, share rails, and the next Suggested Footprint layer.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!hasMatchingVerifiedTag && platformHandle ? (
                      <button
                        type="button"
                        onClick={() => setTag(platformHandle)}
                        className="inline-flex items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/16"
                      >
                        Use @{platformHandle}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => router.push('/map')}
                      className="inline-flex items-center justify-center rounded-full border border-purple-400/25 bg-purple-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-100 transition hover:border-purple-300/40 hover:bg-purple-400/16"
                    >
                      Open Map
                    </button>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 transition hover:border-white/20 hover:text-white"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {isManualMode && manualCode && selectedPlatform && (
              <div className="mt-4 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">Manual Verification</p>
                    <p className="mt-1 text-xs text-white/52">
                      Use this when OAuth is not available or the platform needs admin review.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-green-300">Fallback</span>
                </div>

              <div className="space-y-3 sm:space-y-4">
                {(() => {
                  const config = getPlatformConfig(selectedPlatform);
                  const platformUrls: Record<Platform, string> = {
                    twitter: `https://twitter.com/${manualUsername || ''}`,
                    twitch: `https://twitch.tv/${manualUsername || ''}`,
                    youtube: `https://youtube.com/@${manualUsername || ''}`,
                    kick: `https://kick.com/${manualUsername || ''}`,
                  };
                  return (
                    <div className={`p-3 sm:p-4 ${config.bgColor} border ${config.borderColor} rounded-xl space-y-3`}>
                      <div className="flex items-center gap-2">
                        <config.Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.color}`} />
                        <span className={`text-sm font-bold ${config.color}`}>{config.name} Manual Verification</span>
                      </div>

                      <div className="text-xs sm:text-sm text-gray-300 space-y-1.5 sm:space-y-2">
                        <p>1. Enter your {config.name} username below</p>
                        <p>2. Copy the verification code</p>
                        <p>3. Add this code to your {config.name} bio or display on stream</p>
                        <p>4. Click submit (admin will verify within 24h)</p>
                      </div>

                      {/* Username Input */}
                      <div>
                        <label className="text-[10px] sm:text-xs text-gray-400 block mb-1">{config.name} Username</label>
                        <input
                          type="text"
                          value={manualUsername}
                          onChange={(e) => setManualUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                          placeholder={`your_${selectedPlatform}_username`}
                          className={`w-full px-3 sm:px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-opacity-50 focus:outline-none font-mono`}
                        />
                      </div>

                      {/* Verification Code */}
                      <div>
                        <label className="text-[10px] sm:text-xs text-gray-400 block mb-1">Verification Code</label>
                        <div className="flex items-center gap-2">
                          <code className={`flex-1 px-3 sm:px-4 py-2 bg-black/60 border ${config.borderColor} rounded-lg font-mono text-sm ${config.color} truncate`}>
                            {manualCode}
                          </code>
                          <button
                            onClick={copyCode}
                            className={`p-2 ${config.bgColor} hover:opacity-80 rounded-lg transition-colors shrink-0`}
                          >
                            <Copy className={`w-4 h-4 sm:w-5 sm:h-5 ${config.color}`} />
                          </button>
                        </div>
                      </div>

                      <a
                        href={platformUrls[selectedPlatform]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 text-xs sm:text-sm ${config.color} hover:underline`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Open your {config.name} profile
                      </a>
                    </div>
                  );
                })()}

                <button
                  onClick={() => {
                    setSelectedPlatform(null);
                    setManualCode(null);
                    setManualUsername('');
                    setUseManualVerification(false);
                  }}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  ← Choose different platform
                </button>
              </div>
              </div>
            )}
          </motion.div>

          {(isPlatformConnected || isManualMode || inviteData) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="backdrop-blur-xl border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.08)_0%,rgba(8,11,22,0.92)_100%)] rounded-2xl p-4 shadow-[0_18px_40px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-cyan-200">
                    <Zap className="w-3 h-3" />
                    Your Grid
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-white">Suggested Footprint</h3>
                  <p className="mt-1 text-xs text-white/55">
                    BaseDare uses connected socials for identity, distribution, and the next layer of place memory suggestions.
                  </p>
                </div>
                {platformHandle ? (
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-mono text-white/70">
                    @{platformHandle}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {!hasMatchingVerifiedTag && platformHandle ? (
                  <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-cyan-200">
                      <Shield className="h-4 w-4" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Claim Match</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">Lock in @{platformHandle}</p>
                    <p className="mt-2 text-xs leading-5 text-white/55">
                      Matching your connected handle keeps payouts, social proof, and BaseDare Brain routing aligned.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTag(platformHandle)}
                      className="mt-4 inline-flex items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/16"
                    >
                      Use @{platformHandle}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-green-300">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Identity Ready</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">
                      {hasMatchingVerifiedTag ? 'Your handle is already anchored' : 'Connected identity detected'}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-white/55">
                      This account is ready to plug into share rails and future imported-residue review once that layer goes live.
                    </p>
                  </div>
                )}

                <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-[#f5c518]">
                    <Share2 className="h-4 w-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Cross-Post Rail</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">Verified wins can now share cleaner</p>
                  <p className="mt-2 text-xs leading-5 text-white/55">
                    BaseDare now uses one X payload rail instead of scattered generic tweets. That means tighter growth loops and cleaner venue proof.
                  </p>
                </div>

                <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-purple-200">
                    <MapPin className="h-4 w-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Map Next</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">
                    {inviteData ? 'Claim, then wake the place up' : 'Open your place layer'}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/55">
                    {inviteData
                      ? 'Once this identity clears, pending dares can roll straight into live place memory and challenge heat.'
                      : 'The map is where challenge-live states, venue pulse, and future footprint suggestions become visible.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/map')}
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-purple-400/25 bg-purple-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-100 transition hover:border-purple-300/40 hover:bg-purple-400/16"
                  >
                    Open Map
                  </button>
                </div>
              </div>

              {platformHandle ? (
                <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-cyan-200">
                        <MapPin className="h-4 w-4" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Live Footprint</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-white">
                        {footprintData ? `${footprintData.displayHandle} already has signal on the grid` : `Checking ${platformHandle} across the grid`}
                      </p>
                    </div>
                    {footprintData?.verified ? (
                      <div className="rounded-full border border-green-400/25 bg-green-400/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-green-200">
                        Verified
                      </div>
                    ) : null}
                  </div>

                  {footprintLoading ? (
                    <p className="mt-3 text-xs leading-5 text-white/55">
                      Pulling claimed tag and dare history so Suggested Footprint can stay grounded in real BaseDare activity.
                    </p>
                  ) : footprintData ? (
                    <>
                      <div className="mt-4 grid gap-2 sm:grid-cols-4">
                        <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Live</p>
                          <p className="mt-2 text-lg font-black text-white">{footprintData.stats.live}</p>
                        </div>
                        <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Completed</p>
                          <p className="mt-2 text-lg font-black text-white">{footprintData.stats.completed}</p>
                        </div>
                        <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Earned</p>
                          <p className="mt-2 text-lg font-black text-white">${footprintData.stats.totalEarned.toLocaleString()}</p>
                        </div>
                        <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Tags</p>
                          <p className="mt-2 text-lg font-black text-white">{footprintData.tags.length}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {footprintData.tags.slice(0, 4).map((tagChip) => (
                          <span
                            key={tagChip}
                            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/55"
                          >
                            #{tagChip}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/creator/${footprintData.handle.replace(/^@/, '').toLowerCase()}`)}
                          className="inline-flex items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/16"
                        >
                          Open Creator Page
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push('/map')}
                          className="inline-flex items-center justify-center rounded-full border border-purple-400/25 bg-purple-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-100 transition hover:border-purple-300/40 hover:bg-purple-400/16"
                        >
                          View On Map
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-3 text-xs leading-5 text-white/55">
                        No claimed creator footprint found yet. That is fine. Connect, claim, and the first verified win starts the graph cleanly.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {!hasMatchingVerifiedTag && platformHandle ? (
                          <button
                            type="button"
                            onClick={() => setTag(platformHandle)}
                            className="inline-flex items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/16"
                          >
                            Claim @{platformHandle}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => router.push('/map')}
                          className="inline-flex items-center justify-center rounded-full border border-purple-400/25 bg-purple-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-100 transition hover:border-purple-300/40 hover:bg-purple-400/16"
                        >
                          Open Map
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </motion.div>
          )}

          {/* Step 3: Claim Tag */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`backdrop-blur-xl border rounded-2xl p-4 transition-all ${(isConnected && isPlatformConnected) || (isConnected && isManualMode)
              ? 'bg-purple-500/5 border-purple-500/30'
              : 'bg-black/20 border-white/10 opacity-50'
              }`}
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5 text-purple-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white">Claim Your Tag</h3>
                <p className="text-xs text-gray-500 font-mono">Choose your unique creator tag</p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="relative">
                <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">
                  @
                </span>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder={platformHandle || manualUsername || 'your_tag'}
                  disabled={
                    !isConnected || (!isPlatformConnected && !isManualMode)
                  }
                  className="w-full pl-7 sm:pl-8 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:border-purple-500/50 focus:outline-none font-mono disabled:opacity-50"
                  maxLength={20}
                />
                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
                  {checking && <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 animate-spin" />}
                  {!checking && tagAvailable === true && (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                  )}
                  {!checking && tagAvailable === false && (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                  )}
                </div>
              </div>

              {tagAvailable === false && (
                <p className="text-[10px] sm:text-xs text-red-400 font-mono">This tag is already taken</p>
              )}

              {platformHandle &&
                tag &&
                tag.toLowerCase() !== platformHandle.toLowerCase() && (
                  <div className="flex items-start gap-2 p-2.5 sm:p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] sm:text-xs text-yellow-400">
                      Your tag (@{tag}) differs from your {connectedPlatform} handle (@
                      {platformHandle}). You can still claim it, but matching tags are recommended.
                    </p>
                  </div>
                )}

              {error && (
                <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 shrink-0" />
                  <p className="text-[10px] sm:text-xs text-red-400">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 shrink-0" />
                  <p className="text-[10px] sm:text-xs text-green-400">{success}</p>
                </div>
              )}

              <LiquidMetalButton
                onClick={handleClaimTag}
                disabled={
                  !isConnected ||
                  (!isPlatformConnected && !isManualMode) ||
                  !tag ||
                  !tagAvailable ||
                  claiming ||
                  (isManualMode && !manualUsername)
                }
                className="w-full"
                size="md"
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isManualMode ? 'Submitting...' : 'Claiming...'}
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    {isManualMode ? 'Submit for Review' : 'Claim Tag'}
                  </>
                )}
              </LiquidMetalButton>

              {isManualMode && (
                <p className="text-[10px] sm:text-xs text-gray-500 text-center">
                  Manual verification requires admin approval (usually within 24 hours)
                </p>
              )}
            </div>
          </motion.div>

          {/* Existing Tags */}
          {existingTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-4"
            >
              <h3 className="text-sm font-bold text-white mb-3">Your Verified Tags</h3>
              <div className="space-y-2">
                {existingTags.map((t) => (
                  <div
                    key={t.tag}
                    className="flex items-center justify-between p-2.5 sm:p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className="text-purple-400 font-mono text-sm font-bold truncate">{t.tag}</span>
                      {t.verificationMethod && (
                        <span className="text-[10px] sm:text-xs text-gray-500 shrink-0">
                          via {t.verificationMethod.toLowerCase()}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs font-mono px-2 py-1 rounded shrink-0 ${t.status === 'ACTIVE'
                        ? 'bg-green-500/20 text-green-400'
                        : t.status === 'REVOKED'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                    >
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-4"
          >
            <h3 className="text-sm font-bold text-white mb-3">Why claim a tag?</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 shrink-0 mt-0.5" />
                <span>Receive 89% of bounty payouts when you complete dares</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 shrink-0 mt-0.5" />
                <span>Your tag is verified and linked to your wallet</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 shrink-0 mt-0.5" />
                <span>Fans can stake dares on you directly</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
