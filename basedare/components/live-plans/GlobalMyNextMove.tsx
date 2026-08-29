'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import MyNextMoveTray from '@/components/live-plans/MyNextMoveTray';
import type { LivePlanSnapshot } from '@/lib/live-plans';

const VISIBLE_ROUTES = new Set(['/map', '/dashboard', '/board']);
const SIARGAO_QUERY = 'lat=9.803&lng=126.159&radiusKm=25&horizonHours=168&limit=100';

export default function GlobalMyNextMove() {
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<LivePlanSnapshot | null>(null);
  const visible = VISIBLE_ROUTES.has(pathname);

  const load = useCallback(async () => {
    if (!visible) return;
    try {
      const response = await fetch(`/api/live-plans?${SIARGAO_QUERY}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.success && payload.data) setSnapshot(payload.data as LivePlanSnapshot);
    } catch {
      // The tray is progressive enhancement. Page navigation must remain usable if it cannot refresh.
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const initialLoad = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 60_000);
    const refresh = () => void load();
    window.addEventListener('basedare:live-plans-updated', refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener('basedare:live-plans-updated', refresh);
    };
  }, [load, visible]);

  if (!visible) return null;
  return <MyNextMoveTray plans={snapshot?.myNextMoves ?? []} className={pathname === '/map' ? 'bottom-16 sm:bottom-3' : ''} />;
}
