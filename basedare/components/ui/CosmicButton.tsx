'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import './CosmicButton.css';

type CosmicButtonVariant = 'gold' | 'blue' | 'purple';
type CosmicButtonSize = 'sm' | 'md' | 'lg' | 'xl';

type SharedProps = {
  children: React.ReactNode;
  className?: string;
  variant?: CosmicButtonVariant;
  size?: CosmicButtonSize;
  fullWidth?: boolean;
};

type CosmicButtonAsButton = SharedProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type CosmicButtonAsLink = SharedProps &
  Omit<React.ComponentProps<typeof Link>, 'href' | 'className' | 'children'> & {
    href: string;
  };

type CosmicButtonProps = CosmicButtonAsButton | CosmicButtonAsLink;

const HUE_BY_VARIANT: Record<CosmicButtonVariant, number> = {
  gold: 42,
  blue: 214,
  purple: 282,
};

export default function CosmicButton(props: CosmicButtonProps) {
  const {
    children,
    className,
    variant = 'gold',
    size = 'md',
    fullWidth = false,
    ...rest
  } = props;

  const [over, setOver] = React.useState(false);

  React.useEffect(() => {
    let stop: number | undefined;
    const start = window.setTimeout(() => {
      setOver(true);
      stop = window.setTimeout(() => setOver(false), 2200);
    }, 450);

    return () => {
      window.clearTimeout(start);
      if (stop) window.clearTimeout(stop);
    };
  }, []);

  const sharedClassName = cn(
    'sparkle-button',
    `sparkle-button--variant-${variant}`,
    `sparkle-button--${size}`,
    fullWidth && 'sparkle-button--full',
    variant !== 'gold' && over && 'sparkle-button--over',
    className
  );

  const style = {
    '--sparkle-hue': HUE_BY_VARIANT[variant],
  } as React.CSSProperties;

  const innerContent = (
    <span className="sparkle-button__label">
      <span>{children}</span>
    </span>
  );

  if ('href' in props && props.href) {
    const { href, ...linkProps } = rest as Omit<CosmicButtonAsLink, keyof SharedProps>;
    const isExternal = /^(https?:)?\/\//.test(href);

    if (isExternal) {
      return (
        <a href={href} className={sharedClassName} style={style} {...linkProps}>
          {innerContent}
        </a>
      );
    }

    return (
      <Link href={href} className={sharedClassName} style={style} {...linkProps}>
        {innerContent}
      </Link>
    );
  }

  const buttonProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button
      type={buttonProps.type ?? 'button'}
      {...buttonProps}
      className={sharedClassName}
      style={style}
    >
      {innerContent}
    </button>
  );
}
