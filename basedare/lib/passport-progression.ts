import { TRIAL_ISLANDS } from './island-trials';
import { ACTIVITY_SUGGESTIONS, type ActivityArea } from './home-activities';
import { readAdventureProgress, type AdventureProgress, type AdventureRun } from './adventure-progress';

export type PassportEvidence = 'personal' | 'visit' | 'contribution' | 'crew';
export type PassportAchievement = { id: string; title: string; rule: string; evidence: PassportEvidence; earnedAt: string | null; sourceIds: string[] };
export type PlaceStamp = { id: string; venueId: string; slug: string; name: string; earnedAt: string; evidenceId: string; proof: 'QR_AND_GPS' };
export type PassportMemory = { id: string; title: string; place: string; href: string; occurredAt: string; evidence: 'crew' | 'contribution' };
export type PassportPerk = { checkInId: string; slug: string; place: string; title: string; conditions: string; expiresAt: string; redeemedAt: string | null; code: string };
export type PassportEvidenceSnapshot = { stamps: PlaceStamp[]; achievements: PassportAchievement[]; memories: PassportMemory[]; perks: PassportPerk[]; publicName: string | null; community: { accepted: number; yours: number; target: number; week: string }; asOf: string };
export const PASSPORT_FRAMES = ['classic', 'story', 'pathfinder', 'local'] as const;
export type PassportFrame = typeof PASSPORT_FRAMES[number];

/** Whitelist self-reported fields. Local data has no server-award authority. */
export function canonicalPersonalProgress(input: unknown, now = Date.now()): AdventureProgress {
  return { runs: readAdventureProgress(input, now).runs.map((run) => ({
    runId: run.runId, activityId: run.activityId, startedAt: run.startedAt,
    ...(run.completedAt === undefined ? {} : { completedAt: run.completedAt }),
    steps: [...run.steps].sort((a, b) => a - b),
    area: { lat: Math.round(run.area.lat * 1000) / 1000, lng: Math.round(run.area.lng * 1000) / 1000,
      label: run.area.label, ...(run.area.timeZone ? { timeZone: run.area.timeZone } : {}) },
    ...(run.placeSlug ? { placeSlug: run.placeSlug } : {}),
    ...(run.verdict ? { verdict: run.verdict } : {}),
    ...(run.island ? { island: run.island } : {}),
  })) };
}

/** Merge, never replace silently. A run ID cannot change its original activity/place. */
export function mergePersonalProgress(saved: unknown, device: unknown, now = Date.now()): AdventureProgress {
  const a = canonicalPersonalProgress(saved, now);
  const b = canonicalPersonalProgress(device, now);
  const byId = new Map(a.runs.map((run) => [run.runId, run]));
  for (const run of b.runs) {
    const old = byId.get(run.runId);
    if (!old) { byId.set(run.runId, run); continue; }
    if (old.island !== run.island || old.activityId !== run.activityId || old.placeSlug !== run.placeSlug || old.area.lat !== run.area.lat || old.area.lng !== run.area.lng) throw new Error('A saved run has different activity context. Export your device record before choosing which record to keep.');
    byId.set(run.runId, { ...old, startedAt: Math.min(old.startedAt, run.startedAt),
      ...(old.completedAt ? {} : run.verdict ? { verdict: run.verdict } : {}),
      steps: [...new Set([...old.steps, ...run.steps])].sort((x, y) => x - y),
      ...(old.completedAt || run.completedAt ? { completedAt: Math.max(old.completedAt ?? 0, run.completedAt ?? 0) } : {}),
    });
  }
  return canonicalPersonalProgress({ runs: [...byId.values()].sort((x, y) => (y.completedAt ?? y.startedAt) - (x.completedAt ?? x.startedAt)).slice(0, 30) }, now);
}

export function destinationWeek(now: Date, timeZone = 'Asia/Manila') {
  let zone = timeZone;
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(now); } catch { zone = 'Asia/Manila'; }
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (name: string) => Number(parts.find((p) => p.type === name)?.value);
  const localDay = new Date(Date.UTC(value('year'), value('month') - 1, value('day')));
  localDay.setUTCDate(localDay.getUTCDate() - ((localDay.getUTCDay() + 6) % 7));
  return localDay.toISOString().slice(0, 10);
}

export function weeklyPersonalChallenge(progress: unknown, area: Pick<ActivityArea, 'timeZone'>, now = new Date()) {
  // The shared community goal retains destinationWeek's established default;
  // a personal journal with no known city timezone uses an explicitly labelled UTC week.
  let zone = area.timeZone || 'UTC';
  try { new Intl.DateTimeFormat('en', { timeZone: zone }); } catch { zone = 'UTC'; }
  const week = destinationWeek(now, zone);
  const runs = canonicalPersonalProgress(progress, now.getTime()).runs.filter((r) => r.completedAt && destinationWeek(new Date(r.completedAt), zone) === week);
  return { week, completed: Math.min(3, new Set(runs.map((r) => r.activityId)).size), target: 3, title: 'Three different adventures this week', timeZone: zone };
}

export function personalExplorer(progress: unknown, now = Date.now()): PassportAchievement {
  const first = canonicalPersonalProgress(progress, now).runs.filter((r) => r.completedAt).sort((a, b) => a.completedAt! - b.completedAt!)[0];
  return { id: 'explorer', title: 'Explorer', rule: 'Finish one free adventure. Personal, self-reported progress.', evidence: 'personal', earnedAt: first ? new Date(first.completedAt!).toISOString() : null, sourceIds: first ? [first.runId] : [] };
}

export function eligibleFrame(frame: PassportFrame, achievements: PassportAchievement[]) {
  if (frame === 'classic') return true;
  const title = frame === 'story' ? 'storyteller' : frame === 'pathfinder' ? 'pathfinder' : 'helpful-local';
  return achievements.some((a) => a.id === title && a.earnedAt !== null);
}

const xml = (value: string) => value.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
export function personalCompletionSvg(run: AdventureRun, publicName?: string) {
  const activity = ACTIVITY_SUGGESTIONS.find((a) => a.id === run.activityId);
  if (!activity || !run.completedAt) throw new Error('Complete this adventure before making a card.');
  const island = TRIAL_ISLANDS.find((item) => item.id === run.island);
  const title = xml((island ? 'I DEFENDED ' + island.label.toUpperCase() : activity.result ?? activity.title).slice(0, 46));
  const place = xml(island ? 'ISLAND TRIAL #001 · NO BEACHES ALLOWED' : run.area.label.slice(0, 64));
  const name = publicName ? xml(publicName.slice(0, 30)) : 'A BaseDare Explorer';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" rx="36" fill="#090812"/><rect x="24" y="24" width="1152" height="582" rx="28" fill="none" stroke="#f5c518" stroke-width="3"/><circle cx="1050" cy="160" r="65" fill="#241a35" stroke="#b87fff" stroke-width="4"/><path d="M1015 163l24 24 46-56" fill="none" stroke="#f5c518" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><g font-family="Arial,sans-serif" fill="#fff"><text x="70" y="100" font-size="24" fill="#f5c518">BASEDARE · PERSONAL MEMORY</text><text x="70" y="205" font-size="40" font-weight="bold">${title}</text><text x="70" y="275" font-size="26" fill="#d8c6ef">${place}</text><text x="70" y="340" font-size="26">${name}</text><text x="70" y="430" font-size="40" font-weight="bold" fill="#f5c518">TRY THIS WITH ME</text><text x="70" y="490" font-size="22">Self-reported adventure · no verified visit or cash reward</text><text x="70" y="550" font-size="22" fill="#ccc">basedare.xyz/${island ? 'island-trials/no-beaches-allowed' : 'adventures/' + xml(run.activityId)}</text></g></svg>`;
}
