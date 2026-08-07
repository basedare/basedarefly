export const ACTION_SPORTS_COMMUNITY_SPARK_VERSION = 2 as const;

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
    hook: 'Call your move, give it up to three safe tries, and keep the clip that makes the crew react.',
    instructions:
      'Choose one move already within your ability, say it to camera, follow the Wakepark operator’s directions, and take up to three attempts.',
    capturePrompt:
      'Film from a safe public viewing area and keep the clean landing or funniest safe miss.',
    socialPrompt:
      'Tag a friend and ask them to call their own three-try move.',
    safety:
      'Use required safety gear, follow staff and park rules, and stop if conditions or your ability make the attempt unsafe.',
    estimatedMinutes: 20,
    crew: 'Solo or 1–3 friends',
    discoveryRadiusKm: 0.35,
  },
  {
    key: 'MALINAO_SKATE_CLEAN_LINE',
    venueSlug: 'malinao-skate-road',
    title: 'Name your line',
    hook: 'Link two or three moves, give the combo a name, and see if a friend can match it.',
    instructions:
      'Choose two or three skate moves already within your ability, name the line on camera, and connect them without blocking other riders.',
    capturePrompt:
      'Use one clear side angle that shows the full line and the crew reaction.',
    socialPrompt:
      'Pass the named line to a friend: match it, remix it, or invent a safer one.',
    safety:
      'Wear appropriate protective gear, inspect the surface, yield to others, and never attempt a trick beyond your current ability for the clip.',
    estimatedMinutes: 20,
    crew: 'Best with 1–3 friends',
    discoveryRadiusKm: 0.3,
  },
  {
    key: 'SURF_PREP_SIGNAL_MARCO',
    venueSlug: 'marco-surf-school-siargao',
    title: 'Show your pre-surf ritual',
    hook: 'Turn the three small things that get you surf-ready into a fast before-the-water story.',
    instructions:
      'Show three safe steps from your own pre-surf routine, then add one visible local signal or piece of public guidance that changed today’s plan.',
    capturePrompt:
      'Shoot three quick close-ups of your gear or routine, then finish on the local signal you noticed.',
    socialPrompt:
      'Ask another surfer which one step they never skip before a session.',
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
    hook: 'Make a three-shot mini-story about the kind of surf day Kanaway makes possible right now.',
    instructions:
      'From public or customer-authorized ground, choose one option you can confirm today: board rental, a boat enquiry, or the beach-launch context.',
    capturePrompt:
      'Film an opening frame, the choice you checked, and a reveal of what you learned. Confirm availability before saying it is available.',
    socialPrompt:
      'End with the question: board, boat or beach—which route would you pick?',
    safety:
      'Ask before filming staff or customers, make no partnership claim, and never treat a boat or rental option as confirmed until the operator confirms it.',
    estimatedMinutes: 15,
    crew: 'Solo or with a surf buddy',
    discoveryRadiusKm: 0.4,
  },
  {
    key: 'SURFIT_MOBILITY_RESET',
    venueSlug: 'surfit-gym-siargao',
    title: 'Three-move mobility chain',
    hook: 'Build three easy moves into one smooth flow and challenge a friend to copy it.',
    instructions:
      'Choose three gentle mobility moves within your normal range, connect them into a short repeatable flow, and give the sequence a name.',
    capturePrompt:
      'Film one full round from an angle that keeps walkways and other gym users clear.',
    socialPrompt:
      'Send the flow to a friend and ask them to copy it or swap one move.',
    safety:
      'Use only equipment you are authorized and competent to use. Stop for pain or dizziness; this is not medical or coaching advice.',
    estimatedMinutes: 10,
    crew: 'Solo or with one friend',
    discoveryRadiusKm: 0.25,
  },
  {
    key: 'PRIMEFIT_MOBILITY_RESET',
    venueSlug: 'primefit-gym-general-luna',
    title: 'Post-surf reset remix',
    hook: 'Pick a song, build a gentle three-move reset, and let a friend add the final move.',
    instructions:
      'Choose two gentle recovery moves within your normal range, then let a friend add a third safe move to complete the reset.',
    capturePrompt:
      'Film one smooth round with the three move names appearing in order.',
    socialPrompt:
      'Pass the remix on and ask the next person to change only the final move.',
    safety:
      'Use only equipment you are authorized and competent to use. Stop for pain or dizziness; this is not medical or coaching advice.',
    estimatedMinutes: 10,
    crew: 'Best with one friend',
    discoveryRadiusKm: 0.25,
  },
] as const satisfies readonly ActionSportsCommunitySpark[];

export const COMMUNITY_SPARK_DISCLAIMER =
  'Free to play · no cash reward. Self-directed—not an official competition, venue offer, partnership, or endorsement.';

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
