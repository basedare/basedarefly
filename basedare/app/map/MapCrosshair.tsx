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

    if (!container || !horizontal || !vertical) return;

    horizontal.style.opacity = '0';
    vertical.style.opacity = '0';

    const render = () => {
      const rendered = renderedRef.current;
      rendered.xCurrent = mouseRef.current.x;
      rendered.yCurrent = mouseRef.current.y;
      rendered.xPrevious = lerp(rendered.xPrevious, rendered.xCurrent, 0.15);
      rendered.yPrevious = lerp(rendered.yPrevious, rendered.yCurrent, 0.15);

      horizontal.style.transform = `translate3d(0, ${rendered.yPrevious}px, 0)`;
      vertical.style.transform = `translate3d(${rendered.xPrevious}px, 0, 0)`;
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
    };

    const hideCrosshair = () => {
      horizontal.style.opacity = '0';
      vertical.style.opacity = '0';
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

      if (hoverPulseRef.current !== null) {
        window.clearTimeout(hoverPulseRef.current);
      }

      hoverPulseRef.current = window.setTimeout(() => {
        delete horizontal.dataset.reactive;
        delete vertical.dataset.reactive;
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
          right: 0,
          top: 0,
          height: '1px',
          opacity: 0,
          background: `linear-gradient(90deg, transparent 0%, rgba(184,127,255,0.1) 20%, ${horizontalColor} 46%, rgba(255,255,255,0.72) 50%, ${horizontalColor} 54%, rgba(184,127,255,0.1) 80%, transparent 100%)`,
          boxShadow: '0 0 18px rgba(184,127,255,0.28), 0 0 3px rgba(255,255,255,0.22)',
          mixBlendMode: 'screen',
          transition: 'opacity 140ms ease-out, box-shadow 140ms ease-out',
          willChange: 'transform, opacity',
        }}
      />
      <div
        ref={verticalRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '1px',
          opacity: 0,
          background: `linear-gradient(180deg, transparent 0%, rgba(245,197,24,0.1) 20%, ${verticalColor} 46%, rgba(255,255,255,0.66) 50%, ${verticalColor} 54%, rgba(245,197,24,0.1) 80%, transparent 100%)`,
          boxShadow: '0 0 18px rgba(245,197,24,0.28), 0 0 3px rgba(255,255,255,0.2)',
          mixBlendMode: 'screen',
          transition: 'opacity 140ms ease-out, box-shadow 140ms ease-out',
          willChange: 'transform, opacity',
        }}
      />
      <style jsx>{`
        [data-reactive='true'] {
          box-shadow:
            0 0 22px rgba(255, 255, 255, 0.28),
            0 0 28px rgba(245, 197, 24, 0.18) !important;
        }
      `}</style>
    </div>
  );
}
