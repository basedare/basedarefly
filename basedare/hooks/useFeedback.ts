'use client';

import { useCallback, useEffect, useState } from 'react';
import { playSound, preloadAllSounds, type SoundEffect } from '@/lib/sounds';
import { triggerHaptic, type HapticPattern } from '@/lib/haptics';

const STORAGE_KEY = 'basedare_sound_enabled';

type FeedbackType =
  | 'click'
  | 'hover'
  | 'success'
  | 'error'
  | 'fund'
  | 'payout'
  | 'connect'
  | 'notification';

// Map feedback types to sound + haptic combos
const FEEDBACK_MAP: Record<FeedbackType, { sound: SoundEffect; haptic: HapticPattern }> = {
  click: { sound: 'click', haptic: 'tap' },
  hover: { sound: 'hover', haptic: 'tap' },
  success: { sound: 'success', haptic: 'success' },
  error: { sound: 'error', haptic: 'error' },
  fund: { sound: 'fund', haptic: 'heavy' },
  payout: { sound: 'payout', haptic: 'success' },
  connect: { sound: 'connect', haptic: 'success' },
  notification: { sound: 'notification', haptic: 'warning' },
};

interface UseFeedbackReturn {
  /** Trigger combined sound + haptic feedback */
  trigger: (type: FeedbackType) => void;
  /** Play sound only */
  sound: (effect: SoundEffect) => void;
  /** Trigger haptic only */
  haptic: (pattern: HapticPattern) => void;
  /** Whether sound is enabled */
  soundEnabled: boolean;
  /** Toggle sound on/off */
  toggleSound: () => void;
  /** Set sound enabled state */
  setSoundEnabled: (enabled: boolean) => void;
}

/**
 * Hook for triggering sound and haptic feedback
 *
 * @example
 * ```tsx
 * const { trigger, soundEnabled, toggleSound } = useFeedback();
 *
 * <button onClick={() => { trigger('click'); doSomething(); }}>
 *   Click me
 * </button>
 *
 * <button onClick={toggleSound}>
 *   Sound: {soundEnabled ? 'ON' : 'OFF'}
 * </button>
 * ```
 */
export function useFeedback(): UseFeedbackReturn {
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setSoundEnabledState(stored === 'true');
    }
    // Preload sounds for instant playback
    preloadAllSounds();
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(!soundEnabled);
  }, [soundEnabled, setSoundEnabled]);

  const sound = useCallback((effect: SoundEffect) => {
    if (soundEnabled && isClient) {
      playSound(effect);
    }
  }, [soundEnabled, isClient]);

  const haptic = useCallback((pattern: HapticPattern) => {
    if (isClient) {
      triggerHaptic(pattern);
    }
  }, [isClient]);

  const trigger = useCallback((type: FeedbackType) => {
    const { sound: soundEffect, haptic: hapticPattern } = FEEDBACK_MAP[type];
    sound(soundEffect);
    haptic(hapticPattern);
  }, [sound, haptic]);

  return {
    trigger,
    sound,
    haptic,
    soundEnabled,
    toggleSound,
    setSoundEnabled,
  };
}

export type { FeedbackType, SoundEffect, HapticPattern };
