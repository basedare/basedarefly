/**
 * Sound effect definitions for BaseDare
 *
 * Add your sound files to /public/sounds/
 * Recommended formats: .mp3 (best compatibility) or .webm (smaller size)
 */

export type SoundEffect =
  | 'click'
  | 'hover'
  | 'success'
  | 'error'
  | 'fund'
  | 'payout'
  | 'connect'
  | 'notification'
  | 'whoosh'
  | 'pop';

// Sound file paths (relative to /public)
export const SOUND_PATHS: Record<SoundEffect, string> = {
  click: '/sounds/click.mp3',
  hover: '/sounds/hover.mp3',
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  fund: '/sounds/fund.mp3',
  payout: '/sounds/payout.mp3',
  connect: '/sounds/connect.mp3',
  notification: '/sounds/notification.mp3',
  whoosh: '/sounds/whoosh.mp3',
  pop: '/sounds/pop.mp3',
};

// Default volumes for each sound (0-1)
export const SOUND_VOLUMES: Record<SoundEffect, number> = {
  click: 0.3,
  hover: 0.1,
  success: 0.5,
  error: 0.4,
  fund: 0.6,
  payout: 0.7,
  connect: 0.4,
  notification: 0.5,
  whoosh: 0.3,
  pop: 0.3,
};

// Audio cache for preloaded sounds
const audioCache: Map<SoundEffect, HTMLAudioElement> = new Map();

/**
 * Preload a sound for instant playback
 */
export function preloadSound(sound: SoundEffect): void {
  if (typeof window === 'undefined') return;
  if (audioCache.has(sound)) return;

  const audio = new Audio(SOUND_PATHS[sound]);
  audio.preload = 'auto';
  audio.volume = SOUND_VOLUMES[sound];
  audioCache.set(sound, audio);
}

/**
 * Preload all sounds
 */
export function preloadAllSounds(): void {
  Object.keys(SOUND_PATHS).forEach((sound) => {
    preloadSound(sound as SoundEffect);
  });
}

/**
 * Play a sound effect
 */
export function playSound(sound: SoundEffect, volume?: number): void {
  if (typeof window === 'undefined') return;

  // Respect reduced motion preference (also applies to sounds for some users)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  try {
    let audio = audioCache.get(sound);

    if (!audio) {
      audio = new Audio(SOUND_PATHS[sound]);
      audioCache.set(sound, audio);
    }

    // Clone for overlapping sounds
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = volume ?? SOUND_VOLUMES[sound];
    clone.play().catch(() => {
      // Ignore autoplay errors - user hasn't interacted yet
    });
  } catch {
    // Silently fail if audio isn't supported
  }
}

/**
 * Stop all sounds
 */
export function stopAllSounds(): void {
  audioCache.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
}
