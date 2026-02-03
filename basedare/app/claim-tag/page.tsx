'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useAccount } from 'wagmi';
import { useSearchParams } from 'next/navigation';
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
} from 'lucide-react';
import LiquidBackground from '@/components/LiquidBackground';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import { LiquidMetalButton } from '@/components/ui/LiquidMetalButton';

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

export default function ClaimTagPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { address, isConnected } = useAccount();
  const searchParams = useSearchParams();

  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [tag, setTag] = useState('');
  const [tagAvailable, setTagAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingTags, setExistingTags] = useState<any[]>([]);

  // Kick manual verification state
  const [kickCode, setKickCode] = useState<string | null>(null);
  const [kickUsername, setKickUsername] = useState('');
  const [kickVerifying, setKickVerifying] = useState(false);

  // Invite flow state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // OAuth error messages
  const OAUTH_ERRORS: Record<string, string> = {
    'OAuthSignin': 'Error starting OAuth signin. Check provider configuration.',
    'OAuthCallback': 'Error during OAuth callback. Try again.',
    'OAuthCreateAccount': 'Could not create account with OAuth provider.',
    'EmailCreateAccount': 'Could not create email account.',
    'Callback': 'Error in OAuth callback.',
    'OAuthAccountNotLinked': 'This account is already linked to another user.',
    'EmailSignin': 'Email signin failed.',
    'CredentialsSignin': 'Sign in failed. Check your credentials.',
    'SessionRequired': 'Please sign in to access this page.',
    'twitter': 'Twitter OAuth failed. Check if callback URL is configured: http://localhost:3000/api/auth/callback/twitter',
    'twitch': 'Twitch OAuth failed. Check if callback URL is configured: http://localhost:3000/api/auth/callback/twitch',
    'google': 'Google OAuth failed. Check if callback URL is configured: http://localhost:3000/api/auth/callback/google',
    'default': 'OAuth authentication failed. Please try again.',
  };

  // Get platform handle from session
  const provider = (session as any)?.provider as string | undefined;
  const platformHandle = (session as any)?.platformHandle as string | undefined;
  const platformId = (session as any)?.platformId as string | undefined;

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
  }, [platformHandle]);

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
  }, [searchParams]);

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

  // Generate Kick verification code
  const generateKickCode = () => {
    const code = `BASEDARE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setKickCode(code);
  };

  // Copy code to clipboard
  const copyCode = async () => {
    if (kickCode) {
      await navigator.clipboard.writeText(kickCode);
    }
  };

  // Claim the tag
  const handleClaimTag = async () => {
    if (!address || !tag) return;

    // For OAuth platforms, need to be connected
    if (selectedPlatform !== 'kick' && !isPlatformConnected) return;

    // For Kick, need username and code
    if (selectedPlatform === 'kick' && (!kickUsername || !kickCode)) return;

    setClaiming(true);
    setError(null);
    setSuccess(null);

    try {
      const body: Record<string, string> = {
        walletAddress: address,
        tag: tag.startsWith('@') ? tag : `@${tag}`,
        platform: selectedPlatform || 'twitter',
      };

      // For Kick, include manual verification data
      if (selectedPlatform === 'kick') {
        body.kickUsername = kickUsername;
        body.kickCode = kickCode!;
      }

      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(data.data.message || 'Tag claimed successfully!');
        setTag('');
        setTagAvailable(null);
        setKickCode(null);
        setKickUsername('');
        setSelectedPlatform(null);
      } else {
        setError(data.error || 'Failed to claim tag');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to claim tag';
      setError(message);
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

    // For Kick, generate a verification code
    if (platform === 'kick' && !kickCode) {
      generateKickCode();
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay />
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-20 sm:py-24 flex-grow relative z-20">
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
            className={`backdrop-blur-xl border rounded-2xl p-4 transition-all ${
              isConnected
                ? 'bg-green-500/5 border-green-500/30'
                : 'bg-black/20 border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isConnected ? 'bg-green-500/20 border border-green-500/30' : 'bg-white/5 border border-white/10'
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

          {/* Step 2: Choose Platform */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`backdrop-blur-xl border rounded-2xl p-4 transition-all ${
              isPlatformConnected || selectedPlatform === 'kick'
                ? 'bg-green-500/5 border-green-500/30'
                : 'bg-black/20 border-white/10'
            } ${!isConnected ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isPlatformConnected || selectedPlatform === 'kick'
                    ? 'bg-green-500/20 border border-green-500/30'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <Shield
                  className={`w-5 h-5 ${
                    isPlatformConnected || selectedPlatform === 'kick'
                      ? 'text-green-400'
                      : 'text-gray-400'
                  }`}
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white">Verify Identity</h3>
                <p className="text-xs text-gray-500 font-mono truncate">
                  {isPlatformConnected
                    ? `Verified as ${platformHandle} via ${connectedPlatform}`
                    : selectedPlatform === 'kick'
                    ? 'Manual verification required'
                    : 'Choose your verification method'}
                </p>
              </div>
            </div>

            {/* Platform Selection Grid */}
            {!isPlatformConnected && selectedPlatform !== 'kick' && (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
            )}

            {/* Connected Platform Display */}
            {isPlatformConnected && connectedPlatform && (
              <div className="flex items-center justify-between p-2.5 sm:p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {(() => {
                    const config = getPlatformConfig(connectedPlatform);
                    return (
                      <>
                        <config.Icon className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 ${config.color}`} />
                        <span className="text-white text-sm font-mono truncate">@{platformHandle}</span>
                      </>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                  <button
                    onClick={() => signOut()}
                    className="text-[10px] sm:text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}

            {/* Kick Manual Verification */}
            {selectedPlatform === 'kick' && kickCode && (
              <div className="space-y-3 sm:space-y-4">
                <div className="p-3 sm:p-4 bg-[#53FC18]/10 border border-[#53FC18]/30 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <KickIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#53FC18]" />
                    <span className="text-sm font-bold text-[#53FC18]">Kick Manual Verification</span>
                  </div>

                  <div className="text-xs sm:text-sm text-gray-300 space-y-1.5 sm:space-y-2">
                    <p>1. Enter your Kick username below</p>
                    <p>2. Copy the verification code</p>
                    <p>3. Display this code on your stream or in your bio</p>
                    <p>4. Click verify (admin will confirm within 24h)</p>
                  </div>

                  {/* Kick Username Input */}
                  <div>
                    <label className="text-[10px] sm:text-xs text-gray-400 block mb-1">Kick Username</label>
                    <input
                      type="text"
                      value={kickUsername}
                      onChange={(e) => setKickUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      placeholder="your_kick_username"
                      className="w-full px-3 sm:px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-[#53FC18]/50 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Verification Code */}
                  <div>
                    <label className="text-[10px] sm:text-xs text-gray-400 block mb-1">Verification Code</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 sm:px-4 py-2 bg-black/60 border border-[#53FC18]/30 rounded-lg font-mono text-sm text-[#53FC18] truncate">
                        {kickCode}
                      </code>
                      <button
                        onClick={copyCode}
                        className="p-2 bg-[#53FC18]/20 hover:bg-[#53FC18]/30 rounded-lg transition-colors shrink-0"
                      >
                        <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-[#53FC18]" />
                      </button>
                    </div>
                  </div>

                  <a
                    href={`https://kick.com/${kickUsername || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#53FC18] hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Open your Kick profile
                  </a>
                </div>

                <button
                  onClick={() => {
                    setSelectedPlatform(null);
                    setKickCode(null);
                    setKickUsername('');
                  }}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  ← Choose different platform
                </button>
              </div>
            )}
          </motion.div>

          {/* Step 3: Claim Tag */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`backdrop-blur-xl border rounded-2xl p-4 transition-all ${
              (isConnected && isPlatformConnected) || (isConnected && selectedPlatform === 'kick')
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
                  placeholder={platformHandle || kickUsername || 'your_tag'}
                  disabled={
                    !isConnected || (!isPlatformConnected && selectedPlatform !== 'kick')
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
                  (!isPlatformConnected && selectedPlatform !== 'kick') ||
                  !tag ||
                  !tagAvailable ||
                  claiming ||
                  (selectedPlatform === 'kick' && !kickUsername)
                }
                className="w-full"
                size="md"
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {selectedPlatform === 'kick' ? 'Submitting...' : 'Claiming...'}
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    {selectedPlatform === 'kick' ? 'Submit for Review' : 'Claim Tag'}
                  </>
                )}
              </LiquidMetalButton>

              {selectedPlatform === 'kick' && (
                <p className="text-[10px] sm:text-xs text-gray-500 text-center">
                  Kick tags require manual verification (usually within 24 hours)
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
                    key={t.id}
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
                      className={`text-[10px] sm:text-xs font-mono px-2 py-1 rounded shrink-0 ${
                        t.status === 'VERIFIED'
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
