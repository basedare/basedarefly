'use client';

import { useEffect, useState } from 'react';
import { useVisualActivity } from '@/hooks/useVisualActivity';

/** Keep the original two-stage artwork without a mobile video decoder or canvas. */
export default function PeeBearOrb() {
  const { ref, active } = useVisualActivity();
  const [roaring, setRoaring] = useState(false);
  useEffect(() => {
    if (!active) return;
    let end: ReturnType<typeof setTimeout>;
    const roar = () => {
      setRoaring(true);
      end = setTimeout(() => setRoaring(false), 1500);
    };
    const first = setTimeout(roar, 6000);
    const repeat = setInterval(roar, 18000);
    return () => { clearTimeout(first); clearTimeout(end); clearInterval(repeat); setRoaring(false); };
  }, [active]);
  return (
    <div ref={ref} className="peebear-orb relative flex h-[220px] w-[220px] items-center justify-center" data-roaring={active && roaring} data-moving={active}>
      <div className="absolute -inset-5 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.2),transparent_70%)]" aria-hidden="true" />
      <div className="peebear-orb-art relative h-full w-full overflow-hidden rounded-full" role="img" aria-label="PeeBear in a golden orb">
        {/* Circular clipping removes the black corners in both original assets. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/OrbLiquid.webp" alt="" width={220} height={220} decoding="async" className="peebear-orb-calm absolute inset-0 h-full w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/BurstingOrb.webp" alt="" width={220} height={220} decoding="async" className="peebear-orb-roar absolute inset-0 h-full w-full object-cover" />
      </div>
      <style jsx>{`
        .peebear-orb-art { clip-path: circle(49.6% at 50% 50%); transition: transform .4s ease; }
        .peebear-orb-art img { transition: opacity .35s ease; }
        .peebear-orb-roar { opacity: 0; }
        [data-roaring='true'] .peebear-orb-art { transform: scale(1.045); }
        [data-roaring='true'] .peebear-orb-calm { opacity: 0; }
        [data-roaring='true'] .peebear-orb-roar { opacity: 1; }
        @media (prefers-reduced-motion: reduce) { .peebear-orb-art, .peebear-orb-art img { transition: none; } }
      `}</style>
    </div>
  );
}
