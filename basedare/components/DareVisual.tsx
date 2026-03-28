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
    if (type === 'open') return 'OPEN BOUNTY';
    const normalized = streamerName?.trim();
    if (normalized) return normalized.toUpperCase();
    return 'REDACTED';
  }, [streamerName, type]);

  if (!imageUrl || hasError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden border border-white/10 backdrop-blur-md bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.22),transparent_42%),radial-gradient(circle_at_80%_20%,rgba(250,204,21,0.14),transparent_45%),linear-gradient(140deg,rgba(11,14,30,0.30),rgba(11,14,30,0.10))]">
        <img
          src="/assets/peebear-head.png"
          loading="lazy"
          decoding="async"
          className="w-32 h-32 object-contain opacity-50 grayscale group-hover:grayscale-0 transition-all duration-500"
          alt="BaseDare Protocol"
        />

        {type === 'open' ? (
          <div className="absolute inset-x-0 top-[24%] flex justify-center px-4">
            <div className="inline-flex max-w-full items-center justify-center rounded-[22px] border border-yellow-400/25 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(91,33,182,0.16)_100%)] px-5 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.34),0_0_24px_rgba(168,85,247,0.14),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-14px_18px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <span className="bg-gradient-to-r from-yellow-300 via-amber-300 to-fuchsia-300 bg-clip-text text-xl font-black uppercase tracking-[0.28em] text-transparent md:text-2xl">
                {label}
              </span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <h3 className="text-4xl md:text-5xl font-black italic text-white/80 tracking-tighter drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]">
              {label}
            </h3>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#eab308]/20 via-transparent to-transparent" />
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
