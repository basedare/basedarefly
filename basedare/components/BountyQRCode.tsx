'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { useAccount } from 'wagmi';

interface BountyQRCodeProps {
  shortId: string;
  bountyAmount: number;
  dareTitle: string;
  size?: number;
  compact?: boolean;
  referrerTag?: string; // Optional explicit referrer tag
}

export default function BountyQRCode({
  shortId,
  bountyAmount,
  dareTitle,
  size = 120,
  compact = false,
  referrerTag,
}: BountyQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const { address } = useAccount();

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  // Include referral parameter if user is connected or explicit tag provided
  const refParam = referrerTag || (address ? `@${address.slice(0, 6)}...${address.slice(-4)}` : '');
  const shareUrl = refParam
    ? `${baseUrl}/dare/${shortId}?ref=${encodeURIComponent(refParam)}`
    : `${baseUrl}/dare/${shortId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `BaseDare: ${dareTitle}`,
          text: `${bountyAmount} USDC bounty - ${dareTitle}`,
          url: shareUrl,
        });
      } catch (err) {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2">
        {/* QR Code with PeeBear logo - compact */}
        <div className="relative bg-white p-2 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.15)]">
          <QRCodeSVG
            value={shareUrl}
            size={size}
            level="H"
            includeMargin
            bgColor="#ffffff"
            fgColor="#0a0a0a"
            imageSettings={{
              src: '/assets/peebear-head.png',
              height: size * 0.28,
              width: size * 0.28,
              excavate: true,
              x: undefined,
              y: undefined,
            }}
          />
        </div>

        {/* Compact bounty badge */}
        <div className="flex items-center gap-1 px-2 py-1 bg-purple-600/20 border border-purple-500/30 rounded-full">
          <span className="text-sm font-bold text-white">{bountyAmount.toLocaleString()}</span>
          <span className="text-[8px] font-mono text-purple-400">USDC</span>
        </div>

        {/* Copy/Share button */}
        <button
          onClick={handleShare}
          className="px-3 py-1.5 bg-purple-600/80 hover:bg-purple-500 text-white font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all"
        >
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code with PeeBear logo */}
      <div className="relative bg-white p-3 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.15)]">
        <QRCodeSVG
          value={shareUrl}
          size={size}
          level="H"
          includeMargin
          bgColor="#ffffff"
          fgColor="#0a0a0a"
          imageSettings={{
            src: '/assets/peebear-head.png',
            height: size * 0.28,
            width: size * 0.28,
            excavate: true,
            x: undefined,
            y: undefined,
          }}
        />
      </div>

      {/* Bounty amount badge */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-yellow-500/20 border border-purple-500/30 rounded-full">
        <span className="text-xl font-black text-white">{bountyAmount.toLocaleString()}</span>
        <span className="text-xs font-mono text-purple-400">USDC</span>
      </div>

      {/* Share URL */}
      <div className="w-full max-w-[220px]">
        <div className="flex items-center gap-2 bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-lg px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <span className="text-[10px] font-mono text-white/60 truncate flex-1">
            /dare/{shortId}
          </span>
          <button
            onClick={handleCopy}
            className="text-[9px] font-mono text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-wider"
          >
            {copied ? 'COPIED!' : 'COPY'}
          </button>
        </div>
      </div>

      {/* Share button */}
      <div className="w-full max-w-[220px] relative group p-[1px] rounded-xl overflow-hidden">
        <div
          className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#1a1a1a_0%,#525252_20%,#a1a1aa_25%,#525252_30%,#1a1a1a_50%,#525252_70%,#a1a1aa_75%,#525252_80%,#1a1a1a_100%)] opacity-60 group-hover:opacity-100 group-hover:animate-[spin_3s_linear_infinite] transition-opacity duration-500"
          aria-hidden="true"
        />
        <button
          onClick={handleShare}
          className="relative w-full py-3 bg-[#0a0a0a] text-white font-bold text-sm uppercase tracking-wider rounded-[11px] transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.08] via-transparent to-white/[0.03] pointer-events-none rounded-[11px]" />
          <span className="relative z-10">Share Bounty</span>
        </button>
      </div>
    </div>
  );
}
