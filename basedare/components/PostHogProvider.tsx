'use client';

import posthog from 'posthog-js';
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
    let url = window.origin + pathname;
    const query = searchParams?.toString();
    if (query) url += `?${query}`;
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
      capture_pageleave: true,
      person_profiles: 'identified_only',
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
