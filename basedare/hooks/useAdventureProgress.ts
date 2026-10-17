'use client';
import { useCallback, useEffect, useState } from 'react';
import { ADVENTURE_EVENT, ADVENTURE_KEY, EMPTY_ADVENTURES, readAdventureProgress, type AdventureProgress } from '@/lib/adventure-progress';
import { readSavedActivity, SIARGAO_ACTIVITY_AREA, ACTIVITY_SUGGESTIONS } from '@/lib/home-activities';
import { useSocialAction } from './useSocialAction';

const memories = new Map<string, AdventureProgress>();
const memoryOnly = new Set<string>();
const linked = new Set<string>();
const flagKey = (wallet: string) => ADVENTURE_KEY + ':linked:' + wallet;
function storageKey(wallet?: string) {
  if (!wallet) return ADVENTURE_KEY;
  let saved = false;
  try { saved = localStorage.getItem(flagKey(wallet)) === '1'; } catch { /* Session fallback. */ }
  return saved || linked.has(wallet) ? ADVENTURE_KEY + ':account:' + wallet : ADVENTURE_KEY;
}
export function linkPersonalJournal(wallet: string, progress: AdventureProgress) {
  try { localStorage.setItem(flagKey(wallet), '1'); linked.delete(wallet); } catch { linked.add(wallet); }
  const key = storageKey(wallet);
  memories.set(key, readAdventureProgress(progress));
  try { localStorage.setItem(key, JSON.stringify(progress)); memoryOnly.delete(key); } catch { memoryOnly.add(key); }
  window.dispatchEvent(new Event(ADVENTURE_EVENT));
}
export function unlinkPersonalJournal(wallet: string) {
  linked.delete(wallet);
  try { localStorage.removeItem(flagKey(wallet)); } catch { /* Session fallback. */ }
  window.dispatchEvent(new Event(ADVENTURE_EVENT));
}
export function useAdventureProgress() {
  const { wallet } = useSocialAction();
  const [snapshot, setSnapshot] = useState({ owner: wallet, key: ADVENTURE_KEY, progress: EMPTY_ADVENTURES, ready: false, unavailable: false, asOf: Date.now() });
  const restore = useCallback(() => {
    const key = storageKey(wallet);
    let progress = memories.get(key) ?? EMPTY_ADVENTURES;
    let unavailable = memoryOnly.has(key);
    try {
      const stored = localStorage.getItem(key);
      if (!memoryOnly.has(key)) {
        progress = stored ? readAdventureProgress(JSON.parse(stored)) : EMPTY_ADVENTURES;
        if (!stored && key === ADVENTURE_KEY) {
          const old = readSavedActivity(JSON.parse(localStorage.getItem('basedare:home-activity:v1') ?? 'null'));
          if (old) {
            const activity = ACTIVITY_SUGGESTIONS.find((a) => a.id === old.id)!;
            progress = { runs: [{ runId: 'imported-' + old.startedAt, activityId: old.id, startedAt: old.startedAt, completedAt: old.completedAt, steps: old.completedAt ? activity.steps.map((_, i) => i) : [], area: SIARGAO_ACTIVITY_AREA }] };
            localStorage.setItem(key, JSON.stringify(progress));
            localStorage.removeItem('basedare:home-activity:v1');
          }
        }
      }
    } catch { unavailable = true; }
    memories.set(key, progress);
    setSnapshot({ owner: wallet, key, progress, unavailable, ready: true, asOf: Date.now() });
  }, [wallet]);
  useEffect(() => {
    const initial = window.setTimeout(restore, 0);
    const visible = () => { if (document.visibilityState === 'visible') restore(); };
    window.addEventListener('storage', restore);
    window.addEventListener(ADVENTURE_EVENT, restore);
    document.addEventListener('visibilitychange', visible);
    return () => { window.clearTimeout(initial); window.removeEventListener('storage', restore); window.removeEventListener(ADVENTURE_EVENT, restore); document.removeEventListener('visibilitychange', visible); };
  }, [restore]);
  const change = useCallback((apply: (previous: AdventureProgress) => AdventureProgress) => {
    const key = storageKey(wallet);
    let previous = memories.get(key) ?? EMPTY_ADVENTURES;
    try { const value = localStorage.getItem(key); if (value && !memoryOnly.has(key)) previous = readAdventureProgress(JSON.parse(value)); } catch { /* In-memory progress remains. */ }
    const progress = readAdventureProgress(apply(previous));
    memories.set(key, progress);
    try { localStorage.setItem(key, JSON.stringify(progress)); memoryOnly.delete(key); } catch { memoryOnly.add(key); }
    setSnapshot({ owner: wallet, key, progress, unavailable: memoryOnly.has(key), ready: true, asOf: Date.now() });
    window.dispatchEvent(new Event(ADVENTURE_EVENT));
  }, [wallet]);
  const owned = snapshot.owner === wallet;
  return { progress: owned ? snapshot.progress : EMPTY_ADVENTURES, change, ready: owned && snapshot.ready, storageUnavailable: owned && snapshot.unavailable, asOf: snapshot.asOf, wallet, accountLinked: owned && snapshot.key !== ADVENTURE_KEY };
}
