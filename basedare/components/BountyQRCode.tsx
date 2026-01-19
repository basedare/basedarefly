'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

interface BountyQRCodeProps {
  shortId: string;
  bountyAmount: number;
  dareTitle: string;
  size?: number;
}

export default function BountyQRCode({
  shortId,
  bountyAmount,
  dareTitle,
  size = 180,
}: BountyQRCodeProps) {
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${baseUrl}/dare/${shortId}`;

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
        // User cancelled or share failed, fallback to copy
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code with PeeBear logo */}
      <div className="relative bg-white p-3 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.3)]">
        <QRCodeSVG
          value={shareUrl}
          size={size}
          level="H"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#0a0a0a"
          imageSettings={{
            src: '/assets/peebear-head.png',
            height: size * 0.25,
            width: size * 0.25,
            excavate: true,
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
        <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2">
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
      <button
        onClick={handleShare}
        className="w-full max-w-[220px] py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
      >
        Share Bounty
      </button>
    </div>
  );
}
