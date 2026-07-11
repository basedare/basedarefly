'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import CosmicButton from '@/components/ui/CosmicButton';
import { trackClientEvent } from '@/lib/analytics';

type CosmicOption = {
  variant?: 'gold' | 'blue' | 'purple';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
};

type OnboardingLinkProps = {
  href: string;
  intent: 'explore' | 'join' | 'create' | 'profile' | 'learn';
  placement: 'hero' | 'path-card';
  className?: string;
  children: ReactNode;
  /** When set, render the shared CosmicButton (keeps the same onboarding tracking). */
  cosmic?: CosmicOption;
};

export function OnboardingLink({
  href,
  intent,
  placement,
  className,
  children,
  cosmic,
}: OnboardingLinkProps) {
  const track = () => {
    trackClientEvent('consumer_onboarding_path_selected', {
      intent,
      placement,
      destination: href,
    });
  };

  if (cosmic) {
    return (
      <CosmicButton
        href={href}
        variant={cosmic.variant ?? 'gold'}
        size={cosmic.size ?? 'lg'}
        fullWidth={cosmic.fullWidth}
        className={className}
        onClick={track}
      >
        {children}
      </CosmicButton>
    );
  }

  return (
    <Link href={href} className={className} onClick={track}>
      {children}
    </Link>
  );
}
