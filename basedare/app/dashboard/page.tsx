'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet, Trophy, Target, Zap, Plus, AlertCircle, Clock, CheckCircle, XCircle, Loader2, Upload, LogIn } from "lucide-react";
import SubmitEvidence from "@/components/SubmitEvidence";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";
import LivePotLeaderboard from "@/components/LivePotLeaderboard";
import InitProtocolButton from "@/components/InitProtocolButton";
import { useAccount, useConnect } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';

interface Dare {
  id: string;
  title: string;
  bounty: number;
  streamerHandle: string;
  status: string;
  videoUrl?: string;
  createdAt: string;
  isSimulated?: boolean;
  stakerAddress?: string;
  targetWalletAddress?: string;
}

interface UserTag {
  id: string;
  tag: string;
  status: string;
  verificationMethod: string;
  totalEarned: number;
  completedDares: number;
  bio?: string | null;
  followerCount?: number | null;
  tags?: string[];
}

type DareView = 'funded' | 'forme';

const raisedPanelClass =
  "relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]";

const softCardClass =
  "relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]";

const insetCardClass =
  "rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]";

const sectionLabelClass =
  "inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.16)_0%,rgba(88,28,135,0.08)_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100 shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_14px_rgba(0,0,0,0.22)]";

const pillClass =
  "inline-flex items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(11,11,18,0.94)_100%)] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-300 shadow-[0_12px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]";

export default function Dashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const [fundedDares, setFundedDares] = useState<Dare[]>([]);
  const [forMeDares, setForMeDares] = useState<Dare[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDare, setSelectedDare] = useState<Dare | null>(null);
  const [activeView, setActiveView] = useState<DareView>('funded');
  const [userTag, setUserTag] = useState<UserTag | null>(null);
  const [creatorTagsInput, setCreatorTagsInput] = useState('');
  const [savingCreatorTags, setSavingCreatorTags] = useState(false);
  const [tagsSaveError, setTagsSaveError] = useState<string | null>(null);
  const [tagsSaveSuccess, setTagsSaveSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalFunded: 0,
    activeBounties: 0,
    completedBounties: 0,
    daresForMe: 0,
  });

  // Get the active dares list based on view
  const dares = activeView === 'funded' ? fundedDares : forMeDares;

  // Format wallet address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Handle wallet connection
  const handleConnect = () => {
    connect({ connector: coinbaseWallet() });
  };

  // Keep editor in sync with fetched creator tags
  useEffect(() => {
    if (userTag?.tags && userTag.tags.length > 0) {
      setCreatorTagsInput(userTag.tags.join(', '));
    } else {
      setCreatorTagsInput('');
    }
  }, [userTag?.id, userTag?.tags]);

  const handleSaveCreatorTags = async () => {
    if (!address || !userTag) return;

    const parsed = Array.from(
      new Set(
        creatorTagsInput
          .split(',')
          .map((t) => t.replace(/^#/, '').trim().toLowerCase())
          .filter((t) => t.length >= 2)
      )
    );

    if (parsed.length < 3 || parsed.length > 5) {
      setTagsSaveError('Please enter 3 to 5 tags (comma separated).');
      setTagsSaveSuccess(null);
      return;
    }

    setSavingCreatorTags(true);
    setTagsSaveError(null);
    setTagsSaveSuccess(null);
    try {
      const res = await fetch('/api/tags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          tag: userTag.tag,
          tags: parsed,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save creator tags');
      }

      setUserTag((prev) => (prev ? { ...prev, tags: data.data.tags } : prev));
      setCreatorTagsInput(data.data.tags.join(', '));
      setTagsSaveSuccess('Creator tags saved.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save creator tags';
      setTagsSaveError(message);
    } finally {
      setSavingCreatorTags(false);
    }
  };

  // Fetch user's dares from API (both funded and for-me)
  useEffect(() => {
    const fetchDares = async () => {
      if (!address) {
        setFundedDares([]);
        setForMeDares([]);
        setUserTag(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch user's verified tag
        const tagRes = await fetch(`/api/tags?wallet=${address}`);
        const tagData = tagRes.ok ? await tagRes.json() : { tags: [] };
        const verifiedTag = tagData.tags?.find((t: UserTag) => t.status === 'ACTIVE');
        setUserTag(verifiedTag || null);

        // Fetch dares I funded (as staker)
        const fundedParams = new URLSearchParams({
          includeAll: 'true',
          userAddress: address,
          role: 'staker',
        });
        const fundedRes = await fetch(`/api/dares?${fundedParams.toString()}`);
        const fundedData = fundedRes.ok ? await fundedRes.json() : [];

        // Fetch dares targeting me (as creator)
        const forMeParams = new URLSearchParams({
          includeAll: 'true',
          userAddress: address,
          role: 'creator',
        });
        const forMeRes = await fetch(`/api/dares?${forMeParams.toString()}`);
        const forMeData = forMeRes.ok ? await forMeRes.json() : [];

        setFundedDares(fundedData);
        setForMeDares(forMeData);

        // Calculate stats from funded dares
        const active = fundedData.filter((d: Dare) => d.status === 'PENDING').length;
        const completed = fundedData.filter((d: Dare) => d.status === 'VERIFIED').length;
        const total = fundedData.reduce((sum: number, d: Dare) => sum + d.bounty, 0);

        setStats({
          totalFunded: total,
          activeBounties: active,
          completedBounties: completed,
          daresForMe: forMeData.length,
        });

        // Auto-select first pending dare from the active view
        const activeDares = activeView === 'funded' ? fundedData : forMeData;
        const pendingDare = activeDares.find((d: Dare) => d.status === 'PENDING');
        if (pendingDare) {
          setSelectedDare(pendingDare);
        }
      } catch (error) {
        console.error('Failed to fetch dares:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDares();
  }, [address, activeView]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'VERIFIED':
        return (
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-green-500/20 text-green-400 rounded-full border border-green-500/30 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Verified
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-400 rounded-full border border-red-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-gray-500/20 text-gray-400 rounded-full border border-gray-500/30">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none hidden md:block"><GradualBlurOverlay /></div>

      <div className="container mx-auto px-4 sm:px-6 py-24 mb-12 flex-grow relative z-20">
        {/* TOP COMMAND TILE */}
        <div className={`${raisedPanelClass} mb-8 px-5 py-7 sm:px-8 sm:py-8`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(250,204,21,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(168,85,247,0.1),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_36%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />
          <div className="relative space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
              <div className="flex flex-col gap-3 max-w-3xl">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#f6d75f]/70 bg-[linear-gradient(180deg,#fff0a8_0%,#facc15_44%,#d9a90a_70%,#b77f04_100%)] text-black shadow-[0_1px_0_rgba(255,255,255,0.32)_inset,0_-6px_10px_rgba(0,0,0,0.18)_inset,0_16px_24px_rgba(0,0,0,0.22)]">
                    <Wallet className="h-7 w-7" />
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[2.2rem] leading-none sm:text-5xl md:text-6xl font-black uppercase italic tracking-[-0.06em]">
                    <span className="text-[#FACC15] drop-shadow-[0_4px_18px_rgba(250,204,21,0.25)]">Command</span>
                    <span className="text-[#A855F7] drop-shadow-[0_4px_18px_rgba(168,85,247,0.2)]">Base</span>
                  </div>
                </div>

                {isConnected && userTag ? (
                  <>
                    <div>
                      <p className="text-gray-400 font-mono text-sm mb-1">Ready for your next mission?</p>
                      <h2 className="text-3xl md:text-4xl font-black text-white">
                        Welcome back, <span className="text-[#FFD700]">{userTag.tag}</span>
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 text-sm">
                      <span className={`${pillClass} normal-case tracking-normal text-xs text-green-300 border-green-500/25 bg-[linear-gradient(180deg,rgba(34,197,94,0.18)_0%,rgba(20,83,45,0.08)_100%)]`}>
                        ✓ Verified
                      </span>
                      {address && (
                        <span className={`${pillClass} normal-case tracking-normal text-xs text-gray-300`}>
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          {formatAddress(address)}
                        </span>
                      )}
                      {userTag.completedDares > 0 && (
                        <span className={`${pillClass} normal-case tracking-normal text-xs text-gray-300`}>
                          {userTag.completedDares} completed • ${userTag.totalEarned.toLocaleString()} earned
                        </span>
                      )}
                      {stats.daresForMe > 0 && (
                        <span className={`${pillClass} normal-case tracking-normal text-xs text-[#FFD700] border-[#FFD700]/30 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.08)_100%)] animate-pulse`}>
                          {stats.daresForMe} dare{stats.daresForMe > 1 ? 's' : ''} awaiting you
                        </span>
                      )}
                    </div>
                  </>
                ) : isConnected ? (
                  <>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black text-white">Claim your creator tag</h2>
                      <p className="mt-2 text-gray-400 font-mono text-sm">
                        Claim your creator tag to start earning and tune how people discover you.
                      </p>
                    </div>
                    {address && (
                      <span className={`${pillClass} normal-case tracking-normal text-xs text-gray-300 w-fit`}>
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Connected as {formatAddress(address)}
                      </span>
                    )}
                  </>
                ) : (
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-white">Connect to enter the protocol</h2>
                    <p className="mt-2 text-gray-400 font-mono text-sm">
                      Connect your wallet to see your stats, manage your dares, and enter the protocol properly.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:items-end gap-3 md:min-w-[220px]">
                <Link href="/create">
                  <button className="hidden md:flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(11,11,18,0.94)_100%)] uppercase font-bold text-xs hover:-translate-y-[1px] hover:bg-white/10 hover:border-white/30 transition-all text-white shadow-[0_12px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <Plus className="w-4 h-4" /> Create Dare
                  </button>
                </Link>
                {isConnected && userTag && (
                  <span className={`${pillClass} normal-case tracking-normal text-xs text-[#FFD700] border-[#FFD700]/30 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.08)_100%)]`}>
                    {userTag.tag}
                  </span>
                )}
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {isConnected && userTag ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-white font-bold text-sm">Creator Tags</p>
                    <p className="text-gray-400 font-mono text-xs">Add 3-5 tags (comma separated). Used for discovery.</p>
                  </div>
                  <button
                    onClick={handleSaveCreatorTags}
                    disabled={savingCreatorTags}
                    className="self-start sm:self-auto px-4 py-2 rounded-xl border border-purple-500/40 bg-[linear-gradient(180deg,rgba(168,85,247,0.18)_0%,rgba(88,28,135,0.12)_100%)] text-purple-200 font-bold text-xs uppercase tracking-wider shadow-[0_10px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all hover:-translate-y-[1px] hover:border-purple-400/50 disabled:opacity-50"
                  >
                    {savingCreatorTags ? 'Saving...' : 'Save Tags'}
                  </button>
                </div>
                <input
                  value={creatorTagsInput}
                  onChange={(e) => setCreatorTagsInput(e.target.value)}
                  placeholder="nightlife, gym, street"
                  className="w-full px-4 py-3 rounded-xl bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-purple-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-10px_16px_rgba(0,0,0,0.24)]"
                />
                {tagsSaveError && <p className="text-red-400 text-xs">{tagsSaveError}</p>}
                {tagsSaveSuccess && <p className="text-green-400 text-xs">{tagsSaveSuccess}</p>}
              </div>
            ) : isConnected ? (
              <div className={`${insetCardClass} p-4 flex items-center justify-between gap-4`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-500/25 bg-purple-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <Target className="w-5 h-5 text-purple-400 shrink-0" />
                  </div>
                  <div>
                    <p className="text-purple-300 text-sm font-bold">Claim your tag to start earning</p>
                    <p className="text-purple-300/70 text-xs font-mono">Verify your identity so fans can dare you</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/claim-tag')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-500/40 bg-[linear-gradient(180deg,rgba(168,85,247,0.18)_0%,rgba(88,28,135,0.12)_100%)] text-purple-200 font-bold text-xs uppercase tracking-wider transition-all hover:-translate-y-[1px] shrink-0 shadow-[0_10px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]"
                >
                  <Zap className="w-4 h-4" />
                  Claim Tag
                </button>
              </div>
            ) : (
              <div className={`${insetCardClass} p-4 flex items-center justify-between gap-4`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-500/25 bg-yellow-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
                  </div>
                  <p className="text-yellow-300 text-sm font-mono">Connect your wallet to see your personal stats and bounties</p>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-yellow-500/40 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.12)_100%)] text-yellow-200 font-bold text-xs uppercase tracking-wider transition-all hover:-translate-y-[1px] disabled:opacity-50 shrink-0 shadow-[0_10px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]"
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  Connect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* USER STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          {/* Card 1: Total Staked */}
          <div className={`${softCardClass} p-6 relative group hover:border-[#FFD700]/25 transition-colors`}>
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity z-10">
              <Wallet className="w-12 h-12 text-[#FFD700]" />
            </div>
            <div className="relative z-10 text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">Your Total Funded</div>
            <div className="relative z-10 text-3xl font-black text-white">
              {!isConnected ? (
                <span className="text-gray-500">--</span>
              ) : loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>{stats.totalFunded.toLocaleString()} <span className="text-[#FFD700]">USDC</span></>
              )}
            </div>
            <div className="relative z-10 text-xs text-green-400 mt-2 font-mono flex items-center gap-1">
              <Zap className="w-3 h-3" /> On Base L2
            </div>
          </div>

          {/* Card 2: Active Bounties */}
          <div className={`${softCardClass} p-6 relative group hover:border-purple-500/25 transition-colors`}>
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity z-10">
              <Target className="w-12 h-12 text-purple-500" />
            </div>
            <div className="relative z-10 text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">Your Active Bounties</div>
            <div className="relative z-10 text-3xl font-black text-white">
              {!isConnected ? (
                <span className="text-gray-500">--</span>
              ) : loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>{stats.activeBounties} <span className="text-purple-500">DARES</span></>
              )}
            </div>
            <div className="relative z-10 text-xs text-purple-400 mt-2 font-mono">Awaiting Verification</div>
          </div>

          {/* Card 3: Completed */}
          <div className={`${softCardClass} p-6 relative group hover:border-green-500/25 transition-colors`}>
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity z-10">
              <Trophy className="w-12 h-12 text-green-500" />
            </div>
            <div className="relative z-10 text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">Completed</div>
            <div className="relative z-10 text-2xl md:text-3xl font-black text-white">
              {!isConnected ? (
                <span className="text-gray-500">--</span>
              ) : loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>{stats.completedBounties} <span className="text-green-500">VERIFIED</span></>
              )}
            </div>
            <div className="relative z-10 text-xs text-green-400 mt-2 font-mono">Paid Out</div>
          </div>

          {/* Card 4: Dares For Me */}
          <div className={`${softCardClass} p-6 relative group hover:border-[#FFD700]/25 transition-colors`}>
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity z-10">
              <Zap className="w-12 h-12 text-[#FFD700]" />
            </div>
            <div className="relative z-10 text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">Dares For Me</div>
            <div className="relative z-10 text-2xl md:text-3xl font-black text-white">
              {!isConnected ? (
                <span className="text-gray-500">--</span>
              ) : loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>{stats.daresForMe} <span className="text-[#FFD700]">PENDING</span></>
              )}
            </div>
            <div className="relative z-10 text-xs text-[#FFD700] mt-2 font-mono">Complete to Earn</div>
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">

          {/* LEFT: BOUNTY LIST */}
          <div className={`${softCardClass} p-6`}>
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
            {/* Tab Switcher */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => { setActiveView('funded'); setSelectedDare(null); }}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_10px_18px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.06)] ${
                  activeView === 'funded'
                    ? 'border border-purple-500/45 bg-[linear-gradient(180deg,rgba(168,85,247,0.18)_0%,rgba(88,28,135,0.12)_100%)] text-purple-300'
                    : 'border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(11,11,18,0.95)_100%)] text-gray-400 hover:bg-white/10'
                }`}
              >
                <Wallet className="w-4 h-4" />
                Funded ({fundedDares.length})
              </button>
              <button
                onClick={() => { setActiveView('forme'); setSelectedDare(null); }}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_10px_18px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.06)] ${
                  activeView === 'forme'
                    ? 'border border-[#FFD700]/45 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.12)_100%)] text-[#FFD700]'
                    : 'border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(11,11,18,0.95)_100%)] text-gray-400 hover:bg-white/10'
                }`}
              >
                <Target className="w-4 h-4" />
                For Me ({forMeDares.length})
              </button>
            </div>

            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4 flex items-center gap-3">
              {activeView === 'funded' ? (
                <>
                  <Wallet className="w-5 h-5 text-purple-400" />
                  Dares You Funded
                </>
              ) : (
                <>
                  <Target className="w-5 h-5 text-[#FFD700]" />
                  Dares For You
                </>
              )}
            </h3>

            {!isConnected ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <Wallet className="w-8 h-8 text-yellow-400" />
                </div>
                <p className="text-gray-400 font-mono text-sm mb-2">Wallet not connected</p>
                <p className="text-gray-500 font-mono text-xs mb-4">Connect to view your personal bounties</p>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-6 py-3 rounded-xl border border-yellow-500/40 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.12)_100%)] text-yellow-200 font-bold text-sm uppercase tracking-wider transition-all hover:-translate-y-[1px] disabled:opacity-50 shadow-[0_10px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : dares.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  {activeView === 'funded' ? (
                    <Wallet className="w-8 h-8 text-gray-500" />
                  ) : (
                    <Target className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <p className="text-gray-400 font-mono text-sm mb-2">
                  {activeView === 'funded' ? 'No bounties funded yet' : 'No dares for you yet'}
                </p>
                <p className="text-gray-500 font-mono text-xs mb-6">
                  {activeView === 'funded'
                    ? 'Create a dare to stake on a creator'
                    : 'Claim your tag so fans can dare you!'}
                </p>
                {activeView === 'funded' ? (
                  <InitProtocolButton onClick={() => router.push('/create')} />
                ) : (
                  <button
                    onClick={() => router.push('/claim-tag')}
                    className="px-6 py-3 rounded-xl border border-[#FFD700]/40 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.12)_100%)] text-[#FFD700] font-bold text-sm uppercase tracking-wider transition-all hover:-translate-y-[1px] shadow-[0_10px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    Claim Your Tag
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {dares.map((dare) => (
                  <div
                    key={dare.id}
                    onClick={() => setSelectedDare(dare)}
                    className={`p-4 rounded-[20px] border cursor-pointer transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-8px_14px_rgba(0,0,0,0.24)] ${
                      selectedDare?.id === dare.id
                        ? 'bg-[linear-gradient(180deg,rgba(168,85,247,0.14)_0%,rgba(11,11,18,0.95)_100%)] border-purple-500/45'
                        : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(11,11,18,0.95)_100%)] border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-bold text-white text-sm line-clamp-1">{dare.title}</h4>
                      {getStatusBadge(dare.status)}
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-400">{dare.streamerHandle || 'Open Bounty'}</span>
                      <span className="text-[#FFD700] font-bold">{dare.bounty} USDC</span>
                    </div>
                    {dare.isSimulated && (
                      <span className="mt-2 inline-block px-2 py-0.5 text-[10px] font-mono uppercase bg-yellow-500/20 text-yellow-400 rounded">
                        Simulated
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: SELECTED DARE DETAILS & EVIDENCE */}
          <div className="space-y-6">
            {/* MISSION DETAILS */}
            {selectedDare ? (
              <div className={`${softCardClass} p-6 relative`}>
                <div className="absolute top-0 right-0 px-4 py-2 bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-widest rounded-bl-xl border-b border-l border-purple-500/30 z-20">
                  Status: {selectedDare.status}
                </div>

                <div className="relative z-10">
                  <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wider">Current Mission</h3>
                  <h2 className="text-2xl md:text-3xl font-black text-[#FFD700] mb-6 italic">&quot;{selectedDare.title}&quot;</h2>

                  <div className="space-y-3 font-mono text-sm text-gray-400 mb-6">
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span>BOUNTY LOCKED:</span>
                      <span className="text-white">{selectedDare.bounty} USDC</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span>TARGET:</span>
                      <span className="text-purple-400">{selectedDare.streamerHandle}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span>CREATED:</span>
                      <span className="text-gray-300">{new Date(selectedDare.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {selectedDare.status === 'PENDING' && (
                    <div className={`${insetCardClass} flex items-start gap-3 text-xs text-gray-500 p-4`}>
                      <AlertCircle className="w-4 h-4 text-[#FFD700] shrink-0" />
                      <span>Upload video proof to verify completion. AI Referee will analyze within 60 seconds.</span>
                    </div>
                  )}

                  {selectedDare.status === 'VERIFIED' && (
                    <div className="flex items-start gap-3 text-xs bg-[linear-gradient(180deg,rgba(34,197,94,0.12)_0%,rgba(7,18,10,0.92)_100%)] p-4 rounded-xl border border-green-500/30">
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="text-green-400">This dare has been verified and paid out!</span>
                    </div>
                  )}

                  {selectedDare.status === 'FAILED' && (
                    <div className="flex items-start gap-3 text-xs bg-[linear-gradient(180deg,rgba(239,68,68,0.12)_0%,rgba(18,8,8,0.92)_100%)] p-4 rounded-xl border border-red-500/30">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="text-red-400">Verification failed. Bounty has been refunded to stakers.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`${softCardClass} p-6 flex items-center justify-center min-h-[200px]`}>
                <p className="text-gray-500 font-mono text-sm">Select a bounty to view details</p>
              </div>
            )}

            {/* EVIDENCE UPLOAD - Only show for pending dares */}
            {selectedDare && selectedDare.status === 'PENDING' && (
              <div className={`${softCardClass} p-6`}>
                <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4 flex items-center gap-3">
                  <Upload className="w-5 h-5 text-cyan-400" />
                  Submit Evidence
                </h3>
                <SubmitEvidence
                  dareId={selectedDare.id}
                  onVerificationComplete={(result: { status: string }) => {
                    // Refresh dares lists on verification complete
                    if (result.status === 'VERIFIED' || result.status === 'FAILED') {
                      const updateDare = (d: Dare) =>
                        d.id === selectedDare.id ? { ...d, status: result.status } : d;
                      setFundedDares((prev) => prev.map(updateDare));
                      setForMeDares((prev) => prev.map(updateDare));
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* LIVE POT & LEADERBOARD */}
        <div className="mt-8">
          <div className={`${softCardClass} p-3 sm:p-4`}>
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
            <div className="mb-4 px-2">
              <div className={sectionLabelClass}>
                <Trophy className="w-4 h-4 text-fuchsia-300" />
                FUND SIGNAL
              </div>
            </div>
            <LivePotLeaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}
