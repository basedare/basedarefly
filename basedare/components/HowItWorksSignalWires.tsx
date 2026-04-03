'use client';

import { useEffect, useRef, useState } from 'react';

type Point = {
  x: number;
  y: number;
};

type AnchorPair = {
  start: Point;
  end: Point;
};

type SignalCableFoundationProps = {
  nodeSelector?: string;
  foundationRatio?: number;
};

const CABLES = [
  {
    id: 'yellow',
    offset: -11,
    sag: 22,
    width: 8,
    glow: 'rgba(245, 197, 24, 0.35)',
    stroke: '#f5c518',
    core: '#fff2b8',
    shadow: 'rgba(10, 8, 16, 0.58)',
  },
  {
    id: 'purple',
    offset: 0,
    sag: 28,
    width: 7,
    glow: 'rgba(168, 85, 247, 0.36)',
    stroke: '#c084fc',
    core: '#f3e8ff',
    shadow: 'rgba(10, 8, 16, 0.56)',
  },
  {
    id: 'black',
    offset: 11,
    sag: 18,
    width: 9,
    glow: 'rgba(36, 32, 46, 0.18)',
    stroke: '#17141f',
    core: '#4b465d',
    shadow: 'rgba(0, 0, 0, 0.68)',
  },
] as const;

const buildCablePath = (start: Point, end: Point, offset: number, sag: number) => {
  const sy = start.y + offset;
  const ey = end.y + offset;
  const span = end.x - start.x;
  const cp1x = start.x + span * 0.24;
  const cp2x = end.x - span * 0.24;
  const lowY = Math.max(sy, ey) + sag;

  return [
    `M ${start.x} ${sy}`,
    `C ${start.x + 14} ${sy}, ${cp1x} ${lowY}, ${(start.x + end.x) / 2} ${lowY}`,
    `C ${cp2x} ${lowY}, ${end.x - 14} ${ey}, ${end.x} ${ey}`,
  ].join(' ');
};

export default function HowItWorksSignalWires({
  nodeSelector = '[data-cable-node]',
  foundationRatio = 0.5,
}: SignalCableFoundationProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [anchors, setAnchors] = useState<AnchorPair[]>([]);

  useEffect(() => {
    const host = hostRef.current?.parentElement as HTMLElement | null;
    if (!host) return;

    const update = () => {
      const rect = host.getBoundingClientRect();
      const nodes = Array.from(host.querySelectorAll<HTMLElement>(nodeSelector));

      setSize({ width: rect.width, height: rect.height });
      setAnchors(
        nodes.slice(0, -1).map((node, index) => {
          const left = node.getBoundingClientRect();
          const right = nodes[index + 1].getBoundingClientRect();
          const leftSocket = node.querySelector<HTMLElement>('[data-cable-anchor="right"]');
          const rightSocket = nodes[index + 1].querySelector<HTMLElement>('[data-cable-anchor="left"]');
          const leftSocketRect = leftSocket?.getBoundingClientRect();
          const rightSocketRect = rightSocket?.getBoundingClientRect();

          const startY = leftSocketRect
            ? leftSocketRect.top - rect.top + leftSocketRect.height / 2
            : left.top - rect.top + left.height * foundationRatio;
          const endY = rightSocketRect
            ? rightSocketRect.top - rect.top + rightSocketRect.height / 2
            : right.top - rect.top + right.height * foundationRatio;

          return {
            start: {
              x: leftSocketRect
                ? leftSocketRect.left - rect.left + leftSocketRect.width / 2
                : left.right - rect.left + 8,
              y: startY,
            },
            end: {
              x: rightSocketRect
                ? rightSocketRect.left - rect.left + rightSocketRect.width / 2
                : right.left - rect.left - 8,
              y: endY,
            },
          };
        })
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [foundationRatio, nodeSelector]);

  if (!size.width || !size.height || anchors.length === 0) {
    return <div ref={hostRef} className="pointer-events-none absolute inset-0 z-[8] hidden md:block" aria-hidden="true" />;
  }

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0 z-[8] hidden md:block" aria-hidden="true">
      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          {CABLES.map((cable) => (
            <filter key={cable.id} id={`signal-wire-glow-${cable.id}`} x="-40%" y="-180%" width="180%" height="360%">
              <feGaussianBlur stdDeviation={cable.id === 'black' ? 3 : 7} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {anchors.map((anchor, pairIndex) => (
          <g key={pairIndex}>
            {CABLES.map((cable) => {
              const path = buildCablePath(anchor.start, anchor.end, cable.offset, cable.sag);
              return (
                <g key={`${pairIndex}-${cable.id}`}>
                  <path d={path} stroke={cable.shadow} strokeWidth={cable.width + 5} strokeLinecap="round" />
                  <path
                    d={path}
                    stroke={cable.glow}
                    strokeWidth={cable.width + 2}
                    strokeLinecap="round"
                    filter={`url(#signal-wire-glow-${cable.id})`}
                  />
                  <path d={path} stroke={cable.stroke} strokeWidth={cable.width} strokeLinecap="round" />
                  <path d={path} stroke={cable.core} strokeWidth={Math.max(2, cable.width * 0.2)} strokeLinecap="round" />
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}
