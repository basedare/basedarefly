type HapticPattern = 'selection' | 'impact' | 'success' | 'warning' | 'launch' | 'spark';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  selection: 12,
  impact: 24,
  success: [18, 36, 18],
  warning: [28, 42, 28],
  launch: [16, 28, 18, 46, 26],
  spark: [8, 18, 8],
};

export function triggerHaptic(pattern: HapticPattern = 'selection') {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (!('vibrate' in navigator)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Some mobile browsers expose vibrate but block it outside trusted gestures.
  }
}
