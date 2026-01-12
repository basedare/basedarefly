'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './MagicBento.css';

const DEFAULT_GLOW_COLOR = '132, 0, 255';
const DEFAULT_SPOTLIGHT_RADIUS = 200;
const DEFAULT_PARTICLE_COUNT = 14;

type DareLike = {
  id: string;
  description: string;
  stake_amount: number;
  streamer_name?: string;
  status?: string;
};

type MagicBentoCard = {
  id?: string;
  title: string;
  description: string;
  label: string;
  isLive: boolean;
  glowColor: string;
};

type MagicBentoProps = {
  dares?: DareLike[];
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
  onDareClick?: (dareId: string) => void;
};

export default function MagicBento({
  dares = [],
  textAutoHide = true,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
  enableMagnetism = true,
  onDareClick,
}: MagicBentoProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const shouldDisableAnimations = disableAnimations || isMobile;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const displayCards: MagicBentoCard[] = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const dare = dares[i];
      if (!dare) {
        return {
          title: 'BOUNTY OPEN',
          description: 'Waiting for a challenger...',
          label: 'VOID',
          isLive: false,
          glowColor: '50, 50, 50',
        };
      }

      const isLive =
        dare.status == null ? true : dare.status !== 'completed' && dare.status !== 'failed';

      return {
        id: dare.id,
        title: dare.description.toUpperCase(),
        description: `Target: ${dare.streamer_name || 'Unknown'}`,
        label: `$${dare.stake_amount}`,
        isLive,
        glowColor,
      };
    });
  }, [dares, glowColor]);

  const handleCardPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (shouldDisableAnimations) return;
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty('--glow-x', `${x}%`);
      el.style.setProperty('--glow-y', `${y}%`);
      el.style.setProperty('--glow-radius', `${spotlightRadius}px`);
      el.style.setProperty('--glow-intensity', '1');

      if (enableTilt && !shouldDisableAnimations) {
        const rx = ((y - 50) / -18).toFixed(2);
        const ry = ((x - 50) / 18).toFixed(2);
        el.style.transform = `translateY(-2px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      }

      if (enableMagnetism && !shouldDisableAnimations) {
        const mx = ((x - 50) / 50) * 6;
        const my = ((y - 50) / 50) * 6;
        el.style.translate = `${mx}px ${my}px`;
      }
    },
    [enableMagnetism, enableTilt, shouldDisableAnimations, spotlightRadius]
  );

  const handleCardPointerLeave = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const el = e.currentTarget;
      el.style.setProperty('--glow-intensity', '0');
      el.style.transform = '';
      el.style.translate = '';
    },
    []
  );

  const spawnParticles = useCallback(
    (container: HTMLElement, clientX: number, clientY: number, glow: string) => {
      const rect = container.getBoundingClientRect();
      const originX = clientX - rect.left;
      const originY = clientY - rect.top;

      for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        const angle = Math.random() * Math.PI * 2;
        const radius = 16 + Math.random() * 46;
        const dx = Math.cos(angle) * radius;
        const dy = Math.sin(angle) * radius;
        const size = 2 + Math.random() * 3;
        p.style.left = `${originX}px`;
        p.style.top = `${originY}px`;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.background = `rgba(${glow}, 0.9)`;
        p.style.opacity = '1';
        p.style.transition = 'transform 520ms ease, opacity 520ms ease';
        container.appendChild(p);
        requestAnimationFrame(() => {
          p.style.transform = `translate(${dx}px, ${dy}px)`;
          p.style.opacity = '0';
        });
        window.setTimeout(() => p.remove(), 560);
      }
    },
    [particleCount]
  );

  return (
    <div ref={gridRef} className="card-grid">
        {displayCards.map((card, index) => (
          <button
            key={index}
            type="button"
            className={[
              'magic-bento-card',
              textAutoHide ? 'magic-bento-card--text-autohide' : '',
              enableBorderGlow ? 'magic-bento-card--border-glow' : '',
              !card.isLive ? 'magic-bento-card--empty' : '',
              clickEffect ? 'particle-container' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ ['--glow-color' as any]: card.isLive ? glowColor : '50, 50, 50' }}
            onPointerMove={enableSpotlight ? handleCardPointerMove : undefined}
            onPointerLeave={enableSpotlight ? handleCardPointerLeave : undefined}
            onClick={() => {
              if (card.id && onDareClick) onDareClick(card.id);
            }}
            onPointerDown={(e) => {
              if (!clickEffect || shouldDisableAnimations) return;
              if (!card.isLive) return;
              spawnParticles(e.currentTarget, e.clientX, e.clientY, glowColor);
            }}
            disabled={!card.id}
          >
            <div className="magic-bento-card__header">
              <div className="magic-bento-card__label">{card.label}</div>
              {card.isLive ? <div className="magic-bento-card__live">LIVE</div> : null}
            </div>
            <div className="magic-bento-card__content">
              <h2 className="magic-bento-card__title">{card.title}</h2>
              <p className="magic-bento-card__description">{card.description}</p>
            </div>
          </button>
        ))}
    </div>
  );
}
