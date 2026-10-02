'use client';
import { useEffect, useRef, useState } from 'react';
import { shouldPreferLightweightClient } from '@/lib/client-performance';

export function useVisualActivity() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    let inView = false;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setActive(inView && !document.hidden && !shouldPreferLightweightClient());
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); }, { threshold: 0.05 });
    if (ref.current) observer.observe(ref.current);
    document.addEventListener('visibilitychange', update);
    motion.addEventListener('change', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); motion.removeEventListener('change', update); };
  }, []);
  return { ref, active };
}
