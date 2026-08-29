'use client';

import { useEffect } from 'react';

import type { AttendancePlanType } from '@/lib/live-plan-retention';

export default function LivePlanInviteTracker({ planType, planId, venueId }: {
  planType: AttendancePlanType;
  planId: string;
  venueId?: string | null;
}) {
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).get('invite')) return;
    const storageKey = `basedare-live-plan-invite:${planType}:${planId}`;
    let clientEventId = '';
    try {
      clientEventId = window.sessionStorage.getItem(storageKey) ?? '';
      if (!clientEventId) {
        clientEventId = window.crypto.randomUUID();
        window.sessionStorage.setItem(storageKey, clientEventId);
      }
    } catch {
      clientEventId = window.crypto.randomUUID();
    }
    void fetch('/api/live-plans/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'INVITE_OPENED', planType, planId, venueId: venueId ?? null, clientEventId }),
      keepalive: true,
    }).catch(() => undefined);
  }, [planId, planType, venueId]);

  return null;
}
