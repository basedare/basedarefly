'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import CosmicButton from '@/components/ui/CosmicButton';
import { useDiscovery } from '@/components/DiscoveryProvider';
import { trackClientEvent } from '@/lib/analytics';
import { analyticsPath } from '@/lib/analytics-privacy';
import { discoveryHref } from '@/lib/discovery-context';

type CosmicOption = {
  variant?: 'gold' | 'blue' | 'purple';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
};

type OnboardingLinkProps = {
  href: string;
  intent: 'explore' | 'join' | 'create' | 'profile' | 'learn' | 'earn';
  placement: 'hero' | 'path-card';
  className?: string;
  children: ReactNode;
  preserveDiscovery?: boolean;
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
  preserveDiscovery = false,
}: OnboardingLinkProps) {
  const { area, hasArea } = useDiscovery();
  const destination = preserveDiscovery ? discoveryHref(href, area, hasArea) : href;
  const track = () => {
    trackClientEvent('consumer_onboarding_path_selected', {
      intent,
      placement,
      destination: analyticsPath(destination),
    });
  };

  if (cosmic) {
    return (
      <CosmicButton
        href={destination}
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
    <Link href={destination} className={className} onClick={track}>
      {children}
    </Link>
  );
}
