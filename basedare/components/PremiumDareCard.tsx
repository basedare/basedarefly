'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, MapPin } from 'lucide-react';
import DareVisual from './DareVisual';
import ElectricBorder from './ElectricBorder';
import BountyQRCode from './BountyQRCode';
import './PremiumDareCard.css';

function shareDareOnX(dare: string, bounty: number, streamer: string, shortId: string, e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://basedare.xyz';
  const dareUrl = `${baseUrl}/dare/${shortId}`;

  const text = `🎯 $${bounty.toLocaleString()} USDC bounty on @${streamer.replace('@', '')}

"${dare}"

Add to the pot 👇

#BaseDare #Base`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(dareUrl)}`;
  window.open(twitterUrl, '_blank', 'width=550,height=420');
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
  // Nearby dare props
  isNearby?: boolean;
  distanceDisplay?: string;
  locationLabel?: string | null;
};

export function SentinelSkeleton() {
  return (
    <div className="premium-dare-card premium-dare-card--skeleton">
      <div className="shimmer-sweep" />
      <div className="p-6 h-full flex flex-col justify-between">
        <div className="flex justify-between">
          <div className="w-12 h-4 bg-white/10 rounded animate-pulse" />
          <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="w-3/4 h-6 bg-white/10 rounded animate-pulse" />
          <div className="w-1/2 h-3 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Helper to format time remaining
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'EXPIRED';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s left`;
  } else {
    return `${seconds}s left`;
  }
}

export default function PremiumDareCard({
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
  const [isHovered, setIsHovered] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [livenessLeft, setLivenessLeft] = useState(livenessLeftSeconds ?? 3600);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [liveTimeRemaining, setLiveTimeRemaining] = useState(timeRemaining || '');

  // Handle click to flip card
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped((prev) => !prev);
  };

  // Live countdown timer based on expiresAt
  useEffect(() => {
    if (!expiresAt || status === 'expired' || status === 'completed' || status === 'restricted') {
      setLiveTimeRemaining(timeRemaining || '');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;
      setLiveTimeRemaining(formatTimeRemaining(diff));
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(intervalId);
  }, [expiresAt, status, timeRemaining]);

  useEffect(() => {
    if (status !== 'pending_verification') return;
    setLivenessLeft(livenessLeftSeconds ?? 3600);
    const id = window.setInterval(() => {
      setLivenessLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [livenessLeftSeconds, status]);

  useEffect(() => {
    if (status !== 'pending_verification') setIsAuditOpen(false);
  }, [status]);

  if (status === 'restricted') {
    return (
      <motion.div
        className="premium-dare-card premium-dare-card--restricted"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <div className="premium-restricted-content">
          <div className="premium-restricted-icon">👑</div>
          <h3 className="premium-restricted-title">RESTRICTED</h3>
          <button className="premium-genesis-button" type="button">
            MINT GENESIS PASS
          </button>
        </div>
      </motion.div>
    );
  }

  const statusBadge =
    status === 'live' ? (
      <div className="premium-status-badge premium-status-badge--live">
        <span className="premium-status-dot" />
        LIVE
      </div>
    ) : status === 'expired' ? (
      <div className="premium-status-badge premium-status-badge--expired">EXPIRED</div>
    ) : null;

  const actionButton =
    status === 'completed' && proofUrl ? (
      <button
        className="premium-action-button premium-action-button--proof"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onViewProof?.(proofUrl);
        }}
      >
        VIEW PROOF 👁️
      </button>
    ) :
    status === 'expired' ? (
      <button className="premium-action-button premium-action-button--expired" disabled type="button">
        STEAL BOUNTY
      </button>
    ) : status === 'live' || isOpenBounty ? (
      <button
        className="premium-action-button premium-action-button--active"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsFlipped(true);
        }}
      >
        {isOpenBounty ? 'ADD TO POT' : 'ADD TO POT'}
      </button>
    ) : null;

  return (
    <div
      className="premium-card-flip-container"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`premium-card-flip-inner ${isFlipped ? 'flipped' : ''}`}>
        {/* FRONT OF CARD */}
        <ElectricBorder
          active={isHovered && !isFlipped}
          color="#8B5CF6"
          borderRadius={24}
          chaos={0.15}
          speed={1.2}
          className="premium-card-front"
        >
          <motion.div
            className={`premium-dare-card group ${status === 'expired' ? 'premium-dare-card--expired' : ''}`}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
      <div className="premium-card-background" aria-hidden="true">
        <DareVisual
          imageUrl={streamerImage}
          streamerName={streamer}
          type={isOpenBounty ? 'open' : streamer && streamer.trim().length > 0 ? 'streamer' : 'unknown'}
        />
        <div className="premium-card-background-overlay" />
      </div>

      {statusBadge}

      <div className="premium-emoji-badge">{emoji}</div>

      {/* Share Button */}
      <button
        onClick={(e) => shareDareOnX(dare, bounty, streamer, shortId, e)}
        className="absolute top-4 left-4 z-20 p-2 bg-black/60 hover:bg-black/80 border border-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
        title="Share on X"
        type="button"
      >
        <Share2 className="w-4 h-4 text-white" />
      </button>

      <div className="premium-card-content">
        <div className="premium-card-header">
          <div className="premium-streamer-tag">
            <span className="premium-streamer-prefix">@</span>
            {(streamer && streamer.trim().length > 0 ? streamer : 'OPEN').toUpperCase()}
          </div>
          {isOpenBounty ? <div className="premium-open-badge">OPEN TO ALL</div> : null}
          {isNearby && distanceDisplay && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
              <MapPin className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">
                {distanceDisplay}
              </span>
            </div>
          )}
        </div>
        {isNearby && locationLabel && (
          <div className="text-[10px] text-gray-400 font-mono truncate mt-1">
            {locationLabel}
          </div>
        )}

        <div className="premium-card-body">
          <h3 className="premium-dare-title">{dare.toUpperCase()}</h3>
        </div>

        <div className="premium-card-footer">
          <div className="premium-card-footer-row">
            <div className="premium-bounty-display">
              <span className="premium-bounty-amount">{bounty.toLocaleString()}</span>
              <span className="premium-bounty-currency">USDC</span>
            </div>

            {liveTimeRemaining ? <div className="premium-time-remaining">{liveTimeRemaining}</div> : null}
          </div>

          {status === 'expired' ? <div className="premium-expired-tag">EXPIRED. EXPIRED</div> : null}
          {isOpenBounty ? <div className="premium-open-bounty-tag">OPEN BOUNTY. REMAINING</div> : null}
        </div>
      </div>

      {actionButton}

      {isHovered ? <div className="premium-card-shine" /> : null}

      {status === 'pending_verification' ? (
        <>
          <div className="absolute top-4 right-4 z-30 group translate-y-14">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAuditOpen((v) => !v);
              }}
              onBlur={() => setIsAuditOpen(false)}
              className="flex items-center gap-2 bg-yellow-500/15 border border-yellow-500/40 px-2.5 py-1 rounded-full backdrop-blur-md shadow-[0_0_12px_rgba(234,179,8,0.2)] transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(234,179,8,0.4)]"
            >
              <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_#eab308]" />
              <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-widest font-medium">AUDIT</span>
            </button>

            <div
              className={`absolute top-full right-0 mt-2 ${
                isAuditOpen ? 'block' : 'hidden'
              } group-hover:block group-active:block group-focus-within:block w-64 p-3 bg-[#0f0f1a]/95 border border-yellow-500/30 rounded-lg backdrop-blur-xl shadow-xl text-xs font-mono text-yellow-200 z-40`}
            >
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium">Beta AI Referee Audit</p>
                <span className="px-1 py-0.5 bg-yellow-500/20 border border-yellow-500/40 rounded text-[7px] text-yellow-400">BETA</span>
              </div>
              <p className="mt-1 opacity-80">
                ~{Math.max(0, Math.floor(livenessLeft / 60))}m {livenessLeft % 60}s remaining
              </p>
              <p className="mt-2 text-[9px] opacity-60">Proof under mock verification. Full ZKML coming soon.</p>
            </div>
          </div>
          <div className="absolute inset-0 rounded-3xl border-2 border-yellow-500/20 pointer-events-none animate-pulse-slow opacity-60" />
        </>
      ) : null}

      {status === 'completed' ? (
        <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-1 translate-y-14">
          <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/50 px-2 py-1 rounded-md backdrop-blur-md">
            <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-[10px] font-mono text-emerald-400 uppercase">VERIFIED</span>
          </div>
          <span className="text-[7px] font-mono text-yellow-400/60 uppercase tracking-wider px-1">Beta AI Referee</span>
        </div>
      ) : null}

      {/* Click hint */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-mono text-white/20 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
        Click for QR
      </div>
    </motion.div>
        </ElectricBorder>

        {/* BACK OF CARD - QR Code */}
        <div className="premium-card-back premium-dare-card">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#12121a] to-[#0a0a0f]" />
          <div className="relative z-10 h-full w-full flex flex-col items-center justify-center p-3 sm:p-4">
            <div className="text-[8px] sm:text-[9px] font-mono text-white/40 uppercase tracking-widest mb-2">
              Scan to Pledge
            </div>
            <BountyQRCode
              shortId={shortId}
              bountyAmount={bounty}
              dareTitle={dare}
              size={80}
              compact={true}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped(false);
              }}
              className="mt-2 text-[8px] sm:text-[9px] font-mono text-purple-400 hover:text-purple-300 uppercase tracking-wider transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
