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
};

type PremiumBentoGridProps = {
  dares: Dare[];
  onDareClick?: (dareId: string) => void;
};

const STREAMER_IMAGES: Record<string, string> = {
  kaicenat: '/assets/KAICENAT.jpeg',
  'kai cenat': '/assets/KAICENAT.jpeg',
  adinross: '/assets/adinross.png',
  'adin ross': '/assets/adinross.png',
  ishowspeed: '/assets/Ishowspeed.jpg',
  '1showspeed': '/assets/Ishowspeed.jpg',
  speed: '/assets/Ishowspeed.jpg',
};

const DARE_EMOJIS: Record<string, string> = {
  reaper: '🌶️',
  pepper: '🌶️',
  spicy: '🌶️',
  hot: '🌶️',
  skydiving: '☂️',
  skydive: '☂️',
  jump: '☂️',
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
};

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

export default function PremiumBentoGrid({ dares, onDareClick }: PremiumBentoGridProps) {
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
      dare: string;
      bounty: number;
      streamer: string;
      streamerImage?: string;
      emoji: string;
      status: PremiumDareCardStatus;
      timeRemaining?: string;
      isOpenBounty: boolean;
      proofUrl?: string;
  };

  const cards = useMemo<Card[]>(() => {
    const mapped = dares.map((d) => {
      const normalizedStatus = normalizeStatus(d.status);

      const streamerName = d.streamer_name || '';
      const streamerImage = getStreamerImage(streamerName) || d.image_url;
      const proof = d.video_url;
      const status: PremiumDareCardStatus =
        normalizedStatus === 'live' && streamerName.trim().length === 0 ? 'open' : normalizedStatus;

      return {
        id: d.id,
        dare: d.description,
        bounty: d.stake_amount,
        streamer: streamerName,
        streamerImage,
        emoji: getDareEmoji(d.description),
        status,
        timeRemaining: status === 'live' ? '02:00h left REMAINING' : undefined,
        isOpenBounty: status === 'open',
        proofUrl: proof,
      };
    });

    const openDefaults: Card[] = [
      {
        id: 'open-1',
        dare: 'CHUG A COKE (NO BURP)',
        bounty: 50,
        streamer: '',
        streamerImage: undefined,
        emoji: getDareEmoji('CHUG A COKE (NO BURP)'),
        status: 'open',
        timeRemaining: undefined,
        isOpenBounty: true,
        proofUrl: undefined,
      },
      {
        id: 'open-2',
        dare: 'EAT A CHEESEBURGER IN 1 BITE',
        bounty: 150,
        streamer: '',
        streamerImage: undefined,
        emoji: getDareEmoji('EAT A CHEESEBURGER IN 1 BITE'),
        status: 'open',
        timeRemaining: undefined,
        isOpenBounty: true,
        proofUrl: undefined,
      },
    ];

    const locked: Card[] = [
      {
        id: 'locked-1',
        dare: 'RESTRICTED',
        bounty: 0,
        streamer: '',
        streamerImage: undefined as string | undefined,
        emoji: '👑',
        status: 'restricted' as const,
        timeRemaining: undefined as string | undefined,
        isOpenBounty: false,
        proofUrl: undefined,
      },
      {
        id: 'locked-2',
        dare: 'RESTRICTED',
        bounty: 0,
        streamer: '',
        streamerImage: undefined as string | undefined,
        emoji: '👑',
        status: 'restricted' as const,
        timeRemaining: undefined as string | undefined,
        isOpenBounty: false,
        proofUrl: undefined,
      },
    ];

    return [...mapped, ...openDefaults, ...locked];
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
        <div className="flex gap-2 p-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full">
          {FILTERS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                triggerLoading();
                setFilter(cat);
              }}
              className={`px-5 py-2 rounded-full font-mono text-[9px] tracking-[0.2em] transition-all ${
                filter === cat
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]'
                  : 'text-white/30 hover:text-white/60 uppercase'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="premium-search relative group min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-purple-400 transition-colors" />
          <input
            type="text"
            placeholder="SEARCH TARGET OR DARE..."
            value={searchQuery}
            onChange={(e) => {
              triggerLoading();
              setSearchQuery(e.target.value);
            }}
            className="premium-search-input w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-[10px] font-mono tracking-widest text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all backdrop-blur-md"
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
                dare={card.dare}
                bounty={card.bounty}
                streamer={card.streamer}
                streamerImage={card.streamerImage}
                emoji={card.emoji}
                status={card.status}
                timeRemaining={card.timeRemaining}
                isOpenBounty={card.isOpenBounty}
                proofUrl={card.proofUrl}
                onViewProof={(url) => setProofUrl(url)}
                onClick={() => onDareClick?.(card.id)}
              />
            ))}
      </div>

      {proofUrl ? <ProofViewer videoUrl={proofUrl} onClose={() => setProofUrl(null)} /> : null}
    </div>
  );
}
