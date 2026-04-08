'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Clock, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ElectricBorder from './ElectricBorder';
import DareVisual from './DareVisual';
import ShareComposerButton from '@/components/ShareComposerButton';
import SentinelBadge from '@/components/SentinelBadge';
import './PremiumDareCard.css';

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
  requireSentinel?: boolean;
  sentinelVerified?: boolean;
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
  requireSentinel = false,
  sentinelVerified = false,
}: PremiumDareCardProps) {
  const router = useRouter();
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isDesktop, setIsDesktop] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isRealDare = !shortId.startsWith('open-') && !shortId.startsWith('live-') && !shortId.startsWith('locked-');
  const isExpired = status === 'expired';
  const isRestricted = status === 'restricted';

  useEffect(() => {
    if (!expiresAt || isExpired || status === 'completed' || isRestricted) {
      return;
    }
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, status, isExpired, isRestricted]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const apply = () => setIsDesktop(mediaQuery.matches);
    apply();
    mediaQuery.addEventListener('change', apply);
    return () => mediaQuery.removeEventListener('change', apply);
  }, []);

  const liveTimeRemaining = useMemo(() => {
    if (!expiresAt || isExpired || status === 'completed' || isRestricted) {
      return timeRemaining || '';
    }

    const diff = new Date(expiresAt).getTime() - nowMs;
    return formatTimeRemaining(diff);
  }, [expiresAt, isExpired, isRestricted, nowMs, status, timeRemaining]);

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
    <ElectricBorder
      active={Boolean(isDesktop && isHovered && !isExpired)}
      color="#a855f7"
      speed={0.72}
      chaos={0.045}
      borderRadius={20}
      className="premium-dare-electric-wrap"
    >
    <motion.div
      className={`dare-card group select-none ${isExpired ? 'dare-card--expired' : ''}`}
      onClick={handleCardClick}
      whileHover={isRealDare ? { scale: 1.01 } : undefined}
      transition={{ duration: 0.18 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
            <ShareComposerButton
              title={dare}
              bounty={bounty}
              streamerTag={streamer}
              shortId={shortId}
              placeName={locationLabel}
              status="live"
              compact
              className="pointer-events-none opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100"
            />
          </div>
        </div>

        {/* Dare title */}
        <div className="dare-card-body">
          <h3 className="dare-title">{dare.toUpperCase()}</h3>
          <div className="mt-2">
            <SentinelBadge
              requireSentinel={requireSentinel}
              sentinelVerified={sentinelVerified}
            />
          </div>
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
    </ElectricBorder>
  );
}
