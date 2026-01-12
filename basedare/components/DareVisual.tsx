'use client';

import { useMemo, useState } from 'react';

type DareVisualType = 'streamer' | 'open' | 'unknown';

type DareVisualProps = {
  imageUrl?: string | null;
  streamerName?: string | null;
  type?: DareVisualType;
};

export default function DareVisual({ imageUrl, streamerName, type = 'unknown' }: DareVisualProps) {
  const [hasError, setHasError] = useState(false);

  const label = useMemo(() => {
    if (type === 'open') return 'OPEN_BOUNTY';
    const normalized = streamerName?.trim();
    if (normalized) return normalized.toUpperCase();
    return 'REDACTED';
  }, [streamerName, type]);

  if (!imageUrl || hasError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/80 to-[#0f0f1a] overflow-hidden">
        <img
          src="/assets/peebear-head.png"
          loading="lazy"
          decoding="async"
          className="w-32 h-32 object-contain opacity-40 grayscale group-hover:grayscale-0 transition-all duration-500"
          alt="BaseDare Protocol"
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <h3 className="text-4xl md:text-5xl font-black italic text-white/80 tracking-tighter drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]">
            {label}
          </h3>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#eab308]/40 via-transparent to-transparent" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      onError={() => setHasError(true)}
      alt=""
      loading="lazy"
      decoding="async"
      className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale contrast-110 group-hover:opacity-80 group-hover:grayscale-0 transition-all duration-500"
    />
  );
}
