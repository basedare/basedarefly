'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Share2, Clock, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DareVisual from './DareVisual';
import './PremiumDareCard.css';

function shareDareOnX(dare: string, bounty: number, streamer: string, shortId: string, e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://basedare.xyz';
  const dareUrl = `${baseUrl}/dare/${shortId}`;
  const text = `🎯 $${bounty.toLocaleString()} USDC bounty on @${streamer.replace('@', '')}\n\n"${dare}"\n\nAdd to the pot 👇\n\n#BaseDare #Base`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(dareUrl)}`;
  window.open(twitterUrl, '_blank', 'width=550,height=420');
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'EXPIRED';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

export type PremiumDareCardStatus =
  | 'live'
  | 'expired'
  | 'restricted'
  | 'open'
  | 'completed'
  | 'pending_verification';

export type PremiumDareCardProps = {
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
  livenessLeftSeconds?: number;
  proofUrl?: string;
  isOpenBounty?: boolean;
  onViewProof?: (proofUrl: string) => void;
  isNearby?: boolean;
  distanceDisplay?: string;
  locationLabel?: string | null;
};

export function SentinelSkeleton() {
  return (
    <div className="dare-card-skeleton">
      <div className="shimmer-sweep" />
      <div className="dare-card-skeleton-img" />
      <div className="dare-card-skeleton-body">
        <div className="dare-card-skeleton-line w-16" />
        <div className="dare-card-skeleton-line w-3/4 h-5" />
        <div className="dare-card-skeleton-line w-1/2" />
      </div>
    </div>
  );
}

export default function PremiumDareCard({
  id,
  shortId,
  dare,
  bounty,
  streamer,
  streamerImage,
  emoji,
  status,
  timeRemaining,
  expiresAt,
  livenessLeftSeconds,
  proofUrl,
  isOpenBounty = false,
  onViewProof,
  isNearby = false,
  distanceDisplay,
  locationLabel,
}: PremiumDareCardProps) {
  const router = useRouter();
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [liveTimeRemaining, setLiveTimeRemaining] = useState(timeRemaining || '');

  const isRealDare = !shortId.startsWith('open-') && !shortId.startsWith('live-') && !shortId.startsWith('locked-');
  const isExpired = status === 'expired';
  const isRestricted = status === 'restricted';

  // Live countdown
  useEffect(() => {
    if (!expiresAt || isExpired || status === 'completed' || isRestricted) {
      setLiveTimeRemaining(timeRemaining || '');
      return;
    }
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setLiveTimeRemaining(formatTimeRemaining(diff));
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, status, timeRemaining, isExpired, isRestricted]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(prev => !prev);
    setLikeCount(prev => prev + (liked ? -1 : 1));
  };

  const handleCardClick = () => {
    if (isRealDare) {
      router.push(`/dare/${shortId}`);
    }
  };

  // === RESTRICTED CARD ===
  if (isRestricted) {
    return (
      <motion.div
        className="dare-card dare-card--restricted"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <div className="dare-card-restricted-inner">
          <div className="text-3xl">👑</div>
          <h3 className="text-sm font-black italic text-white/80">RESTRICTED</h3>
          <button className="dare-card-genesis-btn" type="button">MINT GENESIS PASS</button>
        </div>
      </motion.div>
    );
  }

  // Status pill color
  const statusConfig = {
    live: { label: 'LIVE', dot: true, cls: 'dare-status-live' },
    open: { label: 'OPEN', dot: false, cls: 'dare-status-open' },
    expired: { label: 'EXPIRED', dot: false, cls: 'dare-status-expired' },
    completed: { label: 'VERIFIED', dot: false, cls: 'dare-status-verified' },
    pending_verification: { label: 'AUDIT', dot: true, cls: 'dare-status-audit' },
    restricted: { label: 'LOCKED', dot: false, cls: 'dare-status-expired' },
  };
  const sc = statusConfig[status];

  const displayStreamer = streamer && streamer.trim().length > 0 && streamer !== 'OPEN TO ALL'
    ? streamer.startsWith('@') ? streamer : `@${streamer}`
    : null;

  return (
    <motion.div
      className={`dare-card ${isExpired ? 'dare-card--expired' : ''}`}
      onClick={handleCardClick}
      whileHover={isRealDare ? { scale: 1.01 } : undefined}
      transition={{ duration: 0.18 }}
    >
      {/* Background image */}
      <div className="dare-card-bg" aria-hidden="true">
        <DareVisual
          imageUrl={streamerImage}
          streamerName={streamer}
          type={isOpenBounty ? 'open' : displayStreamer ? 'streamer' : 'unknown'}
        />
        <div className="dare-card-bg-overlay" />
      </div>

      {/* Content layer */}
      <div className="dare-card-content">

        {/* Top row: status + emoji + share */}
        <div className="dare-card-top-row">
          <div className={`dare-status-pill ${sc.cls}`}>
            {sc.dot && <span className="dare-status-dot" />}
            {sc.label}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xl" aria-hidden="true">{emoji}</span>
            <button
              onClick={(e) => shareDareOnX(dare, bounty, streamer, shortId, e)}
              className="p-1.5 bg-black/50 hover:bg-black/70 border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              title="Share on X"
              type="button"
            >
              <Share2 className="w-3 h-3 text-white/70" />
            </button>
          </div>
        </div>

        {/* Dare title */}
        <div className="dare-card-body">
          <h3 className="dare-title">{dare.toUpperCase()}</h3>
        </div>

        {/* Bottom section */}
        <div className="dare-card-footer">
          {/* Streamer / Dared-by row */}
          <div className="dare-card-meta-row">
            {displayStreamer ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/creator/${displayStreamer.replace('@', '')}`);
                }}
                className="dare-target-tag"
              >
                <span className="dare-target-prefix">TARGET</span>
                <span className="dare-target-handle">{displayStreamer}</span>
              </button>
            ) : isOpenBounty ? (
              <span className="dare-open-tag">OPEN TO ALL</span>
            ) : null}

            {isNearby && distanceDisplay && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-mono text-blue-400">{distanceDisplay}</span>
              </div>
            )}
          </div>

          {/* Bounty + timer + likes */}
          <div className="dare-card-amounts-row">
            {/* Bounty - prominent green badge */}
            <div className="dare-bounty-badge">
              <span className="dare-bounty-amount">{bounty.toLocaleString()}</span>
              <span className="dare-bounty-currency">USDC</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Countdown timer */}
              {liveTimeRemaining && !isExpired && (
                <div className="flex items-center gap-1 text-white/50">
                  <Clock className="w-3 h-3" />
                  <span className="dare-timer">{liveTimeRemaining}</span>
                </div>
              )}
              {isExpired && <span className="dare-expired-text">EXPIRED</span>}

              {/* Likes */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-1 transition-colors ${liked ? 'text-red-400' : 'text-white/40 hover:text-red-400'}`}
                type="button"
                aria-label="Like"
              >
                <Heart className={`w-3.5 h-3.5 transition-transform ${liked ? 'fill-red-400 scale-110' : ''}`} />
                <span className="text-[10px] font-mono">{likeCount}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hover shimmer */}
      <div className="dare-card-shimmer group-hover:opacity-100 opacity-0 transition-opacity" aria-hidden="true" />
    </motion.div>
  );
}
