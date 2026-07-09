'use client';
import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import { triggerHaptic } from '@/lib/mobile-haptics';

interface IgnitionContextType {
  ignitionActive: boolean;
  ignitionId: number;
  /** 0..1 — how charged the last release was (scales the burst). */
  ignitionIntensity: number;
  /** True while the button is being held and the environment is melting in. */
  charging: boolean;
  /** Fire the release burst directly (used by non-hold callers). */
  triggerIgnition: (intensity?: number) => void;
  /** pointerdown: begin ramping the hold charge + environment melt. */
  startCharge: () => void;
  /** pointerup on the button: commit — release the charge into the burst. */
  releaseCharge: () => void;
  /** pointer left the button before release: relax the melt, no burst. */
  cancelCharge: () => void;
}

const IgnitionContext = createContext<IgnitionContextType>({
  ignitionActive: false,
  ignitionId: 0,
  ignitionIntensity: 1,
  charging: false,
  triggerIgnition: () => {},
  startCharge: () => {},
  releaseCharge: () => {},
  cancelCharge: () => {},
});

// Time to reach full charge on a sustained hold.
const CHARGE_MS = 850;

const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const IgnitionProvider = ({ children }: { children: React.ReactNode }) => {
  const [ignitionActive, setIgnitionActive] = useState(false);
  const [ignitionId, setIgnitionId] = useState(0);
  const [ignitionIntensity, setIgnitionIntensity] = useState(1);
  const [charging, setCharging] = useState(false);

  const ignitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chargeRafRef = useRef<number>(0);
  const rampRafRef = useRef<number>(0);
  const chargeRef = useRef(0); // live 0..1
  const chargingRef = useRef(false);
  const hapticsRef = useRef({ a: false, b: false, full: false });

  // Write the charge straight to the DOM so the whole environment (background
  // melt, immersion veil, button aura) can read it via CSS without React
  // re-rendering every frame.
  const setChargeVar = useCallback((v: number) => {
    chargeRef.current = v;
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--bd-charge', v.toFixed(4));
    }
  }, []);

  const rampChargeTo = useCallback(
    (target: number, ms: number) => {
      if (typeof window === 'undefined') return;
      cancelAnimationFrame(rampRafRef.current);
      const from = chargeRef.current;
      const start = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / ms);
        const eased = 1 - Math.pow(1 - k, 3);
        setChargeVar(from + (target - from) * eased);
        if (k < 1) rampRafRef.current = requestAnimationFrame(step);
      };
      rampRafRef.current = requestAnimationFrame(step);
    },
    [setChargeVar],
  );

  const triggerIgnition = useCallback(
    (intensity = 1) => {
      if (ignitionTimeoutRef.current) clearTimeout(ignitionTimeoutRef.current);
      setIgnitionId((c) => c + 1);
      setIgnitionIntensity(intensity);
      setIgnitionActive(true);
      triggerHaptic('launch');
      // Even a quick tap pops the environment; a held charge sustains it first.
      if (!prefersReduced()) {
        setChargeVar(Math.max(chargeRef.current, 0.85));
        rampChargeTo(0, 700);
      }
      ignitionTimeoutRef.current = setTimeout(() => {
        setIgnitionActive(false);
        ignitionTimeoutRef.current = null;
      }, 1350);
    },
    [rampChargeTo, setChargeVar],
  );

  const startCharge = useCallback(() => {
    if (typeof window === 'undefined' || prefersReduced()) return;
    if (chargingRef.current) return;
    cancelAnimationFrame(rampRafRef.current);
    chargingRef.current = true;
    hapticsRef.current = { a: false, b: false, full: false };
    setCharging(true);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / CHARGE_MS);
      setChargeVar(t);
      const h = hapticsRef.current;
      if (!h.a && t >= 0.34) { h.a = true; triggerHaptic('selection'); }
      if (!h.b && t >= 0.68) { h.b = true; triggerHaptic('selection'); }
      if (!h.full && t >= 1) { h.full = true; triggerHaptic('spark'); }
      if (chargingRef.current) chargeRafRef.current = requestAnimationFrame(tick);
    };
    chargeRafRef.current = requestAnimationFrame(tick);
  }, [setChargeVar]);

  const releaseCharge = useCallback(() => {
    if (!chargingRef.current) {
      triggerIgnition(1);
      return;
    }
    chargingRef.current = false;
    cancelAnimationFrame(chargeRafRef.current);
    setCharging(false);
    // Reactive payoff: the burst scales with how long you held.
    triggerIgnition(Math.max(0.35, chargeRef.current));
  }, [triggerIgnition]);

  const cancelCharge = useCallback(() => {
    if (!chargingRef.current) return;
    chargingRef.current = false;
    cancelAnimationFrame(chargeRafRef.current);
    rampChargeTo(0, 320);
    // Keep the melt mounted until the relax finishes so it eases out instead of
    // popping off (guard against a new hold starting within the window).
    setTimeout(() => {
      if (!chargingRef.current) setCharging(false);
    }, 340);
  }, [rampChargeTo]);

  return (
    <IgnitionContext.Provider
      value={{
        ignitionActive,
        ignitionId,
        ignitionIntensity,
        charging,
        triggerIgnition,
        startCharge,
        releaseCharge,
        cancelCharge,
      }}
    >
      {children}
    </IgnitionContext.Provider>
  );
};

export const useIgnition = () => useContext(IgnitionContext);
