import { ACTIVITY_SUGGESTIONS } from './home-activities';
import { adventureHref } from './adventure-progress';

/** Safe form presets, not published drops or invented creator assignments. */
export function adventureLaunchPreset(id: string) {
  const activity = ACTIVITY_SUGGESTIONS.find((item) => item.id === id && (item.collection || item.id === 'siargao-verdict'));
  if (!activity) return null;
  return {
    campaignCode: activity.collection === 'Island Trials' ? 'island-trials-001' : activity.collection === 'Chaos Quests' ? 'chaos-quests-v1' : 'siargao-hype-v1',
    targetType: 'PAGE', targetId: activity.id, actionHref: adventureHref(activity.id),
    title: activity.title, hook: activity.hook ?? activity.summary, category: 'free_play',
    actionLabel: 'Try the free adventure', rewardLabel: 'Free · no cash reward',
    cityLabel: activity.collection === 'Chaos Quests' ? 'Play anywhere suitable' : activity.collection === 'Island Trials' ? 'Siargao · El Nido · Boracay' : 'General Luna, Siargao',
    creatorBrief: 'Voluntary free adventure. Original or licensed media; permission from everyone included. Public sharing is optional and reviewed. Agree creator credit and any commercial rights separately.',
    suggestedCaption: activity.creator?.caption ?? 'Is Siargao worth the hype? Find the side everyone misses, then give your own verdict.',
    proofPrompt: 'Guest completion is self-reported. It is not a verified visit, paid proof, competition result or licence to reuse content.',
    participationOwner: false,
  };
}
