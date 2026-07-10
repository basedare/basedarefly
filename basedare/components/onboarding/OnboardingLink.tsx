'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { trackClientEvent } from '@/lib/analytics';

type OnboardingLinkProps = {
  href: string;
  intent: 'explore' | 'join' | 'create' | 'profile' | 'learn';
  placement: 'hero' | 'path-card';
  className: string;
  children: ReactNode;
};

export function OnboardingLink({
  href,
  intent,
  placement,
  className,
  children,
}: OnboardingLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        trackClientEvent('consumer_onboarding_path_selected', {
          intent,
          placement,
          destination: href,
        });
      }}
    >
      {children}
    </Link>
  );
}
