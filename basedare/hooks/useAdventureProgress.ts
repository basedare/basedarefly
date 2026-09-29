'use client';
import { useCallback, useEffect, useState } from 'react';
import { ADVENTURE_EVENT, ADVENTURE_KEY, EMPTY_ADVENTURES, readAdventureProgress, type AdventureProgress } from '@/lib/adventure-progress';
import { readSavedActivity, SIARGAO_ACTIVITY_AREA, ACTIVITY_SUGGESTIONS } from '@/lib/home-activities';

let memory = EMPTY_ADVENTURES;
let memoryOnly = false;
export function useAdventureProgress() {
  const [progress, setProgress] = useState<AdventureProgress>(EMPTY_ADVENTURES);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [ready, setReady] = useState(false);
  const restore = useCallback(() => {
    try {
      const stored = localStorage.getItem(ADVENTURE_KEY);
      if (stored && !memoryOnly) memory = readAdventureProgress(JSON.parse(stored));
      else if (!memoryOnly) {
        memory = EMPTY_ADVENTURES;
        const old = readSavedActivity(JSON.parse(localStorage.getItem('basedare:home-activity:v1') ?? 'null'));
        if (old) {
          const activity = ACTIVITY_SUGGESTIONS.find((a) => a.id === old.id)!;
          memory = { runs: [{ runId: 'imported-' + old.startedAt, activityId: old.id, startedAt: old.startedAt,
            completedAt: old.completedAt, steps: old.completedAt ? activity.steps.map((_, i) => i) : [], area: SIARGAO_ACTIVITY_AREA }] };
          localStorage.setItem(ADVENTURE_KEY, JSON.stringify(memory));
          localStorage.removeItem('basedare:home-activity:v1');
        }
      }
      setStorageUnavailable(memoryOnly);
    } catch { setStorageUnavailable(true); }
    setProgress(memory); setReady(true);
  }, []);
  useEffect(() => {
    const initial = window.setTimeout(restore, 0);
    const visible = () => { if (document.visibilityState === 'visible') restore(); };
    const sync = () => setProgress(memory);
    window.addEventListener('storage', restore);
    window.addEventListener(ADVENTURE_EVENT, sync);
    document.addEventListener('visibilitychange', visible);
    return () => { window.clearTimeout(initial); window.removeEventListener('storage', restore); window.removeEventListener(ADVENTURE_EVENT, sync); document.removeEventListener('visibilitychange', visible); };
  }, [restore]);
  const change = useCallback((apply: (previous: AdventureProgress) => AdventureProgress) => {
    try { const value = localStorage.getItem(ADVENTURE_KEY); if (value && !memoryOnly) memory = readAdventureProgress(JSON.parse(value)); } catch { /* In-memory progress remains available. */ }
    memory = readAdventureProgress(apply(memory));
    try { localStorage.setItem(ADVENTURE_KEY, JSON.stringify(memory)); memoryOnly = false; setStorageUnavailable(false); } catch { memoryOnly = true; setStorageUnavailable(true); }
    setProgress(memory);
    window.dispatchEvent(new Event(ADVENTURE_EVENT));
  }, []);
  return { progress, change, ready, storageUnavailable };
}
