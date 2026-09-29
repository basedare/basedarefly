import { ACTIVITY_SUGGESTIONS, type ActivityArea } from './home-activities';

export type AdventureRun = {
  runId: string; activityId: string; startedAt: number; completedAt?: number;
  steps: number[]; area: ActivityArea; placeSlug?: string;
};
export type AdventureProgress = { runs: AdventureRun[] };
export const ADVENTURE_KEY = 'basedare:adventures:v1';
export const ADVENTURE_EVENT = 'basedare:adventures-updated';
export const EMPTY_ADVENTURES: AdventureProgress = { runs: [] };

export function readAdventureProgress(value: unknown, now = Date.now()): AdventureProgress {
  const runs = value && typeof value === 'object' && 'runs' in value && Array.isArray(value.runs) ? value.runs : [];
  const seen = new Set<string>();
  return { runs: runs.filter((run): run is AdventureRun => {
    if (!run || typeof run !== 'object') return false;
    const activity = ACTIVITY_SUGGESTIONS.find((a) => a.id === run.activityId);
    if (!activity || typeof run.runId !== 'string' || run.runId.length > 100 || seen.has(run.runId)) return false;
    if (!Number.isFinite(run.startedAt) || run.startedAt <= 0 || run.startedAt > now) return false;
    if (!Array.isArray(run.steps) || new Set(run.steps).size !== run.steps.length
      || !run.steps.every((n: number) => Number.isInteger(n) && n >= 0 && n < activity.steps.length)) return false;
    if (run.completedAt !== undefined && (!Number.isFinite(run.completedAt) || run.completedAt < run.startedAt || run.completedAt > now || run.steps.length !== activity.steps.length)) return false;
    if (!run.area || !Number.isFinite(run.area.lat) || Math.abs(run.area.lat) > 90 || !Number.isFinite(run.area.lng) || Math.abs(run.area.lng) > 180
      || typeof run.area.label !== 'string' || run.area.label.length > 120) return false;
    if (run.area.timeZone !== undefined) {
      try { new Intl.DateTimeFormat('en', { timeZone: run.area.timeZone }); } catch { return false; }
    }
    if (run.placeSlug !== undefined && (typeof run.placeSlug !== 'string' || !/^[a-z0-9-]{1,120}$/.test(run.placeSlug))) return false;
    seen.add(run.runId);
    return true;
  }).slice(0, 30) };
}

export function activeAdventure(progress: AdventureProgress, now = Date.now()) {
  return progress.runs.find((r) => !r.completedAt && now - r.startedAt < 24 * 3600000) ?? null;
}

export function updateAdventureStep(progress: AdventureProgress, runId: string, step: number, now = Date.now()): AdventureProgress {
  const run = activeAdventure(progress, now);
  const activity = ACTIVITY_SUGGESTIONS.find((a) => a.id === run?.activityId);
  if (!run || run.runId !== runId || !activity || !Number.isInteger(step) || step < 0 || step >= activity.steps.length) return progress;
  return { runs: progress.runs.map((r) => r.runId !== runId ? r : { ...r, steps: r.steps.includes(step) ? r.steps.filter((s) => s !== step) : [...r.steps, step] }) };
}

export function completeAdventure(progress: AdventureProgress, runId: string, now = Date.now()): AdventureProgress {
  const run = activeAdventure(progress, now);
  const activity = ACTIVITY_SUGGESTIONS.find((a) => a.id === run?.activityId);
  if (!run || run.runId !== runId || !activity || run.steps.length !== activity.steps.length) return progress;
  return { runs: progress.runs.map((r) => r.runId !== runId ? r : { ...r, completedAt: now }) };
}

export function adventureHref(id?: string, placeSlug?: string, area?: ActivityArea) {
  const query = new URLSearchParams();
  if (placeSlug) query.set('place', placeSlug);
  else if (area) { query.set('lat', String(area.lat)); query.set('lng', String(area.lng)); }
  return `/adventures${id ? '/' + encodeURIComponent(id) : ''}${query.size ? '?' + query : ''}`;
}
