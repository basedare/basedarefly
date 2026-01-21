'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ParticleNetwork from '@/components/ParticleNetwork';

// ============================================================================
// SHADOW ARMY - SCOUT DASHBOARD
// The Bounty Board for Archons to hunt and claim slots
// ============================================================================

interface Scout {
  id: string;
  walletAddress: string;
  handle: string | null;
  reputationScore: number;
  totalCampaigns: number;
  successfulSlots: number;
  failedSlots: number;
  tier: string;
  totalDiscoveryRake: number;
  totalActiveRake: number;
  discoveredCreators: ScoutCreator[];
  activeCreators: ScoutCreator[];
  slots: ScoutSlot[];
}

interface ScoutCreator {
  id: string;
  creatorAddress: string;
  creatorHandle: string | null;
  lastActiveAt: string;
  totalCompletions: number;
  bindingStatus: string;
}

interface ScoutSlot {
  id: string;
  creatorHandle: string | null;
  status: string;
  totalPayout: number | null;
  campaign: {
    title: string;
    tier: string;
    status: string;
    syncTime: string | null;
  };
}

interface Campaign {
  id: string;
  shortId: string;
  tier: string;
  title: string;
  description: string | null;
  budgetUsdc: number;
  creatorCountTarget: number;
  payoutPerCreator: number;
  status: string;
  syncTime: string | null;
  windowHours: number;
  strikeWindowMinutes: number;
  precisionMultiplier: number;
  targetingCriteria: string;
  brand: {
    name: string;
    logo: string | null;
  };
  slotCounts: {
    total: number;
    open: number;
    claimed: number;
    assigned: number;
    completed: number;
  };
}

const TIER_COLORS = {
  BLOODHOUND: 'from-zinc-500 to-zinc-600',
  ARBITER: 'from-blue-500 to-blue-600',
  ARCHON: 'from-purple-500 to-pink-500',
};

const TIER_BADGES = {
  BLOODHOUND: '🐕',
  ARBITER: '⚖️',
  ARCHON: '👑',
};

const CAMPAIGN_TIER_COLORS = {
  SIP_MENTION: 'bg-zinc-600',
  SIP_SHILL: 'bg-blue-600',
  CHALLENGE: 'bg-purple-600',
  APEX: 'bg-amber-500',
};

export default function ScoutDashboardPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  // Hydration guard to prevent SSR/client mismatch flickering
  const [mounted, setMounted] = useState(false);

  const [scout, setScout] = useState<Scout | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bounties' | 'creators' | 'activity'>('bounties');
  const [claimingSlot, setClaimingSlot] = useState<string | null>(null);

  // Claim form state
  const [claimForm, setClaimForm] = useState({
    creatorAddress: '',
    creatorHandle: '',
    creatorFollowers: 10000,
    claimRationale: '',
  });

  // Mark as mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch scout and open campaigns
  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch or create scout
        let scoutRes = await fetch(`/api/scouts?wallet=${address}`);
        let scoutData = await scoutRes.json();

        if (!scoutData.success && scoutData.code === 'NOT_FOUND') {
          // Auto-register scout
          scoutRes = await fetch('/api/scouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress: address }),
          });
          scoutData = await scoutRes.json();
        }

        if (scoutData.success) {
          setScout(scoutData.data);
        }

        // Fetch open campaigns (recruiting)
        const campaignsRes = await fetch('/api/campaigns?forScouts=true');
        const campaignsData = await campaignsRes.json();

        if (campaignsData.success) {
          setCampaigns(campaignsData.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isConnected, address]);

  const handleClaimSlot = async (campaignId: string) => {
    if (!address || !claimForm.creatorAddress || !claimForm.creatorHandle) {
      alert('Please fill in creator details');
      return;
    }

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scoutWallet: address,
          ...claimForm,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(data.data.message);
        setClaimingSlot(null);
        setClaimForm({
          creatorAddress: '',
          creatorHandle: '',
          creatorFollowers: 10000,
          claimRationale: '',
        });

        // Refresh campaigns
        const campaignsRes = await fetch('/api/campaigns?forScouts=true');
        const campaignsData = await campaignsRes.json();
        if (campaignsData.success) {
          setCampaigns(campaignsData.data);
        }
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Failed to claim slot:', error);
    }
  };

  const tierColor = TIER_COLORS[scout?.tier as keyof typeof TIER_COLORS] || TIER_COLORS.BLOODHOUND;
  const tierBadge = TIER_BADGES[scout?.tier as keyof typeof TIER_BADGES] || '🐕';

  // Determine current view state
  const showNotConnected = mounted && !isConnected;
  const showLoading = mounted && isConnected && loading;
  const showDashboard = mounted && isConnected && !loading;

  return (
    <div
      className="fixed inset-0 z-[100] bg-gradient-to-b from-zinc-100 via-zinc-50 to-white text-zinc-900 overflow-auto"
      style={{
        filter: 'grayscale(1) contrast(1.05)',
        WebkitFilter: 'grayscale(1) contrast(1.05)',
      }}
    >
      {/* VHS Scan Lines Overlay - old film aesthetic */}
      <div
        className="fixed inset-0 z-[200] pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Subtle film grain noise */}
      <div
        className="fixed inset-0 z-[199] pointer-events-none opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Control mode particle background - rendered once, persists across all states */}
      <div className="fixed inset-0 z-0">
        <ParticleNetwork particleCount={80} minDist={120} particleColor="rgba(0, 0, 0, 0.5)" lineColor="rgba(0, 0, 0," speed={0.25} />
      </div>

      {/* Pre-hydration skeleton */}
      {!mounted && (
        <div className="flex items-center justify-center h-full relative z-10">
          <div className="animate-pulse text-zinc-400">Loading...</div>
        </div>
      )}

      {/* Not connected state */}
      {showNotConnected && (
        <div className="flex items-center justify-center h-full relative z-10">
          <Link
            href="/?mode=control"
            className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/70 border border-zinc-200 rounded-xl backdrop-blur-sm hover:bg-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </Link>

          <div className="text-center space-y-6">
            <div className="text-6xl mb-4" style={{ filter: 'grayscale(1)', WebkitFilter: 'grayscale(1)' }}>🕵️</div>
            <h1 className="text-3xl font-bold text-zinc-900">
              SHADOW ARMY
            </h1>
            <p className="text-zinc-600 max-w-md">
              The Scout Dashboard for hunting creators and claiming bounties.
              Connect your wallet to join the Army.
            </p>
            <button
              onClick={() => connectors[0] && connect({ connector: connectors[0] })}
              className="px-6 py-3 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 transition"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {showLoading && (
        <div className="flex items-center justify-center h-full relative z-10">
          <div className="animate-pulse text-zinc-500">Initializing Shadow Army...</div>
        </div>
      )}

      {/* Main dashboard */}
      {showDashboard && (
        <>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 px-6 py-4 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Back button */}
            <Link
              href="/?mode=control"
              className="flex items-center gap-2 px-3 py-2 bg-white/70 border border-zinc-200 rounded-lg hover:bg-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="text-2xl font-bold text-zinc-900">
              SHADOW ARMY
            </div>
            <div className="px-2 py-1 bg-purple-100 border border-purple-400 rounded text-xs text-purple-700 font-semibold">
              SCOUT DASHBOARD
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`px-3 py-1 bg-gradient-to-r ${tierColor} rounded-lg text-sm font-semibold flex items-center gap-2 text-white`}
            >
              <span style={{ filter: 'grayscale(1)' }}>{tierBadge}</span>
              <span>{scout?.tier}</span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-zinc-900">{scout?.handle || 'Anonymous Scout'}</div>
              <div className="text-xs text-zinc-500 font-mono">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>

            {/* Mode Switch - Go to Chaos with Reality Shift */}
            <Link
              href="/?from=control"
              className="flex items-center gap-2 px-3 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition text-sm font-semibold"
            >
              <span className="text-purple-400">CHAOS</span>
              <span className="text-zinc-500">→</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Scout Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-xl p-4">
            <div className="text-zinc-500 text-sm">Reputation</div>
            <div className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
              {scout?.reputationScore || 50}
              <span
                className={`text-sm ${(scout?.reputationScore || 50) >= 70 ? 'text-green-600' : 'text-zinc-400'}`}
              >
                {(scout?.reputationScore || 50) >= 70 ? '✓ Auto-Accept' : ''}
              </span>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-xl p-4">
            <div className="text-zinc-500 text-sm">Campaigns</div>
            <div className="text-2xl font-bold text-zinc-900">{scout?.totalCampaigns || 0}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-xl p-4">
            <div className="text-zinc-500 text-sm">Success Rate</div>
            <div className="text-2xl font-bold text-zinc-900">
              {scout && scout.successfulSlots + scout.failedSlots > 0
                ? Math.round(
                    (scout.successfulSlots / (scout.successfulSlots + scout.failedSlots)) * 100
                  )
                : 0}
              %
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-xl p-4">
            <div className="text-zinc-500 text-sm">Discovery Rake</div>
            <div className="text-2xl font-bold text-green-600">
              ${scout?.totalDiscoveryRake.toFixed(2) || '0.00'}
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-xl p-4">
            <div className="text-zinc-500 text-sm">Active Rake</div>
            <div className="text-2xl font-bold text-purple-600">
              ${scout?.totalActiveRake.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-zinc-200">
          <button
            onClick={() => setActiveTab('bounties')}
            className={`pb-3 px-2 font-semibold transition ${
              activeTab === 'bounties'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <span style={{ filter: 'grayscale(1)' }}>🎯</span> Bounty Board
          </button>
          <button
            onClick={() => setActiveTab('creators')}
            className={`pb-3 px-2 font-semibold transition ${
              activeTab === 'creators'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <span style={{ filter: 'grayscale(1)' }}>👥</span> My Creators ({scout?.discoveredCreators.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 px-2 font-semibold transition ${
              activeTab === 'activity'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <span style={{ filter: 'grayscale(1)' }}>📊</span> Activity
          </button>
        </div>

        {/* Bounty Board Tab */}
        {activeTab === 'bounties' && (
          <div className="space-y-4">
            {campaigns.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                No open campaigns right now. Check back soon for new bounties.
              </div>
            ) : (
              campaigns.map((campaign) => {
                const targeting = JSON.parse(campaign.targetingCriteria || '{}');
                const isClaimingThis = claimingSlot === campaign.id;

                return (
                  <div
                    key={campaign.id}
                    className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-xl overflow-hidden"
                  >
                    {/* Campaign Header */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                            CAMPAIGN_TIER_COLORS[campaign.tier as keyof typeof CAMPAIGN_TIER_COLORS]
                          }`}
                        >
                          {campaign.tier.replace('_', ' ')}
                        </div>
                        <div>
                          <div className="font-semibold">{campaign.title}</div>
                          <div className="text-sm text-zinc-500">by {campaign.brand.name}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            ${campaign.payoutPerCreator}
                          </div>
                          <div className="text-xs text-zinc-500">per creator</div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-zinc-900">
                            {campaign.slotCounts.open}/{campaign.slotCounts.total}
                          </div>
                          <div className="text-xs text-zinc-500">slots open</div>
                        </div>

                        {campaign.syncTime && (
                          <div className="text-right">
                            <div className="text-sm font-semibold text-purple-600">
                              {campaign.precisionMultiplier}x Bonus
                            </div>
                            <div className="text-xs text-zinc-500">
                              ±{campaign.strikeWindowMinutes}min
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => setClaimingSlot(isClaimingThis ? null : campaign.id)}
                          disabled={campaign.slotCounts.open === 0}
                          className={`px-4 py-2 rounded-lg font-semibold transition ${
                            campaign.slotCounts.open === 0
                              ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                              : isClaimingThis
                                ? 'bg-zinc-300 text-zinc-700'
                                : 'bg-zinc-900 text-white hover:bg-zinc-800'
                          }`}
                        >
                          {isClaimingThis ? 'Cancel' : 'Claim Slot'}
                        </button>
                      </div>
                    </div>

                    {/* Targeting Info */}
                    <div className="px-4 pb-2 flex gap-4 text-xs text-zinc-500">
                      {targeting.niche && (
                        <span className="px-2 py-1 bg-zinc-800 rounded"><span style={{ filter: 'grayscale(1)' }}>📍</span> {targeting.niche}</span>
                      )}
                      {targeting.minFollowers && (
                        <span className="px-2 py-1 bg-zinc-800 rounded">
                          <span style={{ filter: 'grayscale(1)' }}>👥</span> {targeting.minFollowers.toLocaleString()}+ followers
                        </span>
                      )}
                      <span className="px-2 py-1 bg-zinc-800 rounded">
                        <span style={{ filter: 'grayscale(1)' }}>⏰</span> {campaign.windowHours}h window
                      </span>
                    </div>

                    {/* Claim Form */}
                    {isClaimingThis && (
                      <div className="border-t border-zinc-200 p-4 bg-zinc-50">
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="block text-xs text-zinc-600 mb-1">
                              Creator Wallet
                            </label>
                            <input
                              type="text"
                              value={claimForm.creatorAddress}
                              onChange={(e) =>
                                setClaimForm({ ...claimForm, creatorAddress: e.target.value })
                              }
                              placeholder="0x..."
                              className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-600 mb-1">
                              Creator Handle
                            </label>
                            <input
                              type="text"
                              value={claimForm.creatorHandle}
                              onChange={(e) =>
                                setClaimForm({ ...claimForm, creatorHandle: e.target.value })
                              }
                              placeholder="@username"
                              className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-600 mb-1">Followers</label>
                            <input
                              type="number"
                              value={claimForm.creatorFollowers}
                              onChange={(e) =>
                                setClaimForm({
                                  ...claimForm,
                                  creatorFollowers: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:border-purple-500 focus:outline-none text-zinc-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-600 mb-1">
                              Why This Creator?
                            </label>
                            <input
                              type="text"
                              value={claimForm.claimRationale}
                              onChange={(e) =>
                                setClaimForm({ ...claimForm, claimRationale: e.target.value })
                              }
                              placeholder="Great engagement..."
                              className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => handleClaimSlot(campaign.id)}
                          className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:opacity-90 transition"
                        >
                          <span style={{ filter: 'grayscale(1)' }}>🎯</span> Claim This Slot
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Creators Tab */}
        {activeTab === 'creators' && (
          <div className="space-y-4">
            {!scout?.discoveredCreators.length ? (
              <div className="text-center py-12 text-zinc-500">
                No bound creators yet. Start claiming slots to build your roster.
              </div>
            ) : (
              scout.discoveredCreators.map((creator) => {
                const daysSinceActive = Math.floor(
                  (Date.now() - new Date(creator.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
                );
                const decayWarning = daysSinceActive > 76; // 14 days before 90-day decay

                return (
                  <div
                    key={creator.id}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xl" style={{ filter: 'grayscale(1)' }}>
                        👤
                      </div>
                      <div>
                        <div className="font-semibold">{creator.creatorHandle || 'Unknown'}</div>
                        <div className="text-xs text-zinc-500 font-mono">
                          {creator.creatorAddress.slice(0, 8)}...{creator.creatorAddress.slice(-6)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="font-semibold">{creator.totalCompletions}</div>
                        <div className="text-xs text-zinc-500">completions</div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-semibold ${decayWarning ? 'text-yellow-400' : 'text-zinc-400'}`}
                        >
                          {daysSinceActive}d ago
                        </div>
                        <div className="text-xs text-zinc-500">last active</div>
                      </div>

                      <div
                        className={`px-3 py-1 rounded-lg text-sm ${
                          creator.bindingStatus === 'BOUND'
                            ? decayWarning
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-green-500/20 text-green-400'
                            : 'bg-zinc-500/20 text-zinc-400'
                        }`}
                      >
                        {creator.bindingStatus === 'BOUND'
                          ? decayWarning
                            ? <><span style={{ filter: 'grayscale(1)' }}>⚠️</span> Decay Soon</>
                            : '✓ Bound'
                          : 'Unbound'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            {!scout?.slots.length ? (
              <div className="text-center py-12 text-zinc-500">
                No activity yet. Start claiming slots to see your history.
              </div>
            ) : (
              scout.slots.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        CAMPAIGN_TIER_COLORS[
                          slot.campaign.tier as keyof typeof CAMPAIGN_TIER_COLORS
                        ]
                      }`}
                    >
                      {slot.campaign.tier.replace('_', ' ')}
                    </div>
                    <div>
                      <div className="font-semibold">{slot.campaign.title}</div>
                      <div className="text-sm text-zinc-500">
                        Creator: {slot.creatorHandle || 'Unknown'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {slot.totalPayout && (
                      <div className="text-right">
                        <div className="font-semibold text-green-400">
                          ${slot.totalPayout.toFixed(2)}
                        </div>
                        <div className="text-xs text-zinc-500">payout</div>
                      </div>
                    )}

                    <div
                      className={`px-3 py-1 rounded-lg text-sm ${
                        slot.status === 'PAID'
                          ? 'bg-green-500/20 text-green-400'
                          : slot.status === 'VERIFIED'
                            ? 'bg-blue-500/20 text-blue-400'
                            : slot.status === 'SUBMITTED'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : slot.status === 'VETOED'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-zinc-500/20 text-zinc-400'
                      }`}
                    >
                      {slot.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
      </>
      )}
    </div>
  );
}
