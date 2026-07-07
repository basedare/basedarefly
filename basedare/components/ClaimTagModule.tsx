'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Wallet,
  CheckCircle,
  XCircle,
  Loader2,
  Tag,
  Shield,
  Gift,
  Clock,
  Sparkles,
} from 'lucide-react';
import { LiquidMetalButton } from '@/components/ui/LiquidMetalButton';
import { useToast } from '@/components/ui/use-toast';
import {
  buildWalletActionAuthHeaders,
  clearWalletActionAuth,
  clearWalletSessionAuth,
} from '@/lib/wallet-action-auth';
import { IdentityButton } from '@/components/IdentityButton';

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

interface ExistingTag {
  tag: string;
  status: string;
  walletAddress: string;
  isPrimary?: boolean;
  verificationMethod?: string | null;
  identityPlatform?: string | null;
}

const raisedPanelClass =
  "relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.38),0_0_28px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]";

const raisedTileClass =
  "relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[linear-gradient(160deg,rgba(34,32,56,0.92)_0%,rgba(18,18,30,0.98)_38%,rgba(10,10,18,1)_100%)] shadow-[0_18px_34px_rgba(0,0,0,0.3),0_0_20px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-14px_18px_rgba(0,0,0,0.24)]";

const insetWellClass =
  "bd-dent-surface bd-dent-surface--soft rounded-[20px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,8,14,0.94)_0%,rgba(16,14,28,0.86)_100%)]";

function sanitizeTagCandidate(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '');
}

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getTagStatusMeta(status: string) {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return {
        label: 'Ready',
        className: 'border-emerald-300/18 bg-emerald-500/15 text-emerald-200',
      };
    case 'VERIFIED':
      return {
        label: 'Verified',
        className: 'border-yellow-300/20 bg-yellow-500/15 text-yellow-200',
      };
    case 'REVOKED':
      return {
        label: 'Removed',
        className: 'border-red-300/18 bg-red-500/15 text-red-200',
      };
    case 'REJECTED':
      return {
        label: 'Needs fix',
        className: 'border-orange-300/18 bg-orange-500/15 text-orange-200',
      };
    case 'PENDING':
    case 'PENDING_REVIEW':
      return {
        label: 'In review',
        className: 'border-cyan-300/18 bg-cyan-500/15 text-cyan-100',
      };
    default:
      return {
        label: status.replace(/_/g, ' ').toLowerCase(),
        className: 'border-white/10 bg-white/[0.06] text-white/60',
      };
  }
}

export function ClaimTagModule() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const sessionToken = (session as { token?: string | null } | null)?.token ?? null;
  const sessionWallet =
    (session as { walletAddress?: string | null; user?: { walletAddress?: string | null } | null } | null)?.walletAddress?.toLowerCase() ??
    (session as { walletAddress?: string | null; user?: { walletAddress?: string | null } | null } | null)?.user?.walletAddress?.toLowerCase() ??
    null;
  const activeWallet = address?.toLowerCase() ?? sessionWallet;
  const walletReady = Boolean(activeWallet);

  const [tag, setTag] = useState('');
  const [tagAvailable, setTagAvailable] = useState<boolean | null>(null);
  const [tagOwnedByCurrentWallet, setTagOwnedByCurrentWallet] = useState(false);
  const [checking, setChecking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingTags, setExistingTags] = useState<ExistingTag[]>([]);

  // Invite flow state
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const orderedExistingTags = [...existingTags].sort((left, right) => {
    if (left.isPrimary && !right.isPrimary) return -1;
    if (!left.isPrimary && right.isPrimary) return 1;
    return left.tag.localeCompare(right.tag);
  });
  const walletStepDone = walletReady;
  const tagStepDone = Boolean(tag && (tagAvailable === true || tagOwnedByCurrentWallet));

  // Fetch invite data from URL params
  useEffect(() => {
    const invite = searchParams.get('invite');
    const handle = searchParams.get('handle');

    if (invite) {
      setInviteLoading(true);

      fetch(`/api/invite/${invite}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data.pendingDares) {
            setInviteData(data.data);
            // Pre-fill tag from invite data
            const streamerHandle = data.data.streamerHandle?.replace('@', '') || handle || '';
            if (streamerHandle && !tag) {
              setTag(sanitizeTagCandidate(streamerHandle));
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
    }
  }, [searchParams, tag]);

  // Pre-fill the tag from ?tag= or ?handle= links
  useEffect(() => {
    const prefill = searchParams.get('tag') || searchParams.get('handle');
    if (prefill && !tag) {
      const suggestedTag = sanitizeTagCandidate(prefill);
      if (suggestedTag) {
        setTag(suggestedTag);
      }
    }
  }, [searchParams, tag]);

  // Fetch existing tags for this wallet
  useEffect(() => {
    if (!activeWallet) {
      setExistingTags([]);
      return;
    }

    fetch(`/api/tags?wallet=${activeWallet}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.tags) setExistingTags(data.tags);
      })
      .catch(console.error);
  }, [activeWallet, success]);

  // Check tag availability
  const checkTagAvailability = useCallback(async (tagValue: string) => {
    if (tagValue.length < 2) {
      setTagAvailable(null);
      setTagOwnedByCurrentWallet(false);
      return;
    }

    setChecking(true);
    try {
      const params = new URLSearchParams({ tag: tagValue });
      if (activeWallet) {
        params.set('wallet', activeWallet);
      }
      const res = await fetch(`/api/tags?${params.toString()}`);
      const data = await res.json();
      setTagAvailable(data.available);
      setTagOwnedByCurrentWallet(Boolean(data.ownedByCurrentWallet));
    } catch (err) {
      console.error('Failed to check tag:', err);
    } finally {
      setChecking(false);
    }
  }, [activeWallet]);

  // Debounced tag check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tag) checkTagAvailability(tag);
    }, 300);
    return () => clearTimeout(timer);
  }, [tag, checkTagAvailability]);

  // Claim the tag
  const handleClaimTag = async () => {
    if (!activeWallet) {
      const message = 'Connect your wallet first, then claim your tag.';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Wallet Required',
        description: message,
        duration: 7000,
      });
      return;
    }

    if (!tag) return;

    setClaiming(true);
    setError(null);
    setSuccess(null);

    try {
      const normalizedTag = tag.startsWith('@') ? tag : `@${tag}`;
      const cleanTag = normalizedTag.replace(/^@+/, '');
      // The review rail still expects a handle + proof code; the tag itself is
      // the handle now, and the code is generated silently.
      const manualCode = `BASEDARE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const endpoint = '/api/tags';

      const runClaimRequest = async (forceFreshSignature = false) => {
        const body: Record<string, string> = {
          walletAddress: activeWallet,
          tag: normalizedTag,
          identityPlatform: 'other',
          manualUsername: cleanTag,
          manualCode,
        };

        const authHeaders = await buildWalletActionAuthHeaders({
          walletAddress: activeWallet,
          sessionToken,
          sessionWallet,
          action: 'tag:claim',
          resource: normalizedTag.toLowerCase(),
          forceFreshSignature,
          signatureScope: forceFreshSignature ? 'action' : 'session',
          signMessageAsync: address ? signMessageAsync : undefined,
        });
        const hasMatchingBearer = Boolean(authHeaders.Authorization && sessionWallet === activeWallet);
        const hasWalletSignature = Boolean(authHeaders['x-basedare-wallet']);
        if (!hasMatchingBearer && !hasWalletSignature) {
          throw new Error('Wallet authorization missing. Reconnect your wallet and try again.');
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify(body),
        });

        let data: Record<string, unknown> = {};
        try {
          data = (await res.json()) as Record<string, unknown>;
        } catch {
          data = {};
        }

        return { res, data };
      };

      let { res, data } = await runClaimRequest(false);
      const firstError = typeof data.error === 'string' ? data.error : '';
      const shouldRetryWithFreshSignature =
        res.status === 401 &&
        Boolean(address) &&
        /wallet|authorization|session/i.test(firstError);

      if (shouldRetryWithFreshSignature) {
        clearWalletSessionAuth(activeWallet);
        clearWalletActionAuth(activeWallet, 'tag:claim', normalizedTag.toLowerCase());
        ({ res, data } = await runClaimRequest(true));
      }

      if (res.ok && data.success === true) {
        const payload = data.data as { message?: string } | undefined;
        const message = payload?.message || 'Tag claimed successfully!';
        setSuccess(message);
        setTag('');
        setTagAvailable(null);
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

  const claimDisabledReason = !walletReady
    ? 'Connect your wallet first.'
    : !tag
      ? 'Choose your BaseDare tag.'
      : tagAvailable === false && !tagOwnedByCurrentWallet
        ? 'That tag is already taken.'
        : null;
  const canSubmitClaim = !claimDisabledReason && !claiming;

  return (
    <div id="claim-tag-section" className="relative z-20 w-full max-w-xl mx-auto">
      <div className="space-y-3 sm:space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${raisedPanelClass} p-4 sm:p-5`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-[#f5c518]">
                  Claim in one pass
                </p>
                <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-white sm:text-2xl">
                  Make your public @tag usable.
                </h2>
                <p className="mt-2 text-xs leading-5 text-white/52">
                  Connect your wallet, pick your tag, send it for review. Done.
                </p>
              </div>
              <div className="grid min-w-[13rem] gap-2">
                {[
                  { label: 'Wallet', done: walletStepDone },
                  { label: 'Tag', done: tagStepDone },
                ].map((step, index) => (
                  <div
                    key={step.label}
                    className={`flex min-h-9 items-center justify-between rounded-full border px-3 text-[10px] font-black uppercase tracking-[0.16em] ${
                      step.done
                        ? 'border-emerald-300/18 bg-emerald-400/[0.08] text-emerald-100'
                        : 'border-white/10 bg-black/20 text-white/36'
                    }`}
                  >
                    <span>{index + 1}. {step.label}</span>
                    {step.done ? <CheckCircle className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-white/22" />}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Invite Banner - Show pending bounties */}
          {inviteLoading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${raisedTileClass} border-yellow-500/30 bg-[linear-gradient(180deg,rgba(250,204,21,0.10)_0%,rgba(14,10,5,0.96)_100%)] p-4`}
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
              className={`${raisedTileClass} border-red-500/30 bg-[linear-gradient(180deg,rgba(239,68,68,0.08)_0%,rgba(20,8,8,0.96)_100%)] p-4`}
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
              className={`${raisedPanelClass} border-yellow-500/30 bg-[linear-gradient(180deg,rgba(250,204,21,0.12)_0%,rgba(34,197,94,0.08)_24%,rgba(10,9,18,0.92)_62%,rgba(7,6,14,0.98)_100%)] p-5 sm:p-6`}
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
              <div className={`${insetWellClass} mb-4 p-4`}>
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
                  <div key={dare.id} className={`flex items-center justify-between border border-white/8 p-3 ${insetWellClass}`}>
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
            className={`${raisedTileClass} p-4 transition-all ${walletReady
              ? 'border-green-500/25 bg-[linear-gradient(180deg,rgba(34,197,94,0.08)_0%,rgba(10,18,11,0.96)_100%)]'
              : ''
              }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${walletReady ? 'bg-green-500/20 border border-green-500/30' : 'bg-white/5 border border-white/10'
                    }`}
                >
                  <Wallet className={`w-5 h-5 ${walletReady ? 'text-green-400' : 'text-gray-400'}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white">{walletReady ? 'Wallet connected' : 'Connect wallet'}</h3>
                  <p className="text-xs text-gray-500 font-mono truncate">
                    {activeWallet ? formatAddress(activeWallet) : 'This tag will belong to your wallet'}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                {walletReady ? (
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                ) : null}
                <IdentityButton />
              </div>
            </div>
          </motion.div>

          {/* Step 2: Claim Tag */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`${raisedPanelClass} p-4 transition-all ${walletReady
              ? 'border-purple-500/30 bg-[linear-gradient(180deg,rgba(168,85,247,0.08)_0%,rgba(11,9,20,0.96)_100%)]'
              : 'opacity-50'
              }`}
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5 text-purple-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white">Choose your tag</h3>
                <p className="text-xs text-gray-500 font-mono">This is how dares, payouts, and profiles find you.</p>
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
                  placeholder="your_tag"
                  disabled={!walletReady}
                  className="w-full pl-7 sm:pl-8 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:border-purple-500/50 focus:outline-none font-mono disabled:opacity-50 shadow-[inset_0_12px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.04)]"
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

              {tagAvailable === false && !tagOwnedByCurrentWallet && (
                <p className="text-[10px] sm:text-xs text-red-400 font-mono">This tag is already taken</p>
              )}

              {tagOwnedByCurrentWallet && (
                <p className="text-[10px] sm:text-xs text-cyan-300 font-mono">
                  This tag is already yours. You can re-submit it anytime.
                </p>
              )}

              <div className="flex items-start gap-2 p-2.5 sm:p-3 bg-cyan-500/[0.06] border border-cyan-400/20 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300 shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-xs leading-5 text-cyan-100/80">
                  Pick any tag you want — it works best when it matches the username people already
                  know you by on your other platforms, so backers can find you.
                </p>
              </div>

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
                disabled={!canSubmitClaim}
                className="w-full"
                size="md"
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Send tag for review
                  </>
                )}
              </LiquidMetalButton>

              <p className={`text-center text-[10px] sm:text-xs ${claimDisabledReason ? 'text-yellow-200/62' : 'text-gray-500'}`}>
                {claimDisabledReason ?? 'Reviewers approve the tag before it appears publicly.'}
              </p>
            </div>
          </motion.div>

          {/* Existing Tags */}
          {existingTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={`${raisedTileClass} p-4`}
            >
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Your tags</h3>
                  <p className="mt-1 text-xs text-white/42">Ready tags first. Old reviews stay here for reference.</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-mono text-white/42">
                  {existingTags.length}
                </span>
              </div>
              <div className="max-h-[23rem] space-y-2 overflow-y-auto pr-1">
                {orderedExistingTags.map((t) => {
                  const statusMeta = getTagStatusMeta(t.status);

                  return (
                    <div
                      key={t.tag}
                      className={`grid gap-2 p-2.5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-3 ${insetWellClass}`}
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="truncate font-mono text-sm font-bold text-purple-300">{t.tag}</span>
                          {t.isPrimary ? (
                            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200">
                              Primary
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span
                        className={`justify-self-start rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.12em] sm:justify-self-end ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

        </div>
    </div>
  );
}
