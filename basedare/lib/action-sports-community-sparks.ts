export const ACTION_SPORTS_COMMUNITY_SPARK_VERSION = 1 as const;

export const ACTION_SPORTS_COMMUNITY_SPARKS = [
  {
    key: 'WAKEPARK_PROGRESSION_LAP',
    venueSlug: 'siargao-wakepark',
    title: 'Wakepark progression lap',
    instructions:
      'Choose one move already within your ability, follow the Wakepark operator’s instructions, and record one clean attempt from a safe public viewing area.',
    safety:
      'Use required safety gear, follow staff and park rules, and stop if conditions or your ability make the attempt unsafe.',
    discoveryRadiusKm: 0.35,
  },
  {
    key: 'MALINAO_SKATE_CLEAN_LINE',
    venueSlug: 'malinao-skate-road',
    title: 'Your-level clean line',
    instructions:
      'Link two or three skate moves already within your ability into one clean line without blocking other riders.',
    safety:
      'Wear appropriate protective gear, inspect the surface, yield to others, and never attempt a trick beyond your current ability for proof.',
    discoveryRadiusKm: 0.3,
  },
  {
    key: 'SURF_PREP_SIGNAL_MARCO',
    venueSlug: 'marco-surf-school-siargao',
    title: 'Surf-ready check',
    instructions:
      'Share one useful pre-surf observation: visible conditions, public access, or the safety guidance offered at the school.',
    safety:
      'Stay on public or customer-authorized ground. Do not enter the water for this Spark and never contradict local guides or posted warnings.',
    discoveryRadiusKm: 0.4,
  },
  {
    key: 'SURF_PREP_SIGNAL_KANAWAY',
    venueSlug: 'kanaway-surf-school',
    title: 'Surf-ready check',
    instructions:
      'Share one useful pre-surf observation: visible conditions, public access, or the safety guidance offered at the school.',
    safety:
      'Stay on public or customer-authorized ground. Do not enter the water for this Spark and never contradict local guides or posted warnings.',
    discoveryRadiusKm: 0.4,
  },
  {
    key: 'SURFIT_MOBILITY_RESET',
    venueSlug: 'surfit-gym-siargao',
    title: 'Ten-minute mobility reset',
    instructions:
      'Complete a gentle ten-minute mobility routine within your normal range and leave one useful, non-medical note for the next visitor.',
    safety:
      'Use only equipment you are authorized and competent to use. Stop for pain or dizziness; this is not medical or coaching advice.',
    discoveryRadiusKm: 0.25,
  },
  {
    key: 'PRIMEFIT_MOBILITY_RESET',
    venueSlug: 'primefit-gym-general-luna',
    title: 'Ten-minute mobility reset',
    instructions:
      'Complete a gentle ten-minute mobility routine within your normal range and leave one useful, non-medical note for the next visitor.',
    safety:
      'Use only equipment you are authorized and competent to use. Stop for pain or dizziness; this is not medical or coaching advice.',
    discoveryRadiusKm: 0.25,
  },
] as const;

export type ActionSportsCommunitySparkKey =
  (typeof ACTION_SPORTS_COMMUNITY_SPARKS)[number]['key'];

export const COMMUNITY_SPARK_DISCLAIMER =
  'Free Community Spark · no cash payout. Self-directed and not an official competition, venue offer, or endorsement.';

export function isActionSportsCommunitySparkKey(
  value: string
): value is ActionSportsCommunitySparkKey {
  return ACTION_SPORTS_COMMUNITY_SPARKS.some((spark) => spark.key === value);
}

export function getActionSportsCommunitySpark(key: ActionSportsCommunitySparkKey) {
  return ACTION_SPORTS_COMMUNITY_SPARKS.find((spark) => spark.key === key)!;
}

export function buildCommunitySparkTitle(input: {
  title: string;
  instructions: string;
  safety: string;
}) {
  return `${input.title} — ${input.instructions} Safety: ${input.safety}`;
}
