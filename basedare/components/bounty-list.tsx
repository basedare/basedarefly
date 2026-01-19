'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Crosshair, X, Loader2, AlertCircle } from 'lucide-react';

interface Bounty {
  dareId: string;
  title: string;
  amount: number;
  streamerTag: string;
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  createdAt: string;
  potSize: number;
}

// Dare emoji mapping based on keywords in title
const DARE_EMOJI_MAP: { keywords: string[]; emoji: string }[] = [
  { keywords: ['pushup', 'push-up', 'workout', 'exercise', 'squat', 'plank'], emoji: '💪' },
  { keywords: ['eat', 'food', 'chip', 'spicy', 'hot', 'pepper', 'drink'], emoji: '🌶️' },
  { keywords: ['blindfold', 'blind', 'no look'], emoji: '🙈' },
  { keywords: ['dark souls', 'elden ring', 'boss', 'souls', 'sekiro'], emoji: '⚔️' },
  { keywords: ['juggle', 'trick', 'skill', 'learn'], emoji: '🤹' },
  { keywords: ['gun', 'pistol', 'weapon', 'shoot', 'sniper', 'headshot'], emoji: '🎯' },
  { keywords: ['rhyme', 'sing', 'song', 'rap', 'voice', 'accent'], emoji: '🎤' },
  { keywords: ['flip', 'backflip', 'frontflip', 'stunt', 'jump'], emoji: '🤸' },
  { keywords: ['dance', 'move', 'tiktok'], emoji: '💃' },
  { keywords: ['win', 'victory', 'first', 'beat', 'clutch'], emoji: '🏆' },
  { keywords: ['horror', 'scary', 'scare', 'scream'], emoji: '👻' },
  { keywords: ['speed', 'speedrun', 'fast', 'quick', 'minute', 'hour'], emoji: '⏱️' },
  { keywords: ['money', 'donate', 'sub', 'gift'], emoji: '💰' },
  { keywords: ['sleep', 'tired', 'awake', 'night'], emoji: '😴' },
  { keywords: ['laugh', 'funny', 'joke', 'comedy'], emoji: '😂' },
];

function getDareEmoji(title: string): string {
  const lowerTitle = title.toLowerCase();
  for (const { keywords, emoji } of DARE_EMOJI_MAP) {
    if (keywords.some((kw) => lowerTitle.includes(kw))) {
      return emoji;
    }
  }
  return '🎲'; // Default dare emoji
}

// Generate gradient colors from streamer tag for avatar fallback
function getStreamerGradient(tag: string): string {
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'from-purple-500 to-pink-500',
    'from-cyan-500 to-blue-500',
    'from-green-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
    'from-pink-500 to-rose-500',
    'from-amber-500 to-orange-500',
    'from-emerald-500 to-cyan-500',
  ];
  return gradients[hash % gradients.length];
}

function getStreamerInitials(tag: string): string {
  return tag.replace('@', '').slice(0, 2).toUpperCase();
}

interface BountyListResponse {
  success: boolean;
  simulated?: boolean;
  data: {
    bounties: Bounty[];
    total: number;
    totalPot: number;
  };
}

type SortOption = 'recent' | 'amount';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'VERIFIED':
      return 'text-green-400 bg-green-500/20 border-green-500/30';
    case 'FAILED':
      return 'text-red-400 bg-red-500/20 border-red-500/30';
    default:
      return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30';
  }
}

export default function BountyList() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [totalPot, setTotalPot] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('recent');
  const [isSimulated, setIsSimulated] = useState(false);

  // Steal modal state
  const [stealTarget, setStealTarget] = useState<Bounty | null>(null);
  const [stealAmount, setStealAmount] = useState('');
  const [isStealing, setIsStealing] = useState(false);
  const { toast } = useToast();

  const handleStealClick = (bounty: Bounty) => {
    setStealTarget(bounty);
    setStealAmount((bounty.amount + 1).toString()); // Default to current + 1
  };

  const handleStealSubmit = async () => {
    if (!stealTarget) return;

    const newAmount = parseFloat(stealAmount);
    if (isNaN(newAmount) || newAmount <= stealTarget.amount) {
      toast({
        variant: 'destructive',
        title: 'Invalid amount',
        description: `Must exceed current bounty of $${stealTarget.amount}`,
      });
      return;
    }

    setIsStealing(true);
    try {
      const response = await fetch('/api/bounties/steal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bountyId: stealTarget.dareId,
          newAmount,
          thiefAddress: '0x0000000000000000000000000000000000000001', // Placeholder for wallet
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '🔫 BOUNTY STOLEN!',
          description: (
            <div className="flex flex-col gap-1">
              <span className="font-bold text-[#FFD700]">
                {stealTarget.streamerTag} – now ${newAmount.toLocaleString()} USDC!
              </span>
              <span className="text-xs text-gray-400">
                Previous staker refunded ${result.data.refundAmount} (5% fee: ${result.data.houseFee})
              </span>
            </div>
          ),
          duration: 6000,
        });

        // Refresh bounties list
        fetchBounties();
        setStealTarget(null);
        setStealAmount('');
      } else {
        toast({
          variant: 'destructive',
          title: 'Steal Failed',
          description: result.error,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      toast({
        variant: 'destructive',
        title: 'Request failed',
        description: message,
      });
    } finally {
      setIsStealing(false);
    }
  };

  // Handle dispute/appeal for failed dares
  const handleDispute = async (bounty: Bounty) => {
    try {
      const response = await fetch('/api/verify-proof', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dareId: bounty.dareId,
          reason: 'I completed the dare but the AI made a mistake. Please review the video proof.',
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '⚖️ Appeal Submitted',
          description: 'Your dispute has been logged. A human reviewer will check within 24-48 hours.',
          duration: 6000,
        });
        fetchBounties();
      } else {
        toast({
          variant: 'destructive',
          title: 'Appeal Failed',
          description: result.error,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      toast({
        variant: 'destructive',
        title: 'Request failed',
        description: message,
      });
    }
  };

  const fetchBounties = useCallback(async () => {
    try {
      const response = await fetch(`/api/bounties?sort=${sort}`);
      const result: BountyListResponse = await response.json();

      if (result.success) {
        setBounties(result.data.bounties);
        setTotalPot(result.data.totalPot);
        setIsSimulated(result.simulated || false);
        setError(null);
      } else {
        setError('Failed to load bounties');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [sort]);

  // Initial fetch
  useEffect(() => {
    fetchBounties();
  }, [fetchBounties]);

  // Poll every 30s
  useEffect(() => {
    const interval = setInterval(fetchBounties, 30000);
    return () => clearInterval(interval);
  }, [fetchBounties]);

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="relative overflow-hidden border-white/10 bg-black/60 backdrop-blur-xl">
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-white/10 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 bg-white/10 rounded w-16 animate-pulse" />
                    <div className="h-4 bg-white/10 rounded w-24 animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 h-16 bg-white/5 rounded-lg animate-pulse" />
                  <div className="flex-1 h-16 bg-white/5 rounded-lg animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl px-6">
        <Card className="border-red-500/30 bg-red-500/10 backdrop-blur-xl">
          <CardContent className="py-8 text-center">
            <p className="text-red-400">{error}</p>
            <Button
              onClick={fetchBounties}
              variant="outline"
              className="mt-4 border-red-500/30 text-red-400 hover:bg-red-500/20"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bounties.length === 0) {
    return (
      <div className="w-full max-w-6xl px-6">
        <Card className="relative overflow-hidden border-white/10 bg-black/60 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
          <CardContent className="relative z-10 py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-inner">
              🎲
            </div>
            <p className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 text-xl font-semibold mb-2">
              No dares yet
            </p>
            <p className="text-white/40 text-sm">Be the first to stake on your favorite streamer</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl px-6">
      {/* Header with sort and stats */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          {/* Total Pot - Glass Pill */}
          <div className="relative overflow-hidden flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 rounded-xl backdrop-blur-sm">
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.05] pointer-events-none" />
            <div className="relative flex items-center gap-2">
              <span className="text-white/50 font-mono text-xs uppercase tracking-wider">Total Pot</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 font-bold text-lg">
                ${totalPot.toLocaleString()}
              </span>
            </div>
          </div>
          {isSimulated && (
            <span className="px-3 py-1.5 text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 backdrop-blur-sm">
              Testnet
            </span>
          )}
        </div>

        {/* Sort Buttons */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSort('recent')}
            className={
              sort === 'recent'
                ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-white border border-white/10 rounded-lg hover:from-purple-500/30 hover:to-cyan-500/30'
                : 'text-white/50 hover:text-white hover:bg-white/5 rounded-lg'
            }
          >
            Recent
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSort('amount')}
            className={
              sort === 'amount'
                ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-white border border-white/10 rounded-lg hover:from-purple-500/30 hover:to-cyan-500/30'
                : 'text-white/50 hover:text-white hover:bg-white/5 rounded-lg'
            }
          >
            Top Stakes
          </Button>
        </div>
      </div>

      {/* Bounty Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {bounties.map((bounty) => (
          <Card
            key={bounty.dareId}
            className="relative overflow-hidden border-white/10 bg-black/60 backdrop-blur-xl hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all duration-300 group"
          >
            {/* Streamer Banner Image */}
            <div className={`relative h-28 bg-gradient-to-br ${getStreamerGradient(bounty.streamerTag)} overflow-hidden`}>
              {/* Pattern overlay */}
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />

              {/* Gradient fade to card */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />

              {/* Streamer Avatar - Centered */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Avatar className="h-16 w-16 ring-4 ring-black/50 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${bounty.streamerTag}&backgroundColor=transparent`}
                    alt={bounty.streamerTag}
                    className="bg-white/10"
                  />
                  <AvatarFallback
                    className={`bg-gradient-to-br ${getStreamerGradient(bounty.streamerTag)} text-white text-xl font-bold`}
                  >
                    {getStreamerInitials(bounty.streamerTag)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Status Badge - Top Right */}
              <span
                className={`absolute top-3 right-3 px-2.5 py-1 text-[10px] font-mono uppercase rounded-lg border backdrop-blur-md shadow-lg ${getStatusColor(
                  bounty.status
                )}`}
              >
                {bounty.status}
              </span>

              {/* Emoji Badge - Top Left */}
              <div className="absolute top-3 left-3 w-9 h-9 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-lg shadow-lg">
                {getDareEmoji(bounty.title)}
              </div>
            </div>

            {/* Card Body */}
            <CardContent className="relative z-10 pt-4 pb-4 space-y-3">
              {/* Streamer Name */}
              <div className="text-center -mt-1 mb-2">
                <span className="text-purple-400 font-bold text-base">{bounty.streamerTag}</span>
              </div>

              {/* Dare Title */}
              <div className="px-1">
                <h3 className="text-white font-medium text-sm leading-snug text-center line-clamp-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-cyan-400 transition-all duration-300">
                  {bounty.title}
                </h3>
              </div>

              {/* Amount and Pot - Glass Pills */}
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 p-2.5 rounded-lg bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 text-center">
                  <span className="text-cyan-400/70 text-[9px] uppercase tracking-wider block">Stake</span>
                  <span className="text-cyan-400 font-bold text-base">${bounty.amount.toLocaleString()}</span>
                </div>
                <div className="flex-1 p-2.5 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 text-center">
                  <span className="text-green-400/70 text-[9px] uppercase tracking-wider block">Pot</span>
                  <span className="text-green-400 font-bold text-base">${bounty.potSize.toLocaleString()}</span>
                </div>
              </div>

              {/* STEAL Button - Only for PENDING bounties */}
              {bounty.status === 'PENDING' && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStealClick(bounty);
                  }}
                  className="w-full mt-3 h-10 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black uppercase tracking-wider text-xs rounded-lg border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Crosshair className="w-4 h-4" />
                  STEAL BOUNTY
                </Button>
              )}

              {/* DISPUTE Button - Only for FAILED bounties */}
              {bounty.status === 'FAILED' && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDispute(bounty);
                  }}
                  className="w-full mt-3 h-10 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-black font-black uppercase tracking-wider text-xs rounded-lg border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:shadow-[0_0_25px_rgba(234,179,8,0.5)] transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <AlertCircle className="w-4 h-4" />
                  DISPUTE
                </Button>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-white/20 text-[10px] font-mono">#{bounty.dareId.slice(0, 8)}</span>
                <span className="text-white/30 text-[10px]">{formatRelativeTime(bounty.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live indicator */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/10 rounded-full backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-white/40 font-mono text-xs tracking-wide">Live • Auto-refresh</span>
        </div>
      </div>

      {/* STEAL MODAL */}
      {stealTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4 p-6 bg-gradient-to-br from-gray-900 to-black border border-red-500/30 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            {/* Close button */}
            <button
              onClick={() => {
                setStealTarget(null);
                setStealAmount('');
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center">
                <Crosshair className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-wider">Steal Bounty</h3>
              <p className="text-gray-400 text-sm mt-2">Outbid to claim this dare</p>
            </div>

            {/* Target info */}
            <div className="p-4 mb-6 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-400 font-bold">{stealTarget.streamerTag}</span>
                <span className="text-cyan-400 font-mono text-sm">Current: ${stealTarget.amount.toLocaleString()}</span>
              </div>
              <p className="text-white/70 text-sm line-clamp-2">{stealTarget.title}</p>
            </div>

            {/* Amount input */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
                Your New Bounty (must exceed ${stealTarget.amount})
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={stealAmount}
                  onChange={(e) => setStealAmount(e.target.value)}
                  min={stealTarget.amount + 1}
                  placeholder={(stealTarget.amount + 1).toString()}
                  className="w-full h-14 bg-black/50 border border-red-500/30 text-2xl font-black text-[#FFD700] placeholder:text-gray-600 rounded-xl pl-6 pr-20 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                  USDC
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Previous staker gets refunded minus 5% house fee
              </p>
            </div>

            {/* Fee breakdown */}
            {stealAmount && parseFloat(stealAmount) > stealTarget.amount && (
              <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs space-y-1">
                <div className="flex justify-between text-gray-400">
                  <span>House fee (5% of ${stealTarget.amount})</span>
                  <span className="text-red-400">${Math.floor(stealTarget.amount * 0.05)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Refund to previous staker</span>
                  <span className="text-green-400">${stealTarget.amount - Math.floor(stealTarget.amount * 0.05)}</span>
                </div>
                <div className="flex justify-between text-white font-bold pt-1 border-t border-white/10">
                  <span>Your new stake</span>
                  <span className="text-[#FFD700]">${parseFloat(stealAmount).toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setStealTarget(null);
                  setStealAmount('');
                }}
                variant="outline"
                className="flex-1 h-12 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStealSubmit}
                disabled={isStealing || !stealAmount || parseFloat(stealAmount) <= stealTarget.amount}
                className="flex-1 h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStealing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Stealing...
                  </>
                ) : (
                  <>
                    <Crosshair className="w-4 h-4 mr-2" />
                    Confirm Steal
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
