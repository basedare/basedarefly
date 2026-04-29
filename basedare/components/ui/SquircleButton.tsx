'use client';

import { cn } from '@/lib/utils';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

const HEXES =
  '3b82f61d4ed822c55e15803def4444b91c1cff6a00cc5500ffc8008a5a0014b8a60f766edb3b7cb02e649356d46b3fa13341551e293bffbf008a5a00ffffffd3e2ef'.match(
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

const JELLY_FACE_HEIGHT = 40;
const JELLY_FACE_RADIUS = 20;
const JELLY_SHINE_WIDTH = 0.44;
const JELLY_SHINE_HEIGHT = 4.4;

type SquircleButtonProps = {
  tone?: SquircleTone;
  label?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
  square?: boolean;
  floating?: boolean;
  height?: number;
  className?: string;
  buttonClassName?: string;
  active?: boolean;
  stableHover?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  children?: ReactNode;
};

function formatPathNumber(value: number) {
  return Number(value.toFixed(4));
}

function squirclePath(width: number, height: number, radius: number, x: number, y: number) {
  const r = Math.min(radius, height / 2, width / 2);
  const c = r * 0.5522847498;
  const right = x + width;
  const bottom = y + height;

  return [
    `M${formatPathNumber(x + r)} ${formatPathNumber(y)}`,
    `H${formatPathNumber(right - r)}`,
    `C${formatPathNumber(right - r + c)} ${formatPathNumber(y)} ${formatPathNumber(right)} ${formatPathNumber(y + r - c)} ${formatPathNumber(right)} ${formatPathNumber(y + r)}`,
    `V${formatPathNumber(bottom - r)}`,
    `C${formatPathNumber(right)} ${formatPathNumber(bottom - r + c)} ${formatPathNumber(right - r + c)} ${formatPathNumber(bottom)} ${formatPathNumber(right - r)} ${formatPathNumber(bottom)}`,
    `H${formatPathNumber(x + r)}`,
    `C${formatPathNumber(x + r - c)} ${formatPathNumber(bottom)} ${formatPathNumber(x)} ${formatPathNumber(bottom - r + c)} ${formatPathNumber(x)} ${formatPathNumber(bottom - r)}`,
    `V${formatPathNumber(y + r)}`,
    `C${formatPathNumber(x)} ${formatPathNumber(y + r - c)} ${formatPathNumber(x + r - c)} ${formatPathNumber(y)} ${formatPathNumber(x + r)} ${formatPathNumber(y)}`,
    'Z',
  ].join('');
}

function mix(hex: string, pct: number, fallback: string) {
  return `color-mix(in srgb, #${hex} ${pct}%, ${fallback})`;
}

function useButtonWidth(label: string, icon: boolean, square: boolean, fullWidth: boolean) {
  return useMemo(() => {
    if (square) return 48;
    if (fullWidth) return 160;

    const compactLabel = label.trim().toUpperCase();
    const estimatedTextWidth = compactLabel.length * 8.7;
    const paddingWidth = icon ? 78 : 58;

    return Math.max(120, Math.ceil((estimatedTextWidth + paddingWidth) * 1.04));
  }, [fullWidth, icon, label, square]);
}

function useJellyGeometry(fullWidth: boolean, baseFaceWidth: number, scale: number) {
  const hostRef = useRef<HTMLButtonElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!fullWidth) {
      return;
    }

    const node = hostRef.current;
    if (!node) return;

    const updateWidth = () => {
      setMeasuredWidth(node.getBoundingClientRect().width);
    };

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, [fullWidth]);

  const svgWidth =
    fullWidth && measuredWidth
      ? Math.max(JELLY_FACE_HEIGHT + 10, measuredWidth / scale)
      : baseFaceWidth + 10;
  const faceWidth = Math.max(JELLY_FACE_HEIGHT, svgWidth - 10);

  return { hostRef, faceWidth, svgWidth };
}

export default function SquircleButton({
  tone = 'yellow',
  label = '',
  icon,
  fullWidth = false,
  square = false,
  floating = false,
  height = 44,
  className,
  buttonClassName,
  active = false,
  stableHover = false,
  disabled = false,
  onClick,
  type = 'button',
  children,
}: SquircleButtonProps) {
  const idx = COLORS[tone] ?? 0;
  const highlight = HEXES[idx * 2] ?? 'ffd825';
  const depth = HEXES[idx * 2 + 1] ?? 'ca8a00';
  const white = tone === 'white';
  const width = useButtonWidth(label, Boolean(icon), square, fullWidth);
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const reactId = useId().replace(/:/g, '');
  const scale = height / 40;

  const isDown = pressed && !disabled;
  const isHovering = (stableHover ? active : hovered || active) && !disabled && !isDown;
  const faceY = isDown ? 8 : isHovering ? 5 : 6;
  const shadowY = isDown ? 11 : isHovering ? 12 : 13;
  const dy = floating ? (isDown ? 10 : isHovering ? 22 : 18) : isDown ? 1.5 : isHovering ? 5 : 4;
  const std = floating ? (isDown ? 6 : isHovering ? 13 : 11) : isDown ? 1.6 : isHovering ? 4.5 : 3.6;
  const opacity = floating ? (isHovering ? 0.18 : 0.14) : isHovering ? 0.36 : 0.28;
  const shadowOpacity = isDown ? 0.42 : 0.72;
  const dropOpacity = opacity;
  const svgHeight = 56;
  const labelText = label.toUpperCase();
  const baseFaceWidth = square ? JELLY_FACE_HEIGHT : width;
  const { hostRef, faceWidth, svgWidth } = useJellyGeometry(fullWidth, baseFaceWidth, scale);
  const idSuffix = `${reactId}-${tone}-${Math.round(faceWidth)}-${height}-${floating ? 'f' : 'n'}-button`;
  const handlePointerDown = () => {
    if (disabled) return;
    setPressed(true);
  };

  const handlePointerUp = () => {
    setPressed(false);
  };

  const handlePointerEnter = () => {
    if (disabled) return;
    setHovered(true);
  };

  const handlePointerLeave = () => {
    setHovered(false);
    handlePointerUp();
  };

  const facePath = useMemo(() => squirclePath(faceWidth, JELLY_FACE_HEIGHT, JELLY_FACE_RADIUS, 5, faceY), [faceY, faceWidth]);
  const shadowPath = useMemo(() => squirclePath(faceWidth, JELLY_FACE_HEIGHT, JELLY_FACE_RADIUS, 5, shadowY), [shadowY, faceWidth]);
  const shineWidth = faceWidth * JELLY_SHINE_WIDTH;
  const shineX = 5 + (faceWidth - shineWidth) / 2;

  return (
    <button
      ref={hostRef}
      type={type}
      onClick={onClick}
      disabled={disabled}
      onFocus={handlePointerEnter}
      onBlur={handlePointerLeave}
      onPointerEnter={handlePointerEnter}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerUp}
      aria-label={label || undefined}
      className={cn(
        'group relative inline-block select-none overflow-visible transition-transform duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        fullWidth ? 'block w-full' : 'inline-block',
        className
      )}
      style={{
        width: fullWidth ? '100%' : `${svgWidth * scale}px`,
        height: `${svgHeight * scale}px`,
        transform: isDown
          ? stableHover
            ? 'translateY(1px) scale(1)'
            : 'translateY(1px) scale(0.992)'
          : isHovering && !stableHover
            ? 'translateY(-1px) scale(1.012)'
            : 'translateY(0) scale(1)',
        transition: 'transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="none"
        className={cn('h-full w-full overflow-visible', buttonClassName)}
      >
        <defs>
          <filter id={`b-${idSuffix}`} x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dy={dy} stdDeviation={std} floodColor={mix(depth, 35, 'black')} floodOpacity={dropOpacity} />
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
          opacity={shadowOpacity}
        />

        <path
          d={facePath}
          fill={`url(#g-${idSuffix})`}
          stroke={white ? '#e2e8f0' : mix(highlight, 70, 'white')}
          strokeWidth="1.5"
        />
        <path d={facePath} fill={`url(#s-${idSuffix})`} opacity={tone === 'slate' ? 0.18 : 0.42} />
        <rect
          x={shineX}
          y={faceY + 3.5}
          width={shineWidth}
          height={JELLY_SHINE_HEIGHT}
          rx={JELLY_SHINE_HEIGHT / 2}
          fill="rgba(255,255,255,0.5)"
          opacity={isDown ? 0.12 : isHovering ? 0.7 : 0.52}
        />

      </svg>
      <div
        className="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-center px-4"
        style={{
          top: `${faceY * scale}px`,
          height: `${40 * scale}px`,
          WebkitFontSmoothing: 'antialiased',
          textRendering: 'geometricPrecision',
        }}
      >
        {children ? (
          <div className="relative z-10 flex items-center justify-center">{children}</div>
        ) : (
          <div
            className={cn(
              'relative z-10 flex items-center justify-center whitespace-nowrap font-black uppercase',
              square ? 'text-[1.45rem]' : 'gap-2 text-[0.95rem] tracking-[0.08em]',
              tone === 'yellow' || tone === 'amber' ? 'text-[#15120c]' : white ? 'text-[#3b82f6]' : 'text-white'
            )}
          >
            {icon ? <span className="flex shrink-0 items-center justify-center">{icon}</span> : null}
            {!square ? <span>{labelText}</span> : null}
          </div>
        )}
      </div>
    </button>
  );
}
