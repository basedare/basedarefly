'use client';

import Link from 'next/link';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const HEXES =
  '3b82f61d4ed822c55e15803def4444b91c1cff6a00cc5500ffc800cca00014b8a60f766edb3b7cb02e649356d46b3fa13341551e293bffbf00cc9900ffffffd3e2ef'.match(
    /.{6}/g
  ) ?? [];

const COLORS = {
  blue: 0,
  green: 1,
  red: 2,
  orange: 3,
  yellow: 4,
  teal: 5,
  pink: 6,
  purple: 7,
  slate: 8,
  amber: 9,
  white: 10,
} as const;

type SquircleTone = keyof typeof COLORS;

type SquircleLinkProps = {
  href: string;
  tone?: SquircleTone;
  label: string;
  fullWidth?: boolean;
  floating?: boolean;
  height?: number;
  className?: string;
  labelClassName?: string;
  children?: ReactNode;
};

function formatPathNumber(value: number) {
  return Number(value.toFixed(4));
}

function squirclePath(width: number, height: number, radius: number, x: number, y: number) {
  let path = '';

  for (let j = 0; j < 4; j += 1) {
    for (let i = 0; i < 31; i += 1) {
      const q = ((j + i / 30) * Math.PI) / 2;
      const c = Math.cos(q);
      const s = Math.sin(q);

      const px = formatPathNumber(
        x +
          (c > 0 ? width - radius : radius) +
          Math.sign(c) * Math.pow(Math.abs(c), 0.6) * radius
      );
      const py = formatPathNumber(
        y +
          (s > 0 ? height - radius : radius) +
          Math.sign(s) * Math.pow(Math.abs(s), 0.6) * radius
      );

      path += `${j || i ? 'L' : 'M'}${px} ${py}`;
    }
  }

  return `${path}Z`;
}

function mix(hex: string, pct: number, fallback: string) {
  return `color-mix(in srgb, #${hex} ${pct}%, ${fallback})`;
}

function useLinkWidth(label: string, fullWidth: boolean) {
  return useMemo(() => {
    if (fullWidth) return 190;

    const compactLabel = label.trim().toUpperCase();
    const estimatedTextWidth = compactLabel.length * 9.6;

    return Math.max(124, Math.ceil((estimatedTextWidth + 76) * 1.08));
  }, [fullWidth, label]);
}

export default function SquircleLink({
  href,
  tone = 'yellow',
  label,
  fullWidth = false,
  floating = false,
  height = 44,
  className,
  labelClassName,
  children,
}: SquircleLinkProps) {
  const idx = COLORS[tone] ?? 0;
  const highlight = HEXES[idx * 2] ?? 'ffd825';
  const depth = HEXES[idx * 2 + 1] ?? 'ca8a00';
  const white = tone === 'white';
  const width = useLinkWidth(label, fullWidth);
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const reactId = useId().replace(/:/g, '');
  const scale = height / 40;

  const isDown = pressed;
  const isHovering = hovered && !isDown;
  const faceY = isDown ? 8 : isHovering ? 5 : 6;
  const shadowY = isDown ? 11 : isHovering ? 12 : 13;
  const dy = floating ? (isDown ? 10 : isHovering ? 22 : 18) : isDown ? 1.5 : isHovering ? 5 : 4;
  const std = floating ? (isDown ? 6 : isHovering ? 13 : 11) : isDown ? 1.6 : isHovering ? 4.5 : 3.6;
  const opacity = floating ? (isHovering ? 0.18 : 0.14) : isHovering ? 0.36 : 0.28;
  const svgWidth = width + 10;
  const svgHeight = 56;
  const labelText = label.toUpperCase();

  const facePath = useMemo(() => squirclePath(width, 40, 18, 5, faceY), [faceY, width]);
  const shadowPath = useMemo(() => squirclePath(width, 40, 18, 5, shadowY), [shadowY, width]);
  const idSuffix = `${reactId}-${tone}-${width}-${height}-${floating ? 'f' : 'n'}-link`;

  const handlePointerDown = () => setPressed(true);
  const handlePointerUp = () => setPressed(false);
  const handlePointerEnter = () => setHovered(true);
  const handlePointerLeave = () => {
    setHovered(false);
    handlePointerUp();
  };

  return (
    <Link
      href={href}
      onFocus={handlePointerEnter}
      onBlur={handlePointerLeave}
      onPointerEnter={handlePointerEnter}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerUp}
      className={cn(
        'group relative inline-block select-none overflow-visible transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        fullWidth ? 'block w-full' : 'inline-block',
        className
      )}
      style={{
        width: fullWidth ? '100%' : `${svgWidth * scale}px`,
        height: `${svgHeight * scale}px`,
        transform: isDown ? 'translateY(1px) scale(0.992)' : isHovering ? 'translateY(-1px) scale(1.012)' : 'translateY(0) scale(1)',
        transition: 'transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <defs>
          <filter id={`b-${idSuffix}`} x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dy={dy} stdDeviation={std} floodColor={mix(depth, 35, 'black')} floodOpacity={opacity} />
          </filter>
          <linearGradient id={`g-${idSuffix}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0" stopColor={white ? '#ffffff' : mix(highlight, 86, 'white')} />
            <stop offset="32%" stopColor={white ? '#f8fbff' : `#${highlight}`} />
            <stop offset="68%" stopColor={white ? '#e8eef8' : mix(highlight, 72, depth === highlight ? 'black' : `#${depth}`)} />
            <stop offset="100%" stopColor={white ? '#d3e2ef' : mix(depth, 88, 'black')} />
          </linearGradient>
          <radialGradient id={`s-${idSuffix}`} cx="50%" cy="-18%" r="92%">
            <stop offset="0" stopColor="rgba(255,255,255,0.84)" />
            <stop offset="42%" stopColor="rgba(255,255,255,0.24)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        <path
          d={shadowPath}
          fill={mix(depth, 52, 'black')}
          filter={`url(#b-${idSuffix})`}
          opacity={isDown ? 0.42 : 0.72}
        />

        <path
          d={facePath}
          fill={`url(#g-${idSuffix})`}
          stroke={white ? '#e2e8f0' : mix(highlight, 70, 'white')}
          strokeWidth="1.5"
        />
        <path d={facePath} fill={`url(#s-${idSuffix})`} opacity={tone === 'slate' ? 0.18 : 0.42} />
        <rect
          x={5 + width * 0.22}
          y={faceY + 3.5}
          width={width * 0.56}
          height="5.5"
          rx="3"
          fill="rgba(255,255,255,0.5)"
          opacity={isDown ? 0.12 : isHovering ? 0.7 : 0.52}
        />

        <foreignObject x="5" y={faceY} width={width} height="40">
          <div className="flex h-full w-full items-center justify-center px-4">
            <div
              className={cn(
                'relative z-10 flex items-center justify-center gap-2 whitespace-nowrap font-black uppercase tracking-[0.08em]',
                height >= 48 ? 'text-[0.92rem]' : 'text-[0.82rem]',
                tone === 'yellow' || tone === 'amber' ? 'text-[#15120c]' : white ? 'text-[#3b82f6]' : 'text-white',
                labelClassName
              )}
            >
              {children ?? labelText}
            </div>
          </div>
        </foreignObject>
      </svg>
      <span className="sr-only">{labelText}</span>
    </Link>
  );
}
