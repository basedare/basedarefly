type HapticPattern = 'selection' | 'impact' | 'success' | 'warning';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  selection: 12,
  impact: 24,
  success: [18, 36, 18],
  warning: [28, 42, 28],
};

export function triggerHaptic(pattern: HapticPattern = 'selection') {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (!('vibrate' in navigator)) return;

  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Some mobile browsers expose vibrate but block it outside trusted gestures.
  }
}
