export const ACTION_SPORTS_COMMUNITY_SPARK_VERSION = 3 as const;

export const ACTION_SPORTS_COMMUNITY_SPARK_KEYS = [
  'WAKEPARK_PROGRESSION_LAP',
  'MALINAO_SKATE_CLEAN_LINE',
  'SURF_PREP_SIGNAL_MARCO',
  'SURF_PREP_SIGNAL_KANAWAY',
  'SURFIT_MOBILITY_RESET',
  'PRIMEFIT_MOBILITY_RESET',
] as const;

export type ActionSportsCommunitySparkKey =
  (typeof ACTION_SPORTS_COMMUNITY_SPARK_KEYS)[number];

export type ActionSportsCommunitySpark = {
  key: ActionSportsCommunitySparkKey;
  venueSlug: string;
  title: string;
  hook: string;
  instructions: string;
  capturePrompt: string;
  socialPrompt: string;
  safety: string;
  estimatedMinutes: number;
  crew: string;
  discoveryRadiusKm: number;
};

export const ACTION_SPORTS_COMMUNITY_SPARKS = [
  {
    key: 'WAKEPARK_PROGRESSION_LAP',
    venueSlug: 'siargao-wakepark',
    title: 'Three tries, one clean lap',
    hook: 'Call the move. Three tries. Land it—or keep the funniest miss.',
    instructions: 'Pick a move you know. Say it. Go.',
    capturePrompt: 'Keep the landing or funniest safe miss.',
    socialPrompt: 'Tag the friend who has to try next.',
    safety:
      'Use required safety gear, follow operator instructions and park rules, and stop if conditions or your ability make the attempt unsafe.',
    estimatedMinutes: 20,
    crew: 'Solo or 1–3 friends',
    discoveryRadiusKm: 0.35,
  },
  {
    key: 'MALINAO_SKATE_CLEAN_LINE',
    venueSlug: 'malinao-skate-road',
    title: 'Name your line',
    hook: 'Build a two-or-three-move line. Name it. Make a friend match or remix it.',
    instructions: 'Call the line, then link two or three moves you already know.',
    capturePrompt: 'One angle. Full line. Crew reaction.',
    socialPrompt: 'Challenge a friend: match it or remix it.',
    safety:
      'Wear appropriate protective gear, inspect the surface, yield to others, and never attempt a trick beyond your current ability for the clip.',
    estimatedMinutes: 20,
    crew: 'Best with 1–3 friends',
    discoveryRadiusKm: 0.3,
  },
  {
    key: 'SURF_PREP_SIGNAL_MARCO',
    venueSlug: 'marco-surf-school-siargao',
    title: 'Three things before you surf',
    hook: 'Show the three things you never skip before a session.',
    instructions: 'Show your three-step ritual, then the local signal shaping today’s plan.',
    capturePrompt: 'Three fast shots. Finish with today’s signal.',
    socialPrompt: 'Tag a surfer: what did they forget?',
    safety:
      'Stay on public or customer-authorized ground, follow local guidance, and get consent before filming anyone. Entering the water is not required.',
    estimatedMinutes: 15,
    crew: 'Solo or with a surf buddy',
    discoveryRadiusKm: 0.4,
  },
  {
    key: 'SURF_PREP_SIGNAL_KANAWAY',
    venueSlug: 'kanaway-surf-school',
    title: 'Board, boat or beach?',
    hook: 'You get one surf day. Pick your route.',
    instructions: 'Confirm one real option today: board, boat, or beach launch.',
    capturePrompt: 'Reveal your pick—and why.',
    socialPrompt: 'Ask the next person: board, boat or beach?',
    safety:
      'Ask before filming staff or customers, make no partnership claim, and never treat a boat or rental option as confirmed until the operator confirms it.',
    estimatedMinutes: 15,
    crew: 'Solo or with a surf buddy',
    discoveryRadiusKm: 0.4,
  },
  {
    key: 'SURFIT_MOBILITY_RESET',
    venueSlug: 'surfit-gym-siargao',
    title: 'Build a three-move flow',
    hook: 'Three easy moves. One smooth flow. Can your friend copy it?',
    instructions: 'Pick three gentle moves and name the combo.',
    capturePrompt: 'Film one clean round.',
    socialPrompt: 'Challenge a friend to copy it or swap one move.',
    safety:
      'Use only equipment you are authorized and competent to use. Stop for pain or dizziness; this is not medical or coaching advice.',
    estimatedMinutes: 10,
    crew: 'Solo or with one friend',
    discoveryRadiusKm: 0.25,
  },
  {
    key: 'PRIMEFIT_MOBILITY_RESET',
    venueSlug: 'primefit-gym-general-luna',
    title: 'Finish the reset',
    hook: 'You pick two moves. Your friend picks the last.',
    instructions: 'Build one gentle three-move reset together.',
    capturePrompt: 'Film one round. Show all three move names.',
    socialPrompt: 'Pass it on: change only the final move.',
    safety:
      'Use only equipment you are authorized and competent to use. Stop for pain or dizziness; this is not medical or coaching advice.',
    estimatedMinutes: 10,
    crew: 'Best with one friend',
    discoveryRadiusKm: 0.25,
  },
] as const satisfies readonly ActionSportsCommunitySpark[];

export const COMMUNITY_SPARK_DISCLAIMER =
  'Free to play · no cash reward. Follow local rules; this is not an official competition or venue offer.';

export function isActionSportsCommunitySparkKey(
  value: string
): value is ActionSportsCommunitySparkKey {
  return ACTION_SPORTS_COMMUNITY_SPARK_KEYS.some((key) => key === value);
}

export function getActionSportsCommunitySpark(key: ActionSportsCommunitySparkKey) {
  return ACTION_SPORTS_COMMUNITY_SPARKS.find((spark) => spark.key === key)!;
}

export function getActionSportsCommunitySparkStreamId(
  key: ActionSportsCommunitySparkKey,
  version: number = ACTION_SPORTS_COMMUNITY_SPARK_VERSION,
) {
  return `community-spark:${key.toLowerCase()}:v${version}`;
}

export function getActionSportsCommunitySparkByStreamId(streamId: string | null | undefined) {
  const match = streamId?.match(/^community-spark:([a-z0-9_]+):v(\d+)$/i);
  if (!match) return null;

  const key = match[1].toUpperCase();
  if (!isActionSportsCommunitySparkKey(key)) return null;

  const version = Number(match[2]);
  return {
    ...getActionSportsCommunitySpark(key),
    version,
    isCurrentVersion: version === ACTION_SPORTS_COMMUNITY_SPARK_VERSION,
  };
}

export function buildCommunitySparkTitle(input: {
  title: string;
  instructions: string;
  safety: string;
}) {
  return `${input.title} — ${input.instructions} Safety: ${input.safety}`;
}
