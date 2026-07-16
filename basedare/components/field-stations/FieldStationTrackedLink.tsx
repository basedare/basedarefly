'use client';

import Link from 'next/link';
import { useEffect, type ComponentProps, type ReactNode } from 'react';

type EventType = 'STATION_ENTRY_RENDERED' | 'STATION_ATTENTION_SELECTED' | 'STATION_TARGET_OPENED';

function record(input: {
  eventType: EventType;
  attentionMode?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetHref?: string | null;
  clientRenderMs?: number | null;
}) {
  void fetch('/api/attribution/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    keepalive: true,
  }).catch(() => null);
}

export function FieldStationEntryBeacon({ attentionMode }: { attentionMode?: string | null }) {
  useEffect(() => {
    record({
      eventType: 'STATION_ENTRY_RENDERED',
      attentionMode,
      targetType: 'PAGE',
      targetId: 'board',
      targetHref: window.location.pathname + window.location.search,
      clientRenderMs: Math.max(0, Math.round(performance.now())),
    });
  }, [attentionMode]);
  return null;
}

export function FieldStationTrackedLink({
  eventType,
  attentionMode,
  targetType,
  targetId,
  enabled = true,
  children,
  ...linkProps
}: Omit<ComponentProps<typeof Link>, 'children'> & {
  eventType: Exclude<EventType, 'STATION_ENTRY_RENDERED'>;
  attentionMode?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  enabled?: boolean;
  children: ReactNode;
}) {
  const targetHref = typeof linkProps.href === 'string' ? linkProps.href : linkProps.href.pathname ?? '/map';
  return (
    <Link
      {...linkProps}
      onClick={(event) => {
        linkProps.onClick?.(event);
        if (enabled) record({ eventType, attentionMode, targetType, targetId, targetHref });
      }}
    >
      {children}
    </Link>
  );
}
