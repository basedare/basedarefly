'use client';

import { useEffect, useRef, type RefObject } from 'react';

type MapCrosshairProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  horizontalColor?: string;
  verticalColor?: string;
  reactiveSelector?: string;
};

const lerp = (start: number, end: number, amount: number) => (1 - amount) * start + amount * end;

export default function MapCrosshair({
  containerRef,
  horizontalColor = 'rgba(184, 127, 255, 0.86)',
  verticalColor = 'rgba(245, 197, 24, 0.86)',
  reactiveSelector = 'a, button, .maplibregl-marker, .basedare-maplibre-marker, .peebear-marker',
}: MapCrosshairProps) {
  const horizontalRef = useRef<HTMLDivElement | null>(null);
  const verticalRef = useRef<HTMLDivElement | null>(null);
  const reticleRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const renderedRef = useRef({
    xPrevious: 0,
    yPrevious: 0,
    xCurrent: 0,
    yCurrent: 0,
  });
  const pointerInsideRef = useRef(false);
  const hoverPulseRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(min-width: 768px)').matches) {
      return;
    }

    const container = containerRef.current;
    const horizontal = horizontalRef.current;
    const vertical = verticalRef.current;
    const reticle = reticleRef.current;

    if (!container || !horizontal || !vertical || !reticle) return;

    horizontal.style.opacity = '0';
    vertical.style.opacity = '0';
    reticle.style.opacity = '0';

    const render = () => {
      const rendered = renderedRef.current;
      rendered.xCurrent = mouseRef.current.x;
      rendered.yCurrent = mouseRef.current.y;
      rendered.xPrevious = lerp(rendered.xPrevious, rendered.xCurrent, 0.15);
      rendered.yPrevious = lerp(rendered.yPrevious, rendered.yCurrent, 0.15);

      const x = rendered.xPrevious;
      const y = rendered.yPrevious;
      horizontal.style.transform = `translate3d(${x - 18}px, ${y}px, 0)`;
      vertical.style.transform = `translate3d(${x}px, ${y - 18}px, 0)`;
      reticle.style.transform = `translate3d(${x - 13}px, ${y - 13}px, 0)`;
      frameRef.current = window.requestAnimationFrame(render);
    };

    const ensureRenderLoop = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(render);
    };

    const stopRenderLoop = () => {
      if (frameRef.current === null) return;
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };

    const getRelativePos = (event: MouseEvent) => {
      const bounds = container.getBoundingClientRect();
      return {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
    };

    const showCrosshair = () => {
      horizontal.style.opacity = '1';
      vertical.style.opacity = '1';
      reticle.style.opacity = '1';
    };

    const hideCrosshair = () => {
      horizontal.style.opacity = '0';
      vertical.style.opacity = '0';
      reticle.style.opacity = '0';
      stopRenderLoop();
    };

    const handleMouseEnter = (event: MouseEvent) => {
      pointerInsideRef.current = true;
      const position = getRelativePos(event);
      mouseRef.current = position;
      renderedRef.current.xPrevious = position.x;
      renderedRef.current.yPrevious = position.y;
      renderedRef.current.xCurrent = position.x;
      renderedRef.current.yCurrent = position.y;
      showCrosshair();
      ensureRenderLoop();
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current = getRelativePos(event);
    };

    const handleMouseLeave = () => {
      pointerInsideRef.current = false;
      hideCrosshair();
    };

    const triggerHoverPulse = () => {
      horizontal.dataset.reactive = 'true';
      vertical.dataset.reactive = 'true';
      reticle.dataset.reactive = 'true';

      if (hoverPulseRef.current !== null) {
        window.clearTimeout(hoverPulseRef.current);
      }

      hoverPulseRef.current = window.setTimeout(() => {
        delete horizontal.dataset.reactive;
        delete vertical.dataset.reactive;
        delete reticle.dataset.reactive;
        hoverPulseRef.current = null;
      }, 160);
    };

    let activeInteractiveTarget: Element | null = null;

    const handleInteractiveHover = (event: Event) => {
      const target = event.target as Element | null;
      const interactiveTarget = target?.closest(reactiveSelector) ?? null;

      if (!interactiveTarget || interactiveTarget === activeInteractiveTarget) {
        return;
      }

      activeInteractiveTarget = interactiveTarget;
      triggerHoverPulse();
    };

    const clearInteractiveHover = (event: MouseEvent) => {
      if (!activeInteractiveTarget) {
        return;
      }

      const relatedTarget = event.relatedTarget as Element | null;
      if (relatedTarget?.closest(reactiveSelector)) {
        return;
      }

      activeInteractiveTarget = null;
    };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseover', handleInteractiveHover);
    container.addEventListener('mouseout', clearInteractiveHover);

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mouseover', handleInteractiveHover);
      container.removeEventListener('mouseout', clearInteractiveHover);
      if (hoverPulseRef.current !== null) {
        window.clearTimeout(hoverPulseRef.current);
        hoverPulseRef.current = null;
      }
      stopRenderLoop();
    };
  }, [containerRef, reactiveSelector]);

  return (
    <div
      data-map-crosshair="true"
      className="pointer-events-none absolute inset-0 z-[14] hidden overflow-hidden md:block"
      style={{ contain: 'paint' }}
    >
      <div
        ref={horizontalRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '36px',
          height: '1px',
          opacity: 0,
          background: `linear-gradient(90deg, transparent 0%, ${horizontalColor} 36%, rgba(255,255,255,0.72) 50%, ${horizontalColor} 64%, transparent 100%)`,
          transition: 'opacity 120ms ease-out',
          willChange: 'transform, opacity',
        }}
      />
      <div
        ref={verticalRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '1px',
          height: '36px',
          opacity: 0,
          background: `linear-gradient(180deg, transparent 0%, ${verticalColor} 36%, rgba(255,255,255,0.66) 50%, ${verticalColor} 64%, transparent 100%)`,
          transition: 'opacity 120ms ease-out',
          willChange: 'transform, opacity',
        }}
      />
      <div
        ref={reticleRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '26px',
          height: '26px',
          opacity: 0,
          border: '1px solid rgba(255,255,255,0.64)',
          borderRadius: '9999px',
          boxShadow: '0 0 10px rgba(184,127,255,0.2)',
          transition: 'opacity 120ms ease-out',
          willChange: 'transform, opacity',
        }}
      />
      <style jsx>{`
        [data-reactive='true'] {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
