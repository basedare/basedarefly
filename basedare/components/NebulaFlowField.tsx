'use client';

import { useEffect, useRef } from 'react';
import { useIgnition } from '@/app/context/IgnitionContext';

// Gritty-futuristic flow-field nebula for the Fund-This-Dare hold. Thousands of
// tiny particles follow an evolving curl-noise current and trail into smoky
// filaments (the canvas fades instead of clearing). Gold with electric-cyan and
// a magenta chroma split. Seeps in with --bd-charge (the canvas opacity tracks
// it, so it's fully invisible at rest). Mobile only; desktop is left alone.

// Weighted palette: gold-dominant, cyan accents, a little magenta for chroma.
const COLORS: Array<[number, number, number]> = [
  [255, 206, 110],
  [255, 206, 110],
  [255, 206, 110],
  [80, 232, 255],
  [80, 232, 255],
  [210, 120, 255],
];

interface Particle {
  x: number;
  y: number;
  life: number;
  speed: number;
  color: [number, number, number];
}

function flowAngle(x: number, y: number, t: number): number {
  const n =
    Math.sin(x * 0.011 + t * 0.22) +
    Math.cos(y * 0.009 - t * 0.15) +
    Math.sin((x + y) * 0.006 + t * 0.11);
  return -Math.PI / 2 + n * 0.92; // upward bias + meander
}

export default function NebulaFlowField() {
  const { charging, ignitionActive } = useIgnition();
  const active = charging || ignitionActive;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!active) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const root = document.documentElement;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const count = Math.min(1400, Math.round((width * height) / 190));
    const rand = (() => {
      let s = 1337;
      return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
      };
    })();
    const particles: Particle[] = Array.from({ length: count }, (_, i) => ({
      x: rand() * width,
      y: rand() * height,
      life: rand(),
      speed: 0.6 + rand() * 0.8,
      color: COLORS[i % COLORS.length],
    }));

    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const charge = parseFloat(root.style.getPropertyValue('--bd-charge')) || 0;

      // Fade prior frame slightly instead of clearing → smoke trails.
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(6,6,12,0.11)';
      ctx.fillRect(0, 0, width, height);

      if (charge > 0.002) {
        ctx.globalCompositeOperation = 'lighter';
        const speed = 34 + charge * 46;
        for (let i = 0; i < particles.length; i += 1) {
          const p = particles[i];
          const chroma = p.color[2] > 200 ? 0.16 : 0; // magenta rides an offset current
          const a = flowAngle(p.x, p.y, t) + chroma;
          p.x += Math.cos(a) * speed * p.speed * dt;
          p.y += Math.sin(a) * speed * p.speed * dt;
          p.life -= dt * 0.5;
          if (p.life <= 0 || p.x < -6 || p.x > width + 6 || p.y < -6) {
            p.x = rand() * width;
            p.y = height + 4;
            p.life = 0.6 + rand() * 1.2;
          }
          const alpha = 0.5 * Math.min(1, p.life * 1.4);
          if (alpha <= 0.01) continue;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = `rgb(${p.color[0]},${p.color[1]},${p.color[2]})`;
          ctx.fillRect(p.x, p.y, 1.3, 1.3);
        }
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[93] h-full w-full md:hidden"
      // Opacity tracks the hold charge so the nebula is invisible at rest and
      // seeps in as you hold.
      style={{ mixBlendMode: 'screen', opacity: 'var(--bd-charge, 0)' }}
      aria-hidden="true"
    />
  );
}
