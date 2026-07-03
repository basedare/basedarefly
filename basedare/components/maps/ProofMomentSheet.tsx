'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { drawProofReceipt, PROOF_RECEIPT_H, PROOF_RECEIPT_W } from '@/lib/proof-receipt';
import { trackClientEvent } from '@/lib/analytics';

/**
 * The post-check-in moment: one screen, three jobs.
 * Value delivery (a thermal-statement Proof Receipt, rendered to a real PNG),
 * retention (streak tick + crossed-paths tease), and the ad engine (the
 * receipt image travels through the native share sheet — Stories, WhatsApp,
 * iMessage — with a referral link riding in the share text).
 */
export default function ProofMomentSheet({
  venueName,
  venueSlug,
  venueHandle,
  creatorTag,
  walletAddress,
  firstMark,
  submittedAt,
  onClose,
}: {
  venueName: string;
  venueSlug: string | null;
  venueHandle?: string | null;
  creatorTag: string | null;
  walletAddress?: string | null;
  firstMark: boolean;
  submittedAt: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streakDays, setStreakDays] = useState<number | null>(null);
  const [crossedCount, setCrossedCount] = useState<number | null>(null);
  const [bearImage, setBearImage] = useState<HTMLImageElement | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'shared' | 'saved'>('idle');

  // PeeBear stamp for the receipt (decoration — receipt renders without it).
  useEffect(() => {
    const image = new window.Image();
    image.onload = () => setBearImage(image);
    image.src = '/assets/peebear-head.webp';
  }, []);

  // Streak tick — verified-only, computed server-side on the passport.
  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/creators/passport?wallet=${walletAddress}`, { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled && payload?.success && typeof payload.data?.streakDays === 'number') {
          setStreakDays(payload.data.streakDays);
        }
      } catch {
        // The moment stands on its own without the streak line.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  // Crossed-paths tease — who verifiably shared this venue with you.
  useEffect(() => {
    if (!venueSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/venues/${encodeURIComponent(venueSlug)}/crossed-paths`, {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled && payload?.success && typeof payload.data?.count === 'number') {
          setCrossedCount(payload.data.count);
        }
      } catch {
        // Silent — tease only shows when the data is there.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [venueSlug]);

  // Render (and re-render as the streak/crossed rows arrive).
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawProofReceipt(ctx, {
      venueName,
      venueHandle,
      creatorTag,
      submittedAt,
      firstMark,
      streakDays,
      crossedCount,
      bearImage,
    });
  }, [venueName, venueHandle, creatorTag, submittedAt, firstMark, streakDays, crossedCount, bearImage]);

  // Escape closes; background scroll locks while open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Referral rides the share text: ?by=@tag credits the sharer once the
  // claim-side wiring lands. Harmless today, meaningful tomorrow.
  const referral = creatorTag ? `?by=${encodeURIComponent(creatorTag.replace(/^@/, ''))}` : '';
  const shareUrl = venueSlug
    ? `https://www.basedare.xyz/venues/${venueSlug}${referral}`
    : `https://www.basedare.xyz/map${referral}`;
  const shareText = `Verified at ${venueName} — proof of presence. #HumanOnly ${shareUrl}`;

  const handleShare = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Analytics only — no PII beyond the venue slug and a referral boolean.
    const shareAnalytics = { source: 'proof_moment_sheet', venueSlug, hasReferral: Boolean(creatorTag) };
    trackClientEvent('proof_shared', { ...shareAnalytics, method: 'native_file_attempt' });
    canvas.toBlob((blob) => {
      if (!blob) {
        trackClientEvent('proof_shared', { ...shareAnalytics, method: 'render', status: 'failed' });
        return;
      }
      const file = new File([blob], 'basedare-proof-receipt.png', { type: 'image/png' });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        nav
          .share({ files: [file], title: 'BaseDare receipt', text: shareText })
          .then(() => {
            trackClientEvent('proof_shared', { ...shareAnalytics, method: 'native_file', status: 'success' });
            setShareState('shared');
          })
          .catch(() => {
            // Cancelled or failed — indistinguishable on the web, logged as one.
            trackClientEvent('proof_shared', { ...shareAnalytics, method: 'native_file', status: 'failed' });
          });
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'basedare-proof-receipt.png';
      anchor.click();
      URL.revokeObjectURL(url);
      void navigator.clipboard?.writeText(shareText).catch(() => {});
      trackClientEvent('proof_shared', { ...shareAnalytics, method: 'download', status: 'fallback_saved' });
      setShareState('saved');
      window.setTimeout(() => setShareState('idle'), 2200);
    }, 'image/png');
  };

  return (
    <div
      className="fixed inset-0 z-[135] flex flex-col items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-label={`Verified proof receipt for ${venueName}`}
    >
      <div className="relative flex w-full max-w-sm flex-col items-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-1 -top-1 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/14 bg-black/70 text-white/70 transition hover:text-white"
          aria-label="Close receipt"
        >
          <X className="h-4 w-4" />
        </button>

        <canvas
          ref={canvasRef}
          width={PROOF_RECEIPT_W}
          height={PROOF_RECEIPT_H}
          className="rounded-2xl"
          style={{
            width: 'min(78vw, 310px)',
            maxHeight: '56vh',
            objectFit: 'contain',
            boxShadow: '0 0 44px rgba(245,197,24,0.28), 0 24px 60px rgba(0,0,0,0.6)',
          }}
          aria-label="Your BaseDare proof receipt"
        />

        {crossedCount !== null && crossedCount > 0 ? (
          <p className="mt-3 w-full rounded-[14px] border border-cyan-300/18 bg-cyan-500/[0.08] px-3 py-2 text-center text-[12px] leading-snug text-cyan-50/90">
            👋 {crossedCount} {crossedCount === 1 ? 'person' : 'people'} verifiably crossed your path here — find
            them in the venue panel and wave.
          </p>
        ) : (
          <p className="mt-3 text-center text-[11px] text-white/45">
            {streakDays !== null && streakDays >= 2
              ? `🔥 ${streakDays}-day streak — keep it alive tomorrow.`
              : '🔥 Night one logged. Check in tomorrow to start a streak.'}
          </p>
        )}

        <div className="mt-4 flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="w-full rounded-full border border-[#ffe87a]/70 bg-[linear-gradient(180deg,#ffe36a_0%,#f5c518_55%,#8a5a00_100%)] px-4 py-3.5 text-sm font-black uppercase tracking-[0.12em] text-[#15120c] shadow-[0_10px_22px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.6)] transition hover:-translate-y-[1px]"
          >
            {shareState === 'shared' ? 'Shared ✓' : shareState === 'saved' ? 'Saved to device ✓' : '⇪ Share the receipt'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/65 transition hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
