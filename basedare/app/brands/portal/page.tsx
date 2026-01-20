'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// ============================================================================
// CONTROL MODE - BRAND PORTAL
// B2B dashboard for programmatic attention marketing
// ============================================================================

interface Brand {
  id: string;
  name: string;
  logo: string | null;
  walletAddress: string;
  verified: boolean;
  totalSpend: number;
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
  createdAt: string;
  slotCounts: {
    total: number;
    open: number;
    claimed: number;
    assigned: number;
    completed: number;
  };
}

interface CampaignFormData {
  tier: 'SIP_MENTION' | 'SIP_SHILL' | 'CHALLENGE' | 'APEX';
  title: string;
  description: string;
  creatorCountTarget: number;
  payoutPerCreator: number;
  syncTime: string;
  targetingCriteria: {
    niche: string;
    minFollowers: number;
  };
  verificationCriteria: {
    hashtagsRequired: string[];
    minDurationSeconds: number;
    productVisible?: {
      target: string;
      minFramePercent: number;
    };
    ctaSpoken?: {
      phrase: string;
      fuzzyMatch: boolean;
    };
  };
}

const TIER_INFO = {
  SIP_MENTION: {
    name: 'Sip & Mention',
    description: 'Show product, tag brand',
    minPayout: 50,
    window: '7 days',
    bonus: 'None',
    rake: '25%',
    color: 'from-zinc-600 to-zinc-700',
    borderColor: 'border-zinc-500/30',
  },
  SIP_SHILL: {
    name: 'Sip & Shill',
    description: 'Demo product, include CTA',
    minPayout: 100,
    window: '24 hours',
    bonus: 'None',
    rake: '28%',
    color: 'from-blue-600 to-blue-700',
    borderColor: 'border-blue-500/30',
  },
  CHALLENGE: {
    name: 'Challenge Integration',
    description: 'Product in dare, hashtag campaign',
    minPayout: 250,
    window: '2 hours',
    bonus: '1.3x Strike',
    rake: '30%',
    color: 'from-purple-600 to-purple-700',
    borderColor: 'border-purple-500/30',
  },
  APEX: {
    name: 'Apex Stunt',
    description: 'Full branded content, custom brief',
    minPayout: 1000,
    window: '1 hour',
    bonus: '1.5x Strike',
    rake: '35%',
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/30',
  },
};

export default function BrandPortalPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [registerName, setRegisterName] = useState('');

  const [formData, setFormData] = useState<CampaignFormData>({
    tier: 'SIP_SHILL',
    title: '',
    description: '',
    creatorCountTarget: 10,
    payoutPerCreator: 100,
    syncTime: '',
    targetingCriteria: {
      niche: '',
      minFollowers: 5000,
    },
    verificationCriteria: {
      hashtagsRequired: [],
      minDurationSeconds: 30,
    },
  });
  const [hashtagInput, setHashtagInput] = useState('');

  // Fetch brand and campaigns
  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch brand
        const brandRes = await fetch(`/api/brands?wallet=${address}`);
        const brandData = await brandRes.json();

        if (brandData.success) {
          setBrand(brandData.data);

          // Fetch campaigns
          const campaignsRes = await fetch(`/api/campaigns?brand=${address}`);
          const campaignsData = await campaignsRes.json();

          if (campaignsData.success) {
            setCampaigns(campaignsData.data);
          }
        } else if (brandData.code === 'NOT_FOUND') {
          setShowRegister(true);
        }
      } catch (error) {
        console.error('Failed to fetch brand data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isConnected, address]);

  const handleRegister = async () => {
    if (!address || !registerName.trim()) return;

    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          walletAddress: address,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setBrand(data.data);
        setShowRegister(false);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Failed to register brand:', error);
    }
  };

  const handleCreateCampaign = async () => {
    if (!address) return;

    try {
      const tierConfig = TIER_INFO[formData.tier];
      if (formData.payoutPerCreator < tierConfig.minPayout) {
        alert(`Minimum payout for ${tierConfig.name} is $${tierConfig.minPayout}`);
        return;
      }

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandWallet: address,
          ...formData,
          syncTime: formData.syncTime || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setCampaigns([data.data, ...campaigns]);
        setShowCreateCampaign(false);
        setFormData({
          tier: 'SIP_SHILL',
          title: '',
          description: '',
          creatorCountTarget: 10,
          payoutPerCreator: 100,
          syncTime: '',
          targetingCriteria: { niche: '', minFollowers: 5000 },
          verificationCriteria: { hashtagsRequired: [], minDurationSeconds: 30 },
        });
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  const addHashtag = () => {
    if (hashtagInput.trim()) {
      const tag = hashtagInput.startsWith('#') ? hashtagInput : `#${hashtagInput}`;
      setFormData({
        ...formData,
        verificationCriteria: {
          ...formData.verificationCriteria,
          hashtagsRequired: [...formData.verificationCriteria.hashtagsRequired, tag],
        },
      });
      setHashtagInput('');
    }
  };

  const calculateBudget = () => {
    const tierConfig = TIER_INFO[formData.tier];
    const gross = formData.payoutPerCreator * formData.creatorCountTarget;
    const rake = gross * (parseInt(tierConfig.rake) / 100);
    return { gross, rake, total: gross + rake };
  };

  // Not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black/95 via-purple-950/20 to-black/95 text-white flex items-center justify-center relative">
        {/* Matte glass background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.15),transparent_50%)]" />
        <div className="absolute inset-0 backdrop-blur-3xl" />

        {/* Back button */}
        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm hover:bg-white/10 transition z-10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Home</span>
        </Link>

        <div className="text-center space-y-6 relative z-10">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-3xl font-bold text-[#FACC15]">
            CONTROL MODE
          </h1>
          <p className="text-zinc-400 max-w-md">
            The B2B portal for programmatic attention marketing.
            Connect your wallet to access the brand dashboard.
          </p>
          <button
            onClick={() => connectors[0] && connect({ connector: connectors[0] })}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black/95 via-purple-950/20 to-black/95 text-white flex items-center justify-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.15),transparent_50%)]" />
        <div className="absolute inset-0 backdrop-blur-3xl" />
        <div className="animate-pulse text-zinc-400 relative z-10">Loading Control Mode...</div>
      </div>
    );
  }

  // Register brand
  if (showRegister) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black/95 via-purple-950/20 to-black/95 text-white flex items-center justify-center p-4 relative">
        {/* Matte glass background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.15),transparent_50%)]" />
        <div className="absolute inset-0 backdrop-blur-3xl" />

        {/* Back button */}
        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm hover:bg-white/10 transition z-10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Home</span>
        </Link>

        <div className="max-w-md w-full space-y-6 relative z-10">
          <div className="text-center">
            <div className="text-5xl mb-4">🏢</div>
            <h1 className="text-2xl font-bold">Register Your Brand</h1>
            <p className="text-zinc-400 mt-2">
              Enter Control Mode and start creating campaigns
            </p>
          </div>

          <div className="space-y-4 bg-white/5 backdrop-blur-xl p-6 rounded-xl border border-white/10">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Brand Name</label>
              <input
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="e.g., Red Bull, Monster Energy"
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none backdrop-blur-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Wallet Address</label>
              <div className="px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-zinc-500 font-mono text-sm">
                {address}
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={!registerName.trim()}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              Register Brand
            </button>
          </div>
        </div>
      </div>
    );
  }

  const budget = calculateBudget();

  return (
    <div className="min-h-screen bg-gradient-to-b from-black/95 via-purple-950/20 to-black/95 text-white relative">
      {/* Matte glass background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.1),transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 backdrop-blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 px-6 py-4 bg-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Back button */}
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="text-2xl font-bold text-[#FACC15]">
              CONTROL
            </div>
            <div className="px-2 py-1 bg-purple-500/20 border border-purple-500/40 rounded text-xs text-purple-400">
              BRAND PORTAL
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-semibold">{brand?.name}</div>
              <div className="text-xs text-zinc-500 font-mono">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>
            {brand?.verified && (
              <div className="px-2 py-1 bg-green-500/20 border border-green-500/40 rounded text-xs text-green-400">
                ✓ Verified
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="text-zinc-400 text-sm">Total Spend</div>
            <div className="text-2xl font-bold">${brand?.totalSpend.toLocaleString() || 0}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="text-zinc-400 text-sm">Active Campaigns</div>
            <div className="text-2xl font-bold">
              {campaigns.filter((c) => ['RECRUITING', 'LIVE'].includes(c.status)).length}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="text-zinc-400 text-sm">Total Creators</div>
            <div className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + c.slotCounts.completed, 0)}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="text-zinc-400 text-sm">Avg Completion</div>
            <div className="text-2xl font-bold">
              {campaigns.length > 0
                ? Math.round(
                    (campaigns.reduce(
                      (sum, c) => sum + c.slotCounts.completed / c.slotCounts.total,
                      0
                    ) /
                      campaigns.length) *
                      100
                  )
                : 0}
              %
            </div>
          </div>
        </div>

        {/* Value Menu / Create Campaign */}
        {showCreateCampaign ? (
          <div className="mb-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Create Campaign</h2>
              <button
                onClick={() => setShowCreateCampaign(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Tier Selection - Value Menu Style */}
            <div className="mb-6">
              <label className="block text-sm text-zinc-400 mb-3">Select Tier</label>
              <div className="grid grid-cols-4 gap-3">
                {(Object.keys(TIER_INFO) as Array<keyof typeof TIER_INFO>).map((tier) => {
                  const info = TIER_INFO[tier];
                  const isSelected = formData.tier === tier;
                  return (
                    <button
                      key={tier}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          tier,
                          payoutPerCreator: Math.max(formData.payoutPerCreator, info.minPayout),
                        })
                      }
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? `bg-gradient-to-br ${info.color} border-transparent`
                          : `bg-zinc-900/50 ${info.borderColor} hover:border-zinc-600`
                      }`}
                    >
                      <div className="font-semibold">{info.name}</div>
                      <div className="text-xs text-zinc-300 mt-1">{info.description}</div>
                      <div className="mt-3 text-xs space-y-1 text-left">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Min:</span>
                          <span>${info.minPayout}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Window:</span>
                          <span>{info.window}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Bonus:</span>
                          <span>{info.bonus}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campaign Details */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Campaign Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Summer Energy Challenge"
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the campaign..."
                    rows={3}
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Creator Count</label>
                    <input
                      type="number"
                      value={formData.creatorCountTarget}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          creatorCountTarget: parseInt(e.target.value) || 1,
                        })
                      }
                      min={1}
                      max={1000}
                      className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">
                      Payout Per Creator ($)
                    </label>
                    <input
                      type="number"
                      value={formData.payoutPerCreator}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payoutPerCreator: parseInt(e.target.value) || 50,
                        })
                      }
                      min={TIER_INFO[formData.tier].minPayout}
                      className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Target Niche</label>
                  <input
                    type="text"
                    value={formData.targetingCriteria.niche}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targetingCriteria: { ...formData.targetingCriteria, niche: e.target.value },
                      })
                    }
                    placeholder="e.g., Gaming, Fitness, Tech"
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Min Followers</label>
                  <input
                    type="number"
                    value={formData.targetingCriteria.minFollowers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targetingCriteria: {
                          ...formData.targetingCriteria,
                          minFollowers: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min={0}
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Required Hashtags</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      placeholder="#BaseDare"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                      className="flex-1 px-4 py-3 bg-black border border-zinc-700 rounded-lg focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      onClick={addHashtag}
                      className="px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.verificationCriteria.hashtagsRequired.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-purple-500/20 border border-purple-500/40 rounded text-sm text-purple-300"
                      >
                        {tag}
                        <button
                          onClick={() =>
                            setFormData({
                              ...formData,
                              verificationCriteria: {
                                ...formData.verificationCriteria,
                                hashtagsRequired:
                                  formData.verificationCriteria.hashtagsRequired.filter(
                                    (_, idx) => idx !== i
                                  ),
                              },
                            })
                          }
                          className="ml-2 text-purple-400 hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {(formData.tier === 'CHALLENGE' || formData.tier === 'APEX') && (
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">
                      Sync Time (for Strike Bonus)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.syncTime}
                      onChange={(e) => setFormData({ ...formData, syncTime: e.target.value })}
                      className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Budget Summary */}
            <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-6">
              <div className="text-sm text-zinc-400 mb-2">Budget Summary</div>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">${budget.gross.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">Creator Payouts</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">
                    ${budget.rake.toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Platform Fee ({TIER_INFO[formData.tier].rake})
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    ${budget.total.toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-500">Total Budget</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {formData.creatorCountTarget} × ${formData.payoutPerCreator}
                  </div>
                  <div className="text-xs text-zinc-500">Slots × Payout</div>
                </div>
              </div>
            </div>

            {/* Guarantee Banner */}
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="font-semibold text-green-400">
                    All Deliverables Auto-Verified by AI Vision
                  </div>
                  <div className="text-sm text-zinc-400">
                    USDC Payment on Completion. No Bots. No Waste.
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={handleCreateCampaign}
                disabled={!formData.title.trim()}
                className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg hover:opacity-90 transition disabled:opacity-50"
              >
                CREATE CAMPAIGN (${budget.total.toLocaleString()} USDC)
              </button>
              <button
                onClick={() => setShowCreateCampaign(false)}
                className="px-6 py-4 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateCampaign(true)}
            className="w-full mb-8 p-6 border-2 border-dashed border-zinc-700 rounded-2xl hover:border-purple-500/50 hover:bg-purple-500/5 transition group"
          >
            <div className="text-zinc-400 group-hover:text-purple-400 transition">
              <span className="text-2xl mr-2">+</span>
              Create New Campaign
            </div>
          </button>
        )}

        {/* Campaigns List */}
        <div>
          <h2 className="text-xl font-bold mb-4">Your Campaigns</h2>

          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              No campaigns yet. Create your first campaign to start the Shadow Army hunt.
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const tierInfo = TIER_INFO[campaign.tier as keyof typeof TIER_INFO];
                return (
                  <div
                    key={campaign.id}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-white/20 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`px-3 py-1 rounded-lg bg-gradient-to-r ${tierInfo.color} text-sm font-semibold`}
                        >
                          {tierInfo.name}
                        </div>
                        <div>
                          <div className="font-semibold">{campaign.title}</div>
                          <div className="text-sm text-zinc-500">
                            {new Date(campaign.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            ${campaign.budgetUsdc.toLocaleString()}
                          </div>
                          <div className="text-xs text-zinc-500">Budget</div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {campaign.slotCounts.assigned + campaign.slotCounts.completed}/
                            {campaign.slotCounts.total}
                          </div>
                          <div className="text-xs text-zinc-500">Slots Filled</div>
                        </div>

                        <div
                          className={`px-3 py-1 rounded-lg text-sm ${
                            campaign.status === 'RECRUITING'
                              ? 'bg-green-500/20 text-green-400'
                              : campaign.status === 'LIVE'
                                ? 'bg-blue-500/20 text-blue-400'
                                : campaign.status === 'SETTLED'
                                  ? 'bg-zinc-500/20 text-zinc-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {campaign.status}
                        </div>
                      </div>
                    </div>

                    {/* Slot Progress Bar */}
                    <div className="mt-4">
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                          style={{
                            width: `${
                              ((campaign.slotCounts.assigned + campaign.slotCounts.completed) /
                                campaign.slotCounts.total) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-zinc-500">
                        <span>
                          {campaign.slotCounts.open} open • {campaign.slotCounts.claimed} claimed •{' '}
                          {campaign.slotCounts.assigned} assigned
                        </span>
                        <span>{campaign.slotCounts.completed} completed</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
