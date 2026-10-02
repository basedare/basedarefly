"use client";

import { useEffect, useRef, useState } from "react";
import { useVisualActivity } from "@/hooks/useVisualActivity";

/** Original mobile orb, with one visible-only video and cheap compositor motion. */
export default function PeeBearOrb() {
  const { ref, active } = useVisualActivity(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [roaring, setRoaring] = useState(false);
  useEffect(() => {
    if (!active) return;
    let end: ReturnType<typeof setTimeout>;
    const roar = () => {
      setRoaring(true);
      end = setTimeout(() => setRoaring(false), 1500);
    };
    const first = setTimeout(roar, 4500);
    const repeat = setInterval(roar, 12000);
    return () => {
      clearTimeout(first);
      clearTimeout(end);
      clearInterval(repeat);
      setRoaring(false);
    };
  }, [active]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active && !roaring)
      void video.play().catch(() => {
        /* Poster remains visible if autoplay is blocked. */
      });
    else video.pause();
    return () => video.pause();
  }, [active, roaring]);
  return (
    <div
      ref={ref}
      className="peebear-orb relative flex h-[220px] w-[220px] items-center justify-center"
      data-roaring={active && roaring}
      data-moving={active}
    >
      <div
        className="absolute -inset-5 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.2),transparent_70%)]"
        aria-hidden="true"
      />
      <div className="peebear-orb-float relative h-full w-full">
        <div
          className="peebear-orb-art relative h-full w-full overflow-hidden rounded-full"
          role="img"
          aria-label="PeeBear in a golden orb"
        >
          {/* Circular clipping removes the black corners in both original assets. */}
          <video
            ref={videoRef}
            src={active ? "/assets/OrbLiquidLoop.mp4" : undefined}
            poster="/assets/OrbLiquid.webp"
            muted
            loop
            playsInline
            preload="none"
            width={220}
            height={220}
            aria-hidden="true"
            className="peebear-orb-calm absolute inset-0 h-full w-full object-cover"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/BurstingOrb.webp"
            alt=""
            width={220}
            height={220}
            decoding="async"
            className="peebear-orb-roar absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>
      <style jsx>{`
        .peebear-orb-art {
          clip-path: circle(49.6% at 50% 50%);
          transition: transform 0.4s ease;
        }
        .peebear-orb-art img,
        .peebear-orb-art video {
          transition: opacity 0.35s ease;
        }
        .peebear-orb-roar {
          opacity: 0;
        }
        [data-roaring="true"] .peebear-orb-art {
          transform: scale(1.045);
        }
        [data-roaring="true"] .peebear-orb-calm {
          opacity: 0;
        }
        [data-roaring="true"] .peebear-orb-roar {
          opacity: 1;
        }
        .peebear-orb-float {
          animation: orb-float 5s ease-in-out infinite;
          animation-play-state: paused;
        }
        [data-moving="true"] .peebear-orb-float {
          animation-play-state: running;
        }
        @keyframes orb-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .peebear-orb-art,
          .peebear-orb-art img,
          .peebear-orb-art video {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
