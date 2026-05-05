'use client';

import { useEffect } from 'react';

import { trackActivationFunnelEvent } from '@/lib/activation-funnel-client';

export default function ActivationFunnelTracker() {
  useEffect(() => {
    const pageKey = `basedare:activation-page-view:${window.location.pathname}${window.location.search}`;

    let shouldTrackPageView = true;
    try {
      shouldTrackPageView = !window.sessionStorage.getItem(pageKey);
      if (shouldTrackPageView) window.sessionStorage.setItem(pageKey, '1');
    } catch {
      shouldTrackPageView = true;
    }

    if (shouldTrackPageView) {
      void trackActivationFunnelEvent({
        eventType: 'ACTIVATION_PAGE_VIEW',
        channel: 'activations-page',
      });
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const tracked = target.closest<HTMLElement>('[data-activation-track]');
      if (!tracked) return;

      void trackActivationFunnelEvent({
        eventType: 'ACTIVATION_CTA_CLICK',
        target: tracked.dataset.activationTrack || tracked.textContent?.trim() || 'activation-cta',
        channel: tracked.dataset.activationChannel || 'activations-page',
        metadata: {
          href: tracked instanceof HTMLAnchorElement ? tracked.href : tracked.getAttribute('href'),
        },
      });
    };

    window.addEventListener('click', onClick, { capture: true });
    return () => window.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
