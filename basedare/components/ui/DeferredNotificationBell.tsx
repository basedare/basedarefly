'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAccount } from 'wagmi';

import {
  getClientPerformanceHints,
  runAfterFirstInteraction,
  runAfterPageIdle,
} from '@/lib/client-performance';

const DeferredBell = dynamic(
  () => import('@/components/ui/NotificationBell').then((module) => module.NotificationBell),
  {
    ssr: false,
    loading: () => <NotificationBellShell busy />,
  }
);

function NotificationBellShell({
  busy = false,
  onClick,
}: {
  busy?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-full border border-white/10 bg-white/5 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.22)] transition-colors hover:bg-white/10"
      aria-label={busy ? 'Loading notifications' : 'Open notifications'}
      aria-busy={busy}
    >
      <Bell className="h-5 w-5 text-gray-300" />
    </button>
  );
}

export function DeferredNotificationBell() {
  const { address } = useAccount();
  const [shouldLoad, setShouldLoad] = useState(false);
  const [openOnLoad, setOpenOnLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return undefined;

    const hints = getClientPerformanceHints();
    const load = () => setShouldLoad(true);
    const cancelInteraction = runAfterFirstInteraction(load);
    const cancelIdle =
      hints.saveData || hints.isLowMemory
        ? () => {}
        : runAfterPageIdle(load, hints.isMobileViewport ? 3400 : 1500);

    return () => {
      cancelInteraction();
      cancelIdle();
    };
  }, [shouldLoad]);

  if (shouldLoad) {
    return <DeferredBell defaultOpen={openOnLoad} />;
  }

  if (!address) {
    return null;
  }

  return (
    <NotificationBellShell
      onClick={() => {
        setOpenOnLoad(true);
        setShouldLoad(true);
      }}
    />
  );
}
