"use client";
import { useEffect, useRef, useState } from "react";
import {
  getClientPerformanceHints,
  shouldPreferLightweightClient,
} from "@/lib/client-performance";

export function useVisualActivity(allowLightweightMotion = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    let inView = false;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const hints = getClientPerformanceHints();
      const disabled = allowLightweightMotion
        ? hints.prefersReducedMotion || hints.saveData || hints.slowConnection
        : shouldPreferLightweightClient();
      setActive(inView && !document.hidden && !disabled);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        update();
      },
      { threshold: 0.05 }
    );
    if (ref.current) observer.observe(ref.current);
    document.addEventListener("visibilitychange", update);
    motion.addEventListener("change", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      motion.removeEventListener("change", update);
    };
  }, [allowLightweightMotion]);
  return { ref, active };
}
