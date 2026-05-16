'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import LivePotPortal from '@/components/LivePotPortal';
import {
  getClientPerformanceHints,
  runAfterFirstInteraction,
  runAfterPageIdle,
} from '@/lib/client-performance';

const LivePotBubble = dynamic(() => import('@/components/LivePotBubble'), {
  ssr: false,
  loading: () => null,
});

export default function DeferredLivePotBubble() {
  const pathname = usePathname();
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (pathname !== '/') {
      return undefined;
    }

    if (shouldLoad) {
      return undefined;
    }

    const hints = getClientPerformanceHints();
    const load = () => setShouldLoad(true);
    const cancelInteraction =
      hints.saveData || hints.isLowMemory ? runAfterFirstInteraction(load) : () => {};
    const cancelIdle =
      hints.saveData || hints.isLowMemory
        ? () => {}
        : runAfterPageIdle(load, hints.isMobileViewport ? 4200 : 1400);

    return () => {
      cancelInteraction();
      cancelIdle();
    };
  }, [pathname, shouldLoad]);

  if (pathname !== '/' || !shouldLoad) {
    return null;
  }

  return (
    <LivePotPortal>
      <LivePotBubble />
    </LivePotPortal>
  );
}
