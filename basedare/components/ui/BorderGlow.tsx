'use client';

import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import styles from './BorderGlow.module.css';

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%'];
const GRADIENT_KEYS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four'];
const COLOR_MAP = [0, 1, 2, 1];

type BorderGlowProps = {
  children: ReactNode;
  className?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  fillOpacity?: number;
};

function parseHsl(input: string) {
  const match = input.match(/([\d.]+)\s+([\d.]+)%?\s+([\d.]+)%?/);
  if (!match) return { h: 40, s: 80, l: 80 };
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) };
}

function buildGlowVars(glowColor: string, intensity: number) {
  const { h, s, l } = parseHsl(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];

  return keys.reduce<Record<string, string>>((vars, key, index) => {
    vars[`--glow-color${key}`] = `hsl(${base} / ${Math.min(opacities[index] * intensity, 100)}%)`;
    return vars;
  }, {});
}

function buildGradientVars(colors: string[]) {
  return GRADIENT_KEYS.reduce<Record<string, string>>((vars, key, index) => {
    const color = colors[Math.min(COLOR_MAP[index], colors.length - 1)] ?? colors[0] ?? '#c084fc';
    vars[key] = `radial-gradient(at ${GRADIENT_POSITIONS[index]}, ${color} 0, transparent 52%)`;
    return vars;
  }, { '--gradient-base': `linear-gradient(${colors[0] ?? '#120f17'} 0 100%)` });
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function animateValue({
  start = 0,
  end = 100,
  duration = 1200,
  onUpdate,
}: {
  start?: number;
  end?: number;
  duration?: number;
  onUpdate: (value: number) => void;
}) {
  const startTime = performance.now();
  let frame = 0;

  const tick = () => {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    onUpdate(start + (end - start) * easeOutCubic(progress));
    if (progress < 1) frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

export default function BorderGlow({
  children,
  className,
  edgeSensitivity = 34,
  glowColor = '40 80 80',
  backgroundColor = '#120F17',
  borderRadius = 28,
  glowRadius = 34,
  glowIntensity = 0.72,
  coneSpread = 24,
  animated = false,
  colors = ['rgba(192,132,252,0.18)', 'rgba(244,114,182,0.1)', 'rgba(56,189,248,0.12)'],
  fillOpacity = 0.55,
}: BorderGlowProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const setPointerVars = useCallback((clientX: number, clientY: number) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const kx = dx === 0 ? Infinity : cx / Math.abs(dx);
    const ky = dy === 0 ? Infinity : cy / Math.abs(dy);
    const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    const radians = Math.atan2(dy, dx);
    const angle = ((radians * 180) / Math.PI + 450) % 360;

    card.style.setProperty('--edge-proximity', String(Math.max(edgeSensitivity, edge * 100).toFixed(3)));
    card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
  }, [edgeSensitivity]);

  useEffect(() => {
    if (!animated || !cardRef.current) return;

    const card = cardRef.current;
    card.style.setProperty('--cursor-angle', '110deg');
    return animateValue({
      start: edgeSensitivity,
      end: 86,
      duration: 1400,
      onUpdate: (value) => {
        card.style.setProperty('--edge-proximity', value.toFixed(3));
        card.style.setProperty('--cursor-angle', `${110 + value * 2.8}deg`);
      },
    });
  }, [animated, edgeSensitivity]);

  const style = {
    '--card-bg': backgroundColor,
    '--border-radius': `${borderRadius}px`,
    '--glow-padding': `${glowRadius}px`,
    '--cone-start': `${180 - coneSpread}deg`,
    '--cone-mid': '180deg',
    '--cone-end': `${180 + coneSpread}deg`,
    '--fill-opacity': fillOpacity,
    '--edge-proximity': edgeSensitivity,
    ...buildGlowVars(glowColor, glowIntensity),
    ...buildGradientVars(colors),
  } as CSSProperties;

  return (
    <div
      ref={cardRef}
      onPointerMove={(event) => setPointerVars(event.clientX, event.clientY)}
      className={cn(styles.card, className)}
      style={style}
    >
      <span className={styles.edgeLight} />
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
