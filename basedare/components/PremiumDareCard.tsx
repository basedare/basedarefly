'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DareVisual from './DareVisual';
import ElectricBorder from './ElectricBorder';
import './PremiumDareCard.css';

export type PremiumDareCardStatus =
  | 'live'
  | 'expired'
  | 'restricted'
  | 'open'
  | 'completed'
  | 'pending_verification';

export type PremiumDareCardProps = {
  id: string;
  dare: string;
  bounty: number;
  streamer: string;
  streamerImage?: string;
  emoji: string;
  status: PremiumDareCardStatus;
  timeRemaining?: string;
  livenessLeftSeconds?: number;
  proofUrl?: string;
  isOpenBounty?: boolean;
  onClick?: () => void;
  onViewProof?: (proofUrl: string) => void;
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

export default function PremiumDareCard({
  dare,
  bounty,
  streamer,
  streamerImage,
  emoji,
  status,
  timeRemaining,
  livenessLeftSeconds,
  proofUrl,
  isOpenBounty = false,
  onClick,
  onViewProof,
}: PremiumDareCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [livenessLeft, setLivenessLeft] = useState(livenessLeftSeconds ?? 3600);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

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
          onClick?.();
        }}
      >
        {isOpenBounty ? 'OPEN BOUNTY' : 'STEAL BOUNTY'}
      </button>
    ) : null;

  return (
    <ElectricBorder
      active={isHovered}
      color="#8B5CF6"
      borderRadius={24}
      chaos={0.15}
      speed={1.2}
    >
      <motion.div
        className={`premium-dare-card group ${status === 'expired' ? 'premium-dare-card--expired' : ''}`}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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

      <div className="premium-card-content">
        <div className="premium-card-header">
          <div className="premium-streamer-tag">
            <span className="premium-streamer-prefix">@</span>
            {(streamer && streamer.trim().length > 0 ? streamer : 'OPEN').toUpperCase()}
          </div>
          {isOpenBounty ? <div className="premium-open-badge">OPEN TO ALL</div> : null}
        </div>

        <div className="premium-card-body">
          <h3 className="premium-dare-title">{dare.toUpperCase()}</h3>
        </div>

        <div className="premium-card-footer">
          <div className="premium-card-footer-row">
            <div className="premium-bounty-display">
              <span className="premium-bounty-amount">{bounty.toLocaleString()}</span>
              <span className="premium-bounty-currency">USDC</span>
            </div>

            {timeRemaining ? <div className="premium-time-remaining">{timeRemaining}</div> : null}
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
              <p className="font-medium">Sentinel Audit in Progress</p>
              <p className="mt-1 opacity-80">
                ~{Math.max(0, Math.floor(livenessLeft / 60))}m {livenessLeft % 60}s remaining
              </p>
              <p className="mt-2 text-[9px] opacity-60">Proof under optimistic review. Dispute possible via UMA.</p>
            </div>
          </div>
          <div className="absolute inset-0 rounded-3xl border-2 border-yellow-500/20 pointer-events-none animate-pulse-slow opacity-60" />
        </>
      ) : null}

      {status === 'completed' ? (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/50 px-2 py-1 rounded-md backdrop-blur-md translate-y-14">
          <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-[10px] font-mono text-emerald-400 uppercase">VERIFIED</span>
        </div>
      ) : null}
    </motion.div>
    </ElectricBorder>
  );
}
