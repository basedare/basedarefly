'use client';

import { useEffect, useId, useRef } from 'react';
import { gsap } from 'gsap';

type MapCrosshairProps = {
  containerRef: React.RefObject<HTMLDivElement | null>;
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
  const filterXRef = useRef<SVGFETurbulenceElement | null>(null);
  const filterYRef = useRef<SVGFETurbulenceElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const renderedRef = useRef({
    xPrevious: 0,
    yPrevious: 0,
    xCurrent: 0,
    yCurrent: 0,
  });
  const pointerInsideRef = useRef(false);

  const xFilterId = useId().replace(/:/g, '');
  const yFilterId = useId().replace(/:/g, '');

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(min-width: 768px)').matches) {
      return;
    }

    const container = containerRef.current;
    const horizontal = horizontalRef.current;
    const vertical = verticalRef.current;

    if (!container || !horizontal || !vertical) return;

    const setHorizontalY = gsap.quickSetter(horizontal, 'y', 'px');
    const setVerticalX = gsap.quickSetter(vertical, 'x', 'px');

    gsap.set([horizontal, vertical], { opacity: 0 });

    const render = () => {
      const rendered = renderedRef.current;
      rendered.xCurrent = mouseRef.current.x;
      rendered.yCurrent = mouseRef.current.y;
      rendered.xPrevious = lerp(rendered.xPrevious, rendered.xCurrent, 0.15);
      rendered.yPrevious = lerp(rendered.yPrevious, rendered.yCurrent, 0.15);

      setHorizontalY(rendered.yPrevious);
      setVerticalX(rendered.xPrevious);
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
      gsap.to([horizontal, vertical], {
        duration: 0.2,
        ease: 'power2.out',
        opacity: 1,
      });
    };

    const hideCrosshair = () => {
      gsap.to([horizontal, vertical], {
        duration: 0.16,
        ease: 'power2.out',
        opacity: 0,
        onComplete: () => {
          if (!pointerInsideRef.current) {
            stopRenderLoop();
          }
        },
      });
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

    const distortionState = { turbulence: 0.000001 };

    const distortionTimeline = gsap.timeline({
      paused: true,
      onStart: () => {
        horizontal.style.filter = `url(#${xFilterId})`;
        vertical.style.filter = `url(#${yFilterId})`;
      },
      onUpdate: () => {
        filterXRef.current?.setAttribute('baseFrequency', `${distortionState.turbulence}`);
        filterYRef.current?.setAttribute('baseFrequency', `${distortionState.turbulence}`);
      },
      onComplete: () => {
        horizontal.style.filter = 'none';
        vertical.style.filter = 'none';
      },
    });

    distortionTimeline.to(distortionState, {
      duration: 0.45,
      ease: 'power1.out',
      startAt: { turbulence: 0.9 },
      turbulence: 0.000001,
    });

    const triggerDistortion = () => {
      distortionTimeline.restart();
    };

    let activeInteractiveTarget: Element | null = null;

    const handleInteractiveHover = (event: Event) => {
      const target = event.target as Element | null;
      const interactiveTarget = target?.closest(reactiveSelector) ?? null;

      if (!interactiveTarget || interactiveTarget === activeInteractiveTarget) {
        return;
      }

      activeInteractiveTarget = interactiveTarget;
      triggerDistortion();
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
      distortionTimeline.kill();
      stopRenderLoop();
    };
  }, [containerRef, reactiveSelector, xFilterId, yFilterId]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[14] hidden overflow-hidden md:block">
      <svg className="absolute inset-0 h-full w-full opacity-0">
        <defs>
          <filter id={xFilterId}>
            <feTurbulence ref={filterXRef} type="fractalNoise" baseFrequency="0.000001" numOctaves="1" />
            <feDisplacementMap in="SourceGraphic" scale="34" />
          </filter>
          <filter id={yFilterId}>
            <feTurbulence ref={filterYRef} type="fractalNoise" baseFrequency="0.000001" numOctaves="1" />
            <feDisplacementMap in="SourceGraphic" scale="34" />
          </filter>
        </defs>
      </svg>

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
          willChange: 'transform, opacity',
        }}
      />
    </div>
  );
}
