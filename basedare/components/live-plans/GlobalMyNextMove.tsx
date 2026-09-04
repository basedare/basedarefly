'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { CreatorMissionTray, type CreatorMissionTrayItem } from '@/components/creator-entry/CreatorMissionTray';
import MyNextMoveTray from '@/components/live-plans/MyNextMoveTray';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import type { LivePlanSnapshot } from '@/lib/live-plans';

const SIARGAO_QUERY = 'lat=9.803&lng=126.159&radiusKm=25&horizonHours=168&limit=100';

function isVisibleRoute(pathname: string) {
  return pathname === '/map' || pathname === '/board' || pathname === '/now' || pathname === '/dashboard' || pathname.startsWith('/earn');
}

function isCreatorMissionItem(value: unknown): value is CreatorMissionTrayItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    item.role === 'creator' &&
    typeof item.title === 'string' &&
    typeof item.href === 'string' &&
    ['Needs response', 'Ready for proof', 'Under review', 'Payout queued'].includes(String(item.category))
  );
}

export default function GlobalMyNextMove() {
  const pathname = usePathname();
  const { address } = useActiveWallet();
  const [snapshot, setSnapshot] = useState<LivePlanSnapshot | null>(null);
  const [creatorMission, setCreatorMission] = useState<CreatorMissionTrayItem | null>(null);
  const visible = isVisibleRoute(pathname);

  const load = useCallback(async () => {
    if (!visible) return;
    try {
      const [plansResponse, workResponse] = await Promise.all([
        fetch(`/api/live-plans?${SIARGAO_QUERY}`, { cache: 'no-store' }),
        address
          ? fetch(`/api/action-center?wallet=${encodeURIComponent(address)}`, { cache: 'no-store' })
          : Promise.resolve(null),
      ]);
      const plansPayload = await plansResponse.json().catch(() => null);
      if (plansResponse.ok && plansPayload?.success && plansPayload.data) {
        setSnapshot(plansPayload.data as LivePlanSnapshot);
      }

      if (workResponse) {
        const workPayload = await workResponse.json().catch(() => null);
        const nextMission = workResponse.ok && workPayload?.success
          ? (workPayload.data?.items as unknown[] | undefined)?.find(isCreatorMissionItem) ?? null
          : null;
        setCreatorMission(nextMission);
      } else {
        setCreatorMission(null);
      }
    } catch {
      // The tray is progressive enhancement. Page navigation must remain usable if it cannot refresh.
    }
  }, [address, visible]);

  useEffect(() => {
    if (!visible) return;
    const initialLoad = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 60_000);
    const refresh = () => void load();
    window.addEventListener('basedare:live-plans-updated', refresh);
    window.addEventListener('basedare:mission-updated', refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener('basedare:live-plans-updated', refresh);
      window.removeEventListener('basedare:mission-updated', refresh);
    };
  }, [load, visible]);

  if (!visible || pathname.startsWith('/earn/')) return null;
  const className = pathname === '/map' ? 'bottom-16 sm:bottom-3' : '';
  if (creatorMission) {
    return (
      <CreatorMissionTray
        item={creatorMission}
        className={className}
        variant={pathname === '/map' ? 'map' : 'default'}
      />
    );
  }
  return pathname === '/dashboard' ? null : <MyNextMoveTray plans={snapshot?.myNextMoves ?? []} className={className} />;
}
