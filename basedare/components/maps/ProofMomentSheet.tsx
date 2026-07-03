'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

/**
 * The post-check-in moment: one screen, three jobs.
 * Value delivery (your venue-sealed receipt), retention (streak tick +
 * crossed-paths tease), and the ad engine (share sheet). Replaces the old
 * ceremony toast for APPROVED proofs.
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
  const [streakDays, setStreakDays] = useState<number | null>(null);
  const [crossedCount, setCrossedCount] = useState<number | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');

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

  const shareUrl = venueSlug
    ? `https://www.basedare.xyz/venues/${venueSlug}`
    : 'https://www.basedare.xyz/map';
  const shareText = `Verified at ${venueName} — proof on the map. #HumanOnly`;

  const handleShare = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'BaseDare receipt', text: shareText, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 1600);
    } catch {
      // User dismissed the share sheet — nothing to clean up.
    }
  };

  const timeLabel = new Date(submittedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div
      className="fixed inset-0 z-[135] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-label={`Verified proof receipt for ${venueName}`}
    >
      <div className="relative w-full max-w-sm rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(10,10,18,0.97)_30%,rgba(5,5,12,0.99)_100%)] p-5 shadow-[0_32px_90px_rgba(0,0,0,0.6),0_0_40px_rgba(245,197,24,0.12)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white/70 transition hover:text-white"
          aria-label="Close receipt"
        >
          <X className="h-4 w-4" />
        </button>

        {/* the receipt */}
        <div className="mx-auto mt-2 w-full rounded-[22px] border border-[#f5c518]/45 bg-[linear-gradient(180deg,rgba(245,197,24,0.14)_0%,rgba(12,10,6,0.95)_55%,rgba(6,5,10,0.98)_100%)] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_0_0_5px_rgba(5,5,12,0.9),inset_0_0_0_7px_rgba(245,197,24,0.3)]">
          <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-[16px] border border-[#f5c518]/30 bg-black/40">
            <Image
              src="/assets/peebear-head.webp"
              alt="PeeBear verified stamp"
              fill
              sizes="64px"
              className="object-contain p-1.5"
              unoptimized
            />
          </div>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#f8dd72]/85">Verified at</p>
          <p className="mt-1 text-xl font-black leading-tight text-white">{venueName}</p>
          {venueHandle ? (
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/55">@{venueHandle}</p>
          ) : null}
          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
            <span>{creatorTag ? `@${creatorTag.replace(/^@/, '')}` : 'Your proof'}</span>
            <span aria-hidden="true">·</span>
            <span>{timeLabel}</span>
          </div>
          {firstMark ? (
            <span className="mt-2 inline-block rounded-full border border-[#f5c518]/45 bg-[#f5c518]/[0.14] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#f8dd72]">
              ⚡ First proof — this spot is yours
            </span>
          ) : null}
          <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.24em] text-white/35">✓ #HumanOnly · on the map forever</p>
        </div>

        {/* streak + crossed paths */}
        <div className="mt-4 space-y-2">
          <div className="rounded-[16px] border border-white/8 bg-black/25 px-3.5 py-2.5 text-sm text-white/78">
            {streakDays !== null && streakDays >= 2 ? (
              <span className="font-bold text-[#f8dd72]">🔥 {streakDays}-day streak — keep it alive tomorrow.</span>
            ) : (
              <span>🔥 Night one logged. Check in tomorrow to start a streak.</span>
            )}
          </div>
          {crossedCount !== null && crossedCount > 0 ? (
            <div className="rounded-[16px] border border-cyan-300/18 bg-cyan-500/[0.07] px-3.5 py-2.5 text-sm text-cyan-50/90">
              👋 <span className="font-bold">{crossedCount}</span> {crossedCount === 1 ? 'person has' : 'people have'} verifiably
              crossed your path here — find them in the venue panel and wave.
            </div>
          ) : null}
        </div>

        {/* actions */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="w-full rounded-full border border-[#ffe87a]/70 bg-[linear-gradient(180deg,#ffe36a_0%,#f5c518_55%,#8a5a00_100%)] px-4 py-3 text-sm font-black uppercase tracking-[0.1em] text-[#15120c] shadow-[0_10px_22px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.6)] transition hover:-translate-y-[1px]"
          >
            {shareState === 'copied' ? 'Link copied ✓' : 'Share the receipt'}
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
