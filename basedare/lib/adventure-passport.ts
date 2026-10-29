import { ISLAND_TRIAL_ID, trialInviteHref } from './island-trials';
import { adventureHref, readAdventureProgress, type AdventureRun } from './adventure-progress';
import { ACTIVITY_SUGGESTIONS, suggestionsForArea, type ActivityArea } from './home-activities';

/** Personal memories only. This projection has no server award or reputation authority. */
export const PERSONAL_COLLECTION = {
  id: 'three-perspectives',
  title: 'Three perspectives',
  description: 'Notice something. Tell its story. Keep a little memory.',
  activities: ['little-local-loop', 'one-minute-story', 'postcard'],
} as const;

export function personalPassport(value: unknown, now = Date.now()) {
  const progress = readAdventureProgress(value, now);
  const completed = progress.runs.filter((run) => run.completedAt !== undefined)
    .sort((a, b) => b.completedAt! - a.completedAt!);
  const uniqueActivities = new Set(completed.map((run) => run.activityId));
  const stages = PERSONAL_COLLECTION.activities.map((id) => ({
    activity: ACTIVITY_SUGGESTIONS.find((activity) => activity.id === id)!,
    run: completed.find((run) => run.activityId === id) ?? null,
  }));
  const firstCompletedAt = completed.length ? Math.min(...completed.map((run) => run.completedAt!)) : null;
  const collectionCompletedAt = stages.every((stage) => stage.run)
    ? Math.max(...stages.map((stage) => Math.min(...completed.filter((run) => run.activityId === stage.activity.id).map((run) => run.completedAt!))))
    : null;
  return {
    completed,
    uniqueActivities: uniqueActivities.size,
    stages,
    stamps: [
      { id: 'first-steps', title: 'First steps', detail: 'Finish your first free adventure.', earnedAt: firstCompletedAt },
      { id: PERSONAL_COLLECTION.id, title: PERSONAL_COLLECTION.title, detail: 'Complete all three collection activities.', earnedAt: collectionCompletedAt },
    ],
  };
}

export function nextPassportActivity(value: unknown, area: ActivityArea, now = new Date()) {
  const passport = personalPassport(value, now.getTime());
  const eligible = suggestionsForArea(area, now);
  const pending = passport.stages.find((stage) => !stage.run && eligible.some((activity) => activity.id === stage.activity.id));
  return pending?.activity ?? eligible.find((activity) => !passport.completed.some((run) => run.activityId === activity.id)) ?? eligible[0] ?? null;
}

/** An invitation transfers public activity context, never the sender's run or completion. */
export function personalAdventureInvite(run: Pick<AdventureRun, 'activityId' | 'placeSlug' | 'area' | 'island'>) {
  if (run.activityId === ISLAND_TRIAL_ID) return trialInviteHref(run.island);
  const href = adventureHref(run.activityId, run.placeSlug, {
    ...run.area,
    lat: Math.round(run.area.lat * 1000) / 1000,
    lng: Math.round(run.area.lng * 1000) / 1000,
  });
  return `${href}&from=passport`;
}
