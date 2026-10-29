import type { ActivitySuggestion } from './home-activities';

export const ISLAND_TRIAL_ID = 'no-beaches-allowed';
export const TRIAL_ISLANDS = [
  { id: 'siargao', label: 'Siargao', lat: 9.7905, lng: 126.158, art: 'surf', line: 'There’s more than the famous wave.' },
  { id: 'el-nido', label: 'El Nido', lat: 11.2027, lng: 119.4082, art: 'palm', line: 'The shoreline doesn’t get all the credit.' },
  { id: 'boracay', label: 'Boracay', lat: 11.9674, lng: 121.9248, art: 'gathering', line: 'Give the island a different spotlight.' },
] as const;
export type TrialIsland = typeof TRIAL_ISLANDS[number]['id'];
export function readTrialIsland(value: unknown): TrialIsland | undefined {
  return TRIAL_ISLANDS.find((island) => island.id === value)?.id;
}
export const NO_BEACHES_TRIAL: ActivitySuggestion = {
  id: ISLAND_TRIAL_ID, collection: 'Island Trials', category: 'Trial #001', moods: ['explore', 'create'], minutes: 30,
  title: 'No Beaches Allowed', hook: 'Think your island is the best? Prove it without a beach.',
  summary: 'One street, café, cultural moment or tiny story. Find the thing that makes your island special when the shoreline is out of the picture.',
  cover: { art: 'flag', line: 'STOP VOTING. START PROVING.', tone: 'gold' },
  steps: ['Pick one public, accessible spot or a story from your chosen island that isn’t about a beach. A local detail, a street or a moment that stayed with you is plenty. No purchase needed. For unfamiliar outdoor places, explore in daylight; a story from a previous visit works too.', 'Show or describe why it deserves the spotlight. Use your own words, photo or optional 15-second video. Ask before including people, respect local customs, and film only where allowed.', 'Give your discovery a punchline: “This is why I’m defending my island.” Keep it private or invite a friend to find their own answer. No public post or upload required.'],
  creator: { hook: 'Everybody talks about the beaches. Here’s what they missed.', filming: 'An original 15-second clip or photo-and-caption of a public detail. No beaches, strangers without consent or paid access required.', caption: 'Defending my island. The beach isn’t helping this time.', invitation: 'No Beaches Allowed. Pick Siargao, El Nido or Boracay and show what makes it special.' },
};
export function trialInviteHref(island?: TrialIsland) {
  return '/island-trials/no-beaches-allowed' + (island ? `/defend/${island}` : '?from=friend');
}
