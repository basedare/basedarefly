'use client';

import posthog from 'posthog-js';
import { analyticsPath } from '@/lib/analytics-privacy';
import { Suspense, useEffect, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Analytics sink. Initializes PostHog in the browser ONLY when
 * NEXT_PUBLIC_POSTHOG_KEY is set — otherwise it stays a no-op (same env-gated
 * pattern as walletConnect / paymaster in Providers.tsx), so the app is safe to
 * ship before the key exists in Vercel.
 *
 * Once live, every existing trackClientEvent() across the app (incl. the
 * proof_shared share events) starts flowing here.
 */

// App Router does client-side navigation, so PostHog's auto pageview only fires
// on first load — capture the rest manually on route change.
function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !posthog.__loaded) return;
    const url = window.origin + analyticsPath(pathname);
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export default function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      capture_pageview: false, // handled manually for the App Router
      capture_pageleave: false,
      person_profiles: 'identified_only',
      autocapture: false,
      disable_session_recording: true,
      before_send: (event) => {
        if (event?.properties) {
          event.properties.$current_url = window.origin + analyticsPath(window.location.pathname);
          event.properties.$pathname = analyticsPath(window.location.pathname);
          delete event.properties.$referrer;
          delete event.properties.$initial_referrer;
          delete event.properties.$initial_current_url;
          for (const key of ['$set', '$set_once']) {
            const values = event.properties[key];
            if (values && typeof values === 'object') {
              delete values.$initial_current_url;
              delete values.$initial_referrer;
              delete values.$referrer;
              delete values.$current_url;
            }
          }
        }
        return event;
      },
    });
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </>
  );
}
