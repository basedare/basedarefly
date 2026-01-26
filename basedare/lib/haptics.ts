/**
 * Haptic feedback utilities for BaseDare
 * Uses Web Vibration API (mobile only)
 */

export type HapticPattern = 'tap' | 'success' | 'error' | 'warning' | 'heavy' | 'heartbeat';

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [10, 50, 20, 50, 30],
  error: [50, 30, 50],
  warning: [30, 20, 30],
  heavy: 50,
  heartbeat: [100, 100, 100, 100, 100, 300, 100, 100, 100, 100, 100],
};

/**
 * Check if haptics are supported
 */
export function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback
 */
export function triggerHaptic(pattern: HapticPattern = 'tap'): boolean {
  if (!isHapticsSupported()) return false;

  // Respect reduced motion preference
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }

  try {
    return navigator.vibrate(HAPTIC_PATTERNS[pattern]);
  } catch {
    return false;
  }
}

/**
 * Stop any ongoing haptic feedback
 */
export function stopHaptic(): boolean {
  if (!isHapticsSupported()) return false;

  try {
    return navigator.vibrate(0);
  } catch {
    return false;
  }
}
