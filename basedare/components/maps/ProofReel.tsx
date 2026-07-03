'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

// Structurally matches RealWorldMap's PlaceTagItem so the map can pass its
// loaded tags straight through. Kept local so this surface stays decoupled.
export type ProofReelItem = {
  id: string;
  creatorTag: string | null;
  walletAddress: string;
  caption: string | null;
  vibeTags: string[];
  proofMediaUrl: string;
  proofType: string;
  source?: string | null;
  firstMark: boolean;
  submittedAt: string;
};

const IMAGE_DURATION_MS = 5000;

function hasPlayableMedia(item: ProofReelItem) {
  return Boolean(item.proofMediaUrl) && /^(https?:\/\/|\/)/.test(item.proofMediaUrl);
}

function timeAgoLabel(submittedAt: string) {
  const diffMs = Date.now() - new Date(submittedAt).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return '';
  const minutes = Math.max(1, Math.round(diffMs / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function ProofReel({
  venueName,
  venueHandle,
  items,
  onClose,
}: {
  venueName: string;
  venueHandle?: string | null;
  items: ProofReelItem[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const pointerStartRef = useRef<{ x: number; time: number } | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const item = items[index] ?? null;
  const playableMedia = item ? hasPlayableMedia(item) : false;
  const isVideo = playableMedia && item?.proofType === 'VIDEO';

  const goNext = useCallback(() => {
    setProgress(0);
    setIndex((current) => {
      if (current + 1 >= items.length) {
        onClose();
        return current;
      }
      return current + 1;
    });
  }, [items.length, onClose]);

  const goPrev = useCallback(() => {
    setProgress(0);
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  // Images (and media-less proof stamps) advance on a fixed timer.
  useEffect(() => {
    if (!item || isVideo) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.min(1, elapsed / IMAGE_DURATION_MS));
      if (elapsed >= IMAGE_DURATION_MS) {
        window.clearInterval(timer);
        goNext();
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [item, isVideo, goNext]);

  // Escape / arrow keys + background scroll lock while the reel is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [goNext, goPrev, onClose]);

  if (!item) return null;

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 z-[130] flex flex-col bg-black/95 backdrop-blur-sm"
      role="dialog"
      aria-label={`Verified proof reel for ${venueName}`}
      onPointerDown={(event) => {
        pointerStartRef.current = { x: event.clientX, time: Date.now() };
      }}
      onPointerUp={(event) => {
        const start = pointerStartRef.current;
        pointerStartRef.current = null;
        if (!start) return;
        const dx = event.clientX - start.x;
        if (dx <= -40) return goNext();
        if (dx >= 40) return goPrev();
        const width = shellRef.current?.clientWidth ?? window.innerWidth;
        if (event.clientX > width * 0.35) goNext();
        else goPrev();
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/85 to-transparent px-4 pb-10 pt-3">
        <div className="flex items-center gap-1">
          {items.map((segment, segmentIndex) => (
            <span key={segment.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/18">
              <span
                className="block h-full rounded-full bg-[#f8dd72]"
                style={{
                  width:
                    segmentIndex < index ? '100%' : segmentIndex === index ? `${Math.round(progress * 100)}%` : '0%',
                }}
              />
            </span>
          ))}
        </div>
        <div className="pointer-events-auto mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-black leading-tight text-white">{venueName}</p>
            {venueHandle ? (
              <p className="mt-0.5 truncate text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/60">
                @{venueHandle}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-[#f5c518]/40 bg-[#f5c518]/[0.12] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#f8dd72]">
              Verified proof
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/14 bg-white/[0.07] text-white/75 transition hover:text-white"
              aria-label="Close proof reel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex-1">
        {isVideo ? (
          <video
            key={item.id}
            src={item.proofMediaUrl}
            className="absolute inset-0 h-full w-full object-contain"
            autoPlay
            muted
            playsInline
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              if (video.duration > 0) setProgress(Math.min(1, video.currentTime / video.duration));
            }}
            onEnded={goNext}
          />
        ) : playableMedia ? (
          <Image
            key={item.id}
            src={item.proofMediaUrl}
            alt={item.caption || 'Verified proof'}
            fill
            sizes="100vw"
            className="object-contain"
            unoptimized
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-44 w-44 overflow-hidden rounded-[22px] border border-[#f5c518]/25 bg-[linear-gradient(180deg,rgba(245,197,24,0.16)_0%,rgba(14,12,20,0.96)_100%)]">
              <Image
                src="/assets/peebear-head.webp"
                alt="BaseDare verified proof stamp"
                fill
                sizes="176px"
                className="object-contain p-4"
                unoptimized
              />
            </div>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 to-transparent px-4 pb-5 pt-12">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-black text-white">
            {item.creatorTag ? `@${item.creatorTag}` : `${item.walletAddress.slice(0, 6)}...${item.walletAddress.slice(-4)}`}
          </p>
          {item.firstMark ? (
            <span className="shrink-0 rounded-full border border-[#f5c518]/35 bg-[#f5c518]/[0.12] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#f8dd72]">
              First proof
            </span>
          ) : null}
          <span className="ml-auto shrink-0 text-[10px] uppercase tracking-[0.16em] text-white/45">
            {timeAgoLabel(item.submittedAt)}
          </span>
        </div>
        {item.caption ? <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-white/78">{item.caption}</p> : null}
        {item.vibeTags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.vibeTags.slice(0, 3).map((vibeTag) => (
              <span
                key={vibeTag}
                className="rounded-full border border-white/12 bg-white/[0.05] px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-white/55"
              >
                {vibeTag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
