export const ACTION_SPORTS_COMMUNITY_SPARK_VERSION = 5 as const;

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
    title: 'Land a wakeboard trick in 3 tries',
    hook: 'Pick one safe trick. You get three tries—keep your best landing or funniest miss.',
    instructions: 'Choose one wakeboard trick you can already do and give it up to three tries.',
    capturePrompt: 'Save your best landing or funniest safe miss.',
    socialPrompt: 'Challenge a friend to try the same trick.',
    safety:
      'Use required safety gear, follow operator instructions and park rules, and stop if conditions or your ability make the attempt unsafe.',
    estimatedMinutes: 20,
    crew: 'Solo or 1–3 friends',
    discoveryRadiusKm: 0.35,
  },
  {
    key: 'MALINAO_SKATE_CLEAN_LINE',
    venueSlug: 'malinao-skate-road',
    title: 'Make a skate combo',
    hook: 'Link 2–3 easy moves, name the combo, then ask a friend to copy it.',
    instructions: 'Choose two or three skate moves you already know and do them in a row.',
    capturePrompt: 'Keep one clip that shows the full combo.',
    socialPrompt: 'Ask a friend to copy it or change one move.',
    safety:
      'Wear appropriate protective gear, inspect the surface, yield to others, and never attempt a trick beyond your current ability for the clip.',
    estimatedMinutes: 20,
    crew: 'Best with 1–3 friends',
    discoveryRadiusKm: 0.3,
  },
  {
    key: 'SURF_PREP_SIGNAL_MARCO',
    venueSlug: 'marco-surf-school-siargao',
    title: 'What’s your pre-surf routine?',
    hook: 'Pick three things you always do before paddling out. Compare yours with a surf buddy.',
    instructions: 'Choose three simple things you do before surfing and run through them in order.',
    capturePrompt: 'Keep one quick clip of all three steps.',
    socialPrompt: 'Ask a surf buddy what they do differently.',
    safety:
      'Stay on public or customer-authorized ground, follow local guidance, and get consent before filming anyone. Entering the water is not required.',
    estimatedMinutes: 15,
    crew: 'Solo or with a surf buddy',
    discoveryRadiusKm: 0.4,
  },
  {
    key: 'SURF_PREP_SIGNAL_KANAWAY',
    venueSlug: 'kanaway-surf-school',
    title: 'Choose today’s surf plan',
    hook: 'Rent a board, find a boat crew or surf from shore—pick one and invite a friend.',
    instructions: 'Choose one real option for today: board rental, boat crew or beach session.',
    capturePrompt: 'Share what you picked and why.',
    socialPrompt: 'Invite a friend to choose the next surf plan.',
    safety:
      'Ask before filming staff or customers, make no partnership claim, and never treat a boat or rental option as confirmed until the operator confirms it.',
    estimatedMinutes: 15,
    crew: 'Solo or with a surf buddy',
    discoveryRadiusKm: 0.4,
  },
  {
    key: 'SURFIT_MOBILITY_RESET',
    venueSlug: 'surfit-gym-siargao',
    title: 'Make a mini workout',
    hook: 'Choose three easy exercises. Do one round, then challenge a friend to copy it.',
    instructions: 'Choose three exercises you can do safely and complete one easy round.',
    capturePrompt: 'Keep one quick clip of the full round.',
    socialPrompt: 'Ask a friend to copy it or change one exercise.',
    safety:
      'Use only equipment you are authorized and competent to use. Stop for pain or dizziness; this is not medical or coaching advice.',
    estimatedMinutes: 10,
    crew: 'Solo or with one friend',
    discoveryRadiusKm: 0.25,
  },
  {
    key: 'PRIMEFIT_MOBILITY_RESET',
    venueSlug: 'primefit-gym-general-luna',
    title: 'Stretch with a friend',
    hook: 'Pick two easy stretches. Your friend adds one. Do all three together.',
    instructions: 'Choose two gentle stretches, let a friend choose the third, then do all three.',
    capturePrompt: 'Keep one quick clip of all three stretches.',
    socialPrompt: 'Pass it on and let the next friend change one stretch.',
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
