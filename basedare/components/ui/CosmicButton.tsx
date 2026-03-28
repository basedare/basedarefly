'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import './CosmicButton.css';

let mobileAnimationOwner: symbol | null = null;

type CosmicButtonVariant = 'gold' | 'blue';
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

type Star = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  twinkle: number;
};

type Sparkle = {
  x: number;
  y: number;
  life: number;
  maxLife: number;
};

function createStars(width: number, height: number): Star[] {
  const count = Math.max(26, Math.floor((width * height) / 180));
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.15 + 0.25,
    opacity: Math.random() * 0.55 + 0.18,
    speed: Math.random() * 0.16 + 0.025,
    twinkle: Math.random() * Math.PI * 2,
  }));
}

export default function CosmicButton(props: CosmicButtonProps) {
  const {
    children,
    className,
    variant = 'gold',
    size = 'md',
    fullWidth = false,
    ...rest
  } = props;

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const hoverRef = React.useRef(false);
  const reduceMotionRef = React.useRef(false);
  const visibleRef = React.useRef(false);
  const instanceIdRef = React.useRef(Symbol('cosmic-button'));

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotionRef.current = media.matches;
    const updateMotion = () => {
      reduceMotionRef.current = media.matches;
    };
    media.addEventListener?.('change', updateMotion);
    return () => media.removeEventListener?.('change', updateMotion);
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;
    let animationFrame = 0;
    let stars = createStars(canvas.offsetWidth || 180, canvas.offsetHeight || 52);
    let sparkles: Sparkle[] = [];
    let shouldAnimate = false;

    const isMobileViewport = () => window.matchMedia('(max-width: 767px)').matches;

    const releaseMobileOwnership = () => {
      if (mobileAnimationOwner === instanceIdRef.current) {
        mobileAnimationOwner = null;
      }
    };

    const resize = () => {
      const scale = window.devicePixelRatio || 1;
      const width = Math.max(1, canvas.offsetWidth);
      const height = Math.max(1, canvas.offsetHeight);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      stars = createStars(width, height);
      sparkles = [];
    };

    const claimMobileOwnership = () => {
      if (!isMobileViewport()) return true;
      if (mobileAnimationOwner === null || mobileAnimationOwner === instanceIdRef.current) {
        mobileAnimationOwner = instanceIdRef.current;
        return true;
      }
      return false;
    };

    const drawBackground = (width: number, height: number) => {
      const gradient = context.createLinearGradient(0, 0, width, height);
      if (variant === 'blue') {
        gradient.addColorStop(0, 'rgba(7, 18, 34, 0.98)');
        gradient.addColorStop(0.5, 'rgba(8, 14, 28, 0.96)');
        gradient.addColorStop(1, 'rgba(5, 9, 18, 0.98)');
      } else {
        gradient.addColorStop(0, 'rgba(14, 11, 6, 0.98)');
        gradient.addColorStop(0.5, 'rgba(11, 9, 7, 0.96)');
        gradient.addColorStop(1, 'rgba(7, 6, 5, 0.98)');
      }
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      const glow = context.createRadialGradient(
        width * 0.72,
        height * 0.32,
        0,
        width * 0.72,
        height * 0.32,
        width * 0.58,
      );
      if (variant === 'blue') {
        glow.addColorStop(0, hoverRef.current ? 'rgba(59, 167, 255, 0.14)' : 'rgba(59, 167, 255, 0.08)');
        glow.addColorStop(0.48, 'rgba(168, 85, 247, 0.06)');
      } else {
        glow.addColorStop(0, hoverRef.current ? 'rgba(245, 197, 24, 0.15)' : 'rgba(245, 197, 24, 0.08)');
        glow.addColorStop(0.48, 'rgba(168, 85, 247, 0.07)');
      }
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
    };

    const draw = () => {
      const width = canvas.offsetWidth || 180;
      const height = canvas.offsetHeight || 52;

      context.clearRect(0, 0, width, height);
      drawBackground(width, height);

      frame += 1;

      stars.forEach((star) => {
        star.twinkle += hoverRef.current ? 0.06 : 0.03;
        star.x -= hoverRef.current ? star.speed * 1.25 : star.speed;
        if (star.x < -3) star.x = width + 3;

        const twinkleOpacity = star.opacity * (0.55 + 0.45 * Math.sin(star.twinkle));
        const glow = context.createRadialGradient(
          star.x,
          star.y,
          0,
          star.x,
          star.y,
          star.size * (hoverRef.current ? 5 : 3.2)
        );

        glow.addColorStop(0, variant === 'blue'
          ? `rgba(189, 232, 255, ${twinkleOpacity})`
          : `rgba(255, 234, 170, ${twinkleOpacity})`);
        glow.addColorStop(0.42, variant === 'blue'
          ? `rgba(89, 176, 255, ${twinkleOpacity * 0.34})`
          : `rgba(200, 150, 255, ${twinkleOpacity * 0.26})`);
        glow.addColorStop(1, 'transparent');

        context.beginPath();
        context.arc(star.x, star.y, star.size * (hoverRef.current ? 4.2 : 2.8), 0, Math.PI * 2);
        context.fillStyle = glow;
        context.fill();

        context.beginPath();
        context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        context.fillStyle = variant === 'blue'
          ? `rgba(225, 244, 255, ${twinkleOpacity})`
          : `rgba(255, 243, 214, ${twinkleOpacity})`;
        context.fill();
      });

      const sparkleChance = hoverRef.current ? 0.05 : 0.012;
      if (!reduceMotionRef.current && Math.random() < sparkleChance) {
        sparkles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          life: 0,
          maxLife: hoverRef.current ? 22 : 16,
        });
      }

      sparkles = sparkles.filter((sparkle) => sparkle.life < sparkle.maxLife);
      sparkles.forEach((sparkle) => {
        sparkle.life += 1;
        const progress = sparkle.life / sparkle.maxLife;
        const size = Math.sin(progress * Math.PI) * (hoverRef.current ? 4.8 : 3.2);
        const opacity = Math.sin(progress * Math.PI);

        context.save();
        context.translate(sparkle.x, sparkle.y);
        context.fillStyle = variant === 'blue'
          ? `rgba(145, 218, 255, ${opacity})`
          : `rgba(255, 220, 100, ${opacity})`;

        context.beginPath();
        for (let i = 0; i < 4; i += 1) {
          const angle = (i * Math.PI) / 2;
          context.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
          context.lineTo(
            Math.cos(angle + Math.PI / 4) * (size * 0.28),
            Math.sin(angle + Math.PI / 4) * (size * 0.28)
          );
        }
        context.closePath();
        context.fill();
        context.restore();
      });

      if (shouldAnimate && !reduceMotionRef.current) {
        animationFrame = window.requestAnimationFrame(draw);
      } else if (frame < 2 || hoverRef.current) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    const updateAnimationState = () => {
      if (!visibleRef.current || reduceMotionRef.current) {
        shouldAnimate = false;
        releaseMobileOwnership();
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        frame = 0;
        draw();
        return;
      }

      shouldAnimate = claimMobileOwnership();

      if (shouldAnimate && !animationFrame) {
        draw();
      } else if (!shouldAnimate) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        frame = 0;
        draw();
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        updateAnimationState();
      },
      { threshold: 0.15 }
    );

    resize();
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    updateAnimationState();

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      releaseMobileOwnership();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [variant]);

  const sharedClassName = cn(
    'cosmic-button',
    `cosmic-button--${variant}`,
    `cosmic-button--${size}`,
    fullWidth && 'cosmic-button--full',
    className
  );

  const innerContent = (
    <>
      <canvas ref={canvasRef} className="cosmic-canvas" aria-hidden="true" />
      <div className="cosmic-holo" aria-hidden="true" />
      <span className="cosmic-shell">
        <span className="cosmic-label">{children}</span>
      </span>
    </>
  );

  const hoverHandlers = {
    onMouseEnter: () => {
      hoverRef.current = true;
    },
    onMouseLeave: () => {
      hoverRef.current = false;
    },
  };

  if ('href' in props && props.href) {
    const { href, ...linkProps } = rest as Omit<CosmicButtonAsLink, keyof SharedProps>;
    const isExternal = /^(https?:)?\/\//.test(href);

    if (isExternal) {
      return (
        <a href={href} className={sharedClassName} {...hoverHandlers} {...linkProps}>
          {innerContent}
        </a>
      );
    }

    return (
      <Link href={href} className={sharedClassName} {...hoverHandlers} {...linkProps}>
        {innerContent}
      </Link>
    );
  }

  const buttonProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button
      type={buttonProps.type ?? 'button'}
      {...buttonProps}
      {...hoverHandlers}
      className={sharedClassName}
    >
      {innerContent}
    </button>
  );
}
