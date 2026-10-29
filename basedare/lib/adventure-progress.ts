import { ISLAND_TRIAL_ID, readTrialIsland, type TrialIsland } from './island-trials';
import { ACTIVITY_SUGGESTIONS, type ActivityArea, type AdventurePreferences } from './home-activities';
import { SIARGAO_CHALLENGE_ID, readSiargaoVerdict, type SiargaoVerdict } from './siargao-challenge';

export type AdventureRun = {
  runId: string; activityId: string; startedAt: number; completedAt?: number;
  steps: number[]; area: ActivityArea; placeSlug?: string;
  verdict?: SiargaoVerdict; island?: TrialIsland;
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
    if (run.verdict !== undefined && (run.activityId !== SIARGAO_CHALLENGE_ID || !readSiargaoVerdict(run.verdict))) return false;
    if (run.activityId === SIARGAO_CHALLENGE_ID && run.completedAt !== undefined && !readSiargaoVerdict(run.verdict)) return false;
    if (run.island !== undefined && (run.activityId !== ISLAND_TRIAL_ID || !readTrialIsland(run.island))) return false;
    if (run.activityId === ISLAND_TRIAL_ID && !readTrialIsland(run.island)) return false;
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
  if (run.activityId === SIARGAO_CHALLENGE_ID && step === 2) return progress; // The verdict choice completes stage three.
  return { runs: progress.runs.map((r) => r.runId !== runId ? r : { ...r, steps: r.steps.includes(step) ? r.steps.filter((s) => s !== step) : [...r.steps, step] }) };
}

export function completeAdventure(progress: AdventureProgress, runId: string, now = Date.now()): AdventureProgress {
  const run = activeAdventure(progress, now);
  const activity = ACTIVITY_SUGGESTIONS.find((a) => a.id === run?.activityId);
  if (!run || run.runId !== runId || !activity || run.steps.length !== activity.steps.length) return progress;
  if (run.activityId === SIARGAO_CHALLENGE_ID && !readSiargaoVerdict(run.verdict)) return progress;
  if (run.activityId === ISLAND_TRIAL_ID && !readTrialIsland(run.island)) return progress;
  return { runs: progress.runs.map((r) => r.runId !== runId ? r : { ...r, completedAt: now }) };
}

export function updateAdventureVerdict(progress: AdventureProgress, runId: string, value: unknown, now = Date.now()): AdventureProgress {
  const run = activeAdventure(progress, now);
  const verdict = readSiargaoVerdict(value);
  if (!run || run.runId !== runId || run.activityId !== SIARGAO_CHALLENGE_ID || !verdict || !run.steps.includes(0) || !run.steps.includes(1)) return progress;
  return { runs: progress.runs.map((saved) => saved.runId !== runId ? saved : {
    ...saved, verdict,
    steps: saved.steps.includes(2) ? saved.steps : [...saved.steps, 2],
  }) };
}

export function adventureHref(id?: string, placeSlug?: string, area?: ActivityArea, preferences?: AdventurePreferences) {
  const query = new URLSearchParams();
  if (id === ISLAND_TRIAL_ID) return '/island-trials/no-beaches-allowed';
  if (placeSlug) query.set('place', placeSlug);
  else if (area) {
    query.set('lat', String(area.lat)); query.set('lng', String(area.lng));
    query.set('areaLabel', area.label.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 100));
    if (area.timeZone) query.set('timeZone', area.timeZone);
  }
  if (preferences) { query.set('minutes', String(preferences.minutes)); query.set('mood', preferences.mood); }
  return `/adventures${id ? '/' + encodeURIComponent(id) : ''}${query.size ? '?' + query : ''}`;
}
