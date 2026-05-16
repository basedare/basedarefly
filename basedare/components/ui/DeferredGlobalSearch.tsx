'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import { getClientPerformanceHints, runAfterPageIdle } from '@/lib/client-performance';

const DeferredSearch = dynamic(
  () => import('@/components/ui/GlobalSearch').then((module) => module.GlobalSearch),
  {
    ssr: false,
    loading: () => <GlobalSearchShell busy />,
  }
);

function GlobalSearchShell({
  busy = false,
  onOpen,
}: {
  busy?: boolean;
  onOpen?: () => void;
}) {
  return (
    <div className="relative z-[100] flex w-full justify-end">
      <div className="relative flex h-[50px] w-10 items-center justify-end">
        <button
          type="button"
          onClick={onOpen}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/35 text-gray-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.25)] backdrop-blur-md transition hover:bg-white/10 hover:text-white"
          aria-label={busy ? 'Loading search' : 'Open search'}
          aria-busy={busy}
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function DeferredGlobalSearch({ isDesktopApp = false }: { isDesktopApp?: boolean }) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [openOnLoad, setOpenOnLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return undefined;

    const hints = getClientPerformanceHints();
    if (hints.saveData || hints.isLowMemory) {
      return undefined;
    }

    return runAfterPageIdle(() => setShouldLoad(true), hints.isMobileViewport ? 3600 : 1800);
  }, [shouldLoad]);

  useEffect(() => {
    if (shouldLoad) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpenOnLoad(true);
        setShouldLoad(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shouldLoad]);

  if (shouldLoad) {
    return <DeferredSearch defaultOpen={openOnLoad} isDesktopApp={isDesktopApp} />;
  }

  return (
    <GlobalSearchShell
      onOpen={() => {
        setOpenOnLoad(true);
        setShouldLoad(true);
      }}
    />
  );
}
