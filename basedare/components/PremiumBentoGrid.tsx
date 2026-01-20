'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import PremiumDareCard, { PremiumDareCardStatus, SentinelSkeleton } from './PremiumDareCard';
import ProofViewer from './ProofViewer';
import './PremiumBentoGrid.css';

const FILTERS = ['ALL', 'STREAMERS', 'OPEN BOUNTIES', 'LOCKED'] as const;
type Filter = (typeof FILTERS)[number];

type Dare = {
  id: string;
  description: string;
  stake_amount: number;
  streamer_name?: string;
  status?: string;
  image_url?: string;
  video_url?: string;
  expires_at?: string | null;
  short_id?: string;
};

type PremiumBentoGridProps = {
  dares: Dare[];
};

const STREAMER_IMAGES: Record<string, string> = {
  kaicenat: '/assets/KAICENAT.jpeg',
  'kai cenat': '/assets/KAICENAT.jpeg',
  '@kaicenat': '/assets/KAICENAT.jpeg',
  adinross: '/assets/adinross.png',
  'adin ross': '/assets/adinross.png',
  '@adinross': '/assets/adinross.png',
  ishowspeed: '/assets/Ishowspeed.jpg',
  '1showspeed': '/assets/Ishowspeed.jpg',
  '@ishowspeed': '/assets/Ishowspeed.jpg',
  speed: '/assets/Ishowspeed.jpg',
};

const DARE_EMOJIS: Record<string, string> = {
  reaper: '🌶️',
  pepper: '🌶️',
  spicy: '🌶️',
  hot: '🌶️',
  skydiving: '🪂',
  skydive: '🪂',
  jump: '🪂',
  call: '💔',
  ex: '💔',
  phone: '💔',
  coke: '🥤',
  soda: '🥤',
  drink: '🥤',
  burger: '🍔',
  cheeseburger: '🍔',
  eat: '🍔',
  food: '🍔',
  dance: '🎯',
  read: '🎯',
  mail: '🎯',
  shave: '💈',
  head: '💈',
  tattoo: '🎨',
};

// LIVE TARGETS - Featured bounties with real streamers
const LIVE_TARGETS = [
  {
    id: 'live-101',
    dare: 'EAT THE REAPER',
    bounty: 5000,
    time: '02:00h left',
    streamer: '@KaiCenat',
    imgUrl: '/assets/KAICENAT.jpeg',
    emoji: '🌶️',
    isVulnerable: false,
    status: 'live' as const,
  },
  {
    id: 'live-102',
    dare: 'SKYDIVING IRL',
    bounty: 12000,
    time: 'EXPIRED',
    streamer: '@IShowSpeed',
    imgUrl: '/assets/Ishowspeed.jpg',
    emoji: '🪂',
    isVulnerable: true,
    status: 'expired' as const,
  },
  {
    id: 'live-103',
    dare: 'CALL YOUR EX',
    bounty: 500,
    time: '00:30m left',
    streamer: '@AdinRoss',
    imgUrl: '/assets/adinross.png',
    emoji: '💔',
    isVulnerable: false,
    status: 'live' as const,
  },
];

function getStreamerImage(streamerName?: string): string | undefined {
  if (!streamerName) return undefined;
  const normalized = streamerName.toLowerCase().trim();
  return STREAMER_IMAGES[normalized];
}

function getDareEmoji(description: string): string {
  const normalized = description.toLowerCase();
  for (const [keyword, emoji] of Object.entries(DARE_EMOJIS)) {
    if (normalized.includes(keyword)) return emoji;
  }
  return '⚡';
}

function normalizeStatus(status?: string): PremiumDareCardStatus {
  if (!status) return 'live';
  const s = status.toLowerCase();
  if (s === 'restricted') return 'restricted';
  if (s === 'open') return 'open';
  if (s === 'verified') return 'completed';
  if (s === 'pending') return 'pending_verification';
  if (s === 'expired' || s === 'failed' || s === 'completed') return 'expired';
  return 'live';
}

function calculateTimeRemaining(expiresAt?: string | null): { display: string; secondsLeft: number } {
  if (!expiresAt) return { display: '24h left', secondsLeft: 86400 };

  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) return { display: 'EXPIRED', secondsLeft: 0 };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) {
    return { display: `${hours}h ${minutes}m left`, secondsLeft: Math.floor(diff / 1000) };
  } else if (minutes > 0) {
    return { display: `${minutes}m ${seconds}s left`, secondsLeft: Math.floor(diff / 1000) };
  } else {
    return { display: `${seconds}s left`, secondsLeft: Math.floor(diff / 1000) };
  }
}

export default function PremiumBentoGrid({ dares }: PremiumBentoGridProps) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const loadingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current != null) window.clearTimeout(loadingTimeoutRef.current);
    };
  }, []);

  const triggerLoading = () => {
    setIsLoading(true);
    if (loadingTimeoutRef.current != null) window.clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = window.setTimeout(() => setIsLoading(false), 600);
  };

  type Card = {
      id: string;
      shortId: string;
      dare: string;
      bounty: number;
      streamer: string;
      streamerImage?: string;
      emoji: string;
      status: PremiumDareCardStatus;
      timeRemaining?: string;
      expiresAt?: string | null;
      isOpenBounty: boolean;
      proofUrl?: string;
  };

  const cards = useMemo<Card[]>(() => {
    // Map LIVE_TARGETS (featured streamers) first
    const liveTargetCards: Card[] = LIVE_TARGETS.map((target) => ({
      id: target.id,
      shortId: target.id,
      dare: target.dare,
      bounty: target.bounty,
      streamer: target.streamer,
      streamerImage: target.imgUrl,
      emoji: target.emoji,
      status: target.status,
      timeRemaining: target.status === 'live' ? target.time : target.status === 'expired' ? 'EXPIRED' : undefined,
      isOpenBounty: false,
      proofUrl: undefined,
    }));

    // Map incoming dares from database
    const mapped = dares.map((d) => {
      const normalizedStatus = normalizeStatus(d.status);

      const streamerName = d.streamer_name || '';
      const streamerImage = getStreamerImage(streamerName) || d.image_url;
      const proof = d.video_url;

      // Calculate real time remaining from expiresAt
      const timeInfo = calculateTimeRemaining(d.expires_at);
      const isExpired = timeInfo.secondsLeft <= 0;

      // Override status to expired if time ran out
      let status: PremiumDareCardStatus =
        normalizedStatus === 'live' && streamerName.trim().length === 0 ? 'open' : normalizedStatus;

      if (isExpired && status === 'live') {
        status = 'expired';
      }

      return {
        id: d.id,
        shortId: d.short_id || d.id.slice(0, 8),
        dare: d.description,
        bounty: d.stake_amount,
        streamer: streamerName,
        streamerImage,
        emoji: getDareEmoji(d.description),
        status,
        timeRemaining: status === 'live' || status === 'open' ? timeInfo.display : (isExpired ? 'EXPIRED' : undefined),
        expiresAt: d.expires_at,
        isOpenBounty: status === 'open',
        proofUrl: proof,
      };
    });

    // Open bounties - available to anyone
    const openDefaults: Card[] = [
      {
        id: 'open-1',
        shortId: 'open-1',
        dare: 'CHUG A COKE (NO BURP)',
        bounty: 50,
        streamer: 'OPEN TO ALL',
        streamerImage: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800',
        emoji: '🥤',
        status: 'open',
        timeRemaining: 'OPEN BOUNTY',
        isOpenBounty: true,
        proofUrl: undefined,
      },
      {
        id: 'open-2',
        shortId: 'open-2',
        dare: 'EAT A CHEESEBURGER IN 1 BITE',
        bounty: 150,
        streamer: 'OPEN TO ALL',
        streamerImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800',
        emoji: '🍔',
        status: 'open',
        timeRemaining: 'OPEN BOUNTY',
        isOpenBounty: true,
        proofUrl: undefined,
      },
    ];

    // Locked/Restricted bounties - require Genesis Pass
    const locked: Card[] = [
      {
        id: 'locked-1',
        shortId: 'locked-1',
        dare: 'SHAVE HEAD LIVE',
        bounty: 0,
        streamer: '???',
        streamerImage: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800',
        emoji: '🔒',
        status: 'restricted' as const,
        timeRemaining: 'LOCKED',
        isOpenBounty: false,
        proofUrl: undefined,
      },
      {
        id: 'locked-2',
        shortId: 'locked-2',
        dare: 'TATTOO LOGO ON FACE',
        bounty: 0,
        streamer: '???',
        streamerImage: 'https://images.unsplash.com/photo-1562962230-16bc46364924?auto=format&fit=crop&w=800',
        emoji: '🔒',
        status: 'restricted' as const,
        timeRemaining: 'LOCKED',
        isOpenBounty: false,
        proofUrl: undefined,
      },
    ];

    return [...liveTargetCards, ...mapped, ...openDefaults, ...locked];
  }, [dares]);

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cards.filter((card) => {
      const matchesSearch =
        q.length === 0 ||
        card.dare.toLowerCase().includes(q) ||
        (card.streamer ? card.streamer.toLowerCase().includes(q) : false);

      if (!matchesSearch) return false;
      if (filter === 'ALL') return true;
      if (filter === 'STREAMERS') return Boolean(card.streamer && card.streamer.trim().length > 0);
      if (filter === 'OPEN BOUNTIES') return card.status === 'open';
      if (filter === 'LOCKED') return card.status === 'restricted';
      return true;
    });
  }, [cards, filter, searchQuery]);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="premium-filter-row flex flex-wrap items-center justify-between w-full max-w-[1400px] mb-12 px-6 gap-4">
        <div className="flex gap-1.5 p-1.5 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl">
          {FILTERS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                triggerLoading();
                setFilter(cat);
              }}
              className={`px-5 py-2.5 rounded-xl font-mono text-[9px] tracking-[0.2em] uppercase transition-all duration-300 ${
                filter === cat
                  ? 'bg-[#FACC15]/90 text-black font-black shadow-[0_0_20px_rgba(250,204,21,0.3)]'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="premium-search relative group min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-[#FACC15] transition-colors" />
          <input
            type="text"
            placeholder="SEARCH TARGET OR DARE..."
            value={searchQuery}
            onChange={(e) => {
              triggerLoading();
              setSearchQuery(e.target.value);
            }}
            className="premium-search-input w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-12 pr-4 text-[10px] font-mono tracking-widest text-white placeholder:text-white/30 focus:outline-none focus:border-[#FACC15]/40 focus:bg-white/[0.05] transition-all backdrop-blur-2xl"
          />
        </div>
      </div>

      <div className="premium-bento-grid">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SentinelSkeleton key={i} />)
          : filteredCards.map((card) => (
              <PremiumDareCard
                key={card.id}
                id={card.id}
                shortId={card.shortId}
                dare={card.dare}
                bounty={card.bounty}
                streamer={card.streamer}
                streamerImage={card.streamerImage}
                emoji={card.emoji}
                status={card.status}
                timeRemaining={card.timeRemaining}
                expiresAt={card.expiresAt}
                isOpenBounty={card.isOpenBounty}
                proofUrl={card.proofUrl}
                onViewProof={(url) => setProofUrl(url)}
              />
            ))}
      </div>

      {proofUrl ? <ProofViewer videoUrl={proofUrl} onClose={() => setProofUrl(null)} /> : null}
    </div>
  );
}
