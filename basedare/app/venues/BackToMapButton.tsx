'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function BackToMapButton({ mapHref }: { mapHref: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined') {
          const referrer = document.referrer;
          const hasHistory = window.history.length > 1;
          const cameFromMap = referrer.includes('/map');

          if (hasHistory && cameFromMap) {
            router.back();
            return;
          }
        }

        router.push(mapHref);
      }}
      aria-label="Back to map"
      className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(8,8,16,0.92)_100%)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72 shadow-[0_14px_28px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-10px_14px_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:border-cyan-300/35 hover:text-cyan-100"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to map
    </button>
  );
}
