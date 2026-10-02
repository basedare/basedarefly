'use client';

import { useFundingRecovery } from '@/hooks/useFundingRecovery';
import { useDiscovery } from '@/components/DiscoveryProvider';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CreatorMissionTray, type CreatorMissionTrayItem } from '@/components/creator-entry/CreatorMissionTray';
import MyNextMoveTray from '@/components/live-plans/MyNextMoveTray';
import AdventureTray from '@/components/adventures/AdventureTray';
import { useAdventureProgress } from '@/hooks/useAdventureProgress';
import { activeAdventure } from '@/lib/adventure-progress';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import type { LivePlanSnapshot } from '@/lib/live-plans';
import { normalizeWorldPulseCenter, normalizeWorldPulseRadius } from '@/lib/world-pulse';



function isVisibleRoute(pathname: string) {
  return pathname === '/map' || pathname === '/board' || pathname === '/now' || pathname === '/community' || pathname === '/dashboard' || pathname.startsWith('/earn');
}

function isCreatorMissionItem(value: unknown): value is CreatorMissionTrayItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    item.role === 'creator' &&
    item.isSimulated !== true &&
    !(item.expiresAt && Date.parse(String(item.expiresAt)) < Date.now() && ['Requested', 'Confirmed', 'Awaiting your answer'].includes(String(item.statusLabel))) &&
    typeof item.title === 'string' &&
    typeof item.href === 'string' &&
    ['Needs response', 'Ready for proof', 'Under review', 'Payout queued'].includes(String(item.category))
  );
}

export default function GlobalMyNextMove() {
  const pathname = usePathname();
  const { area } = useDiscovery();
  const { address } = useActiveWallet();
  useFundingRecovery(address);
  const { progress } = useAdventureProgress();
  const [snapshot, setSnapshot] = useState<LivePlanSnapshot | null>(null);
  const [creatorMission, setCreatorMission] = useState<CreatorMissionTrayItem | null>(null);
  const visible = isVisibleRoute(pathname);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    if (!visible || document.hidden) return;
    const version = ++requestVersion.current;
    try {
      let planQuery = new URLSearchParams({ lat: String(area.lat), lng: String(area.lng), radiusKm: String(area.radiusKm), horizonHours: "168", limit: "100" }).toString();
      if (pathname === '/now') {
        const params = new URLSearchParams(window.location.search);
        const center = normalizeWorldPulseCenter(params.get('lat') ?? undefined, params.get('lng') ?? undefined);
        planQuery = new URLSearchParams({ lat: String(center.latitude), lng: String(center.longitude), radiusKm: String(normalizeWorldPulseRadius(params.get('radiusKm') ?? undefined)), horizonHours: '72', limit: '60' }).toString();
      }
      const [plansResponse, workResponse] = await Promise.all([
        fetch(`/api/live-plans?${planQuery}`, { cache: 'no-store' }),
        address
          ? fetch(`/api/action-center?wallet=${encodeURIComponent(address)}`, { cache: 'no-store' })
          : Promise.resolve(null),
      ]);
      const plansPayload = await plansResponse.json().catch(() => null);
      if (version !== requestVersion.current) return;
      if (plansResponse.ok && plansPayload?.success && plansPayload.data) {
        setSnapshot(plansPayload.data as LivePlanSnapshot);
      }

      if (workResponse) {
        const workPayload = await workResponse.json().catch(() => null);
        if (version !== requestVersion.current) return;
        const nextMission = workResponse.ok && workPayload?.success
          ? (workPayload.data?.items as unknown[] | undefined)?.find(isCreatorMissionItem) ?? null
          : null;
        setCreatorMission(nextMission);
      } else {
        setCreatorMission(null);
      }
    } catch {
      if (version === requestVersion.current) setCreatorMission(null);
      // The tray is progressive enhancement. Page navigation must remain usable if it cannot refresh.
    }
  }, [address, visible, pathname, area.lat, area.lng, area.radiusKm]);

  useEffect(() => {
    if (!visible) return;
    const initialLoad = window.setTimeout(() => { setCreatorMission(null); void load(); }, 0);
    const interval = window.setInterval(() => void load(), 60_000);
    const refresh = () => void load();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('basedare:live-plans-updated', refresh);
    window.addEventListener('basedare:mission-updated', refresh);
    window.addEventListener('basedare:plan-area-updated', refresh);
    return () => {
      requestVersion.current += 1;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener('basedare:live-plans-updated', refresh);
      window.removeEventListener('basedare:mission-updated', refresh);
      window.removeEventListener('basedare:plan-area-updated', refresh);
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
  if (activeAdventure(progress)) return <AdventureTray className={className} />;
  return pathname === '/dashboard' ? null : <MyNextMoveTray plans={snapshot?.myNextMoves ?? []} className={className} />;
}
