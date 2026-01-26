'use client';

import { useFeedback } from '@/hooks/useFeedback';
import { Volume2, VolumeX } from 'lucide-react';

interface SoundToggleProps {
  className?: string;
}

/**
 * Toggle button for sound effects
 * Persists preference to localStorage
 */
export function SoundToggle({ className = '' }: SoundToggleProps) {
  const { soundEnabled, toggleSound, trigger } = useFeedback();

  const handleClick = () => {
    trigger('click');
    toggleSound();
  };

  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded-lg transition-colors hover:bg-white/10 ${className}`}
      aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
      title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
    >
      {soundEnabled ? (
        <Volume2 className="w-5 h-5 text-white/70 hover:text-white" />
      ) : (
        <VolumeX className="w-5 h-5 text-white/40 hover:text-white/70" />
      )}
    </button>
  );
}
