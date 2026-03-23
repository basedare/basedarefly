export type PlaceChallengeTemplate = {
  id: string;
  label: string;
  title: string;
  description: string;
  missionTag: string;
  discoveryRadiusKm: number;
};

type PlaceChallengeTemplateInput = {
  placeName: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  categories?: string[] | null;
};

type PlaceArchetype =
  | 'nightlife'
  | 'beach'
  | 'food'
  | 'landmark'
  | 'street'
  | 'local-spot';

const ARCHETYPE_KEYWORDS: Record<PlaceArchetype, string[]> = {
  nightlife: ['bar', 'club', 'nightlife', 'rooftop', 'lounge', 'pub', 'party', 'cocktail'],
  beach: ['beach', 'coast', 'bay', 'lookout', 'ocean', 'surf', 'pool', 'shore', 'icebergs'],
  food: ['cafe', 'coffee', 'restaurant', 'food', 'bakery', 'brunch', 'diner', 'eatery'],
  landmark: ['landmark', 'museum', 'opera', 'tower', 'bridge', 'monument', 'gallery', 'icon'],
  street: ['boardwalk', 'street', 'market', 'plaza', 'pier', 'dock', 'harbour', 'harbor', 'walk'],
  'local-spot': [],
};

const TEMPLATES: Record<PlaceArchetype, PlaceChallengeTemplate[]> = {
  nightlife: [
    {
      id: 'nightlife-crowd-energy',
      label: 'Crowd energy',
      title: 'Capture the livest crowd energy here tonight',
      description: 'Film a clean 20-second moment that proves this place is where the night is happening.',
      missionTag: 'nightlife',
      discoveryRadiusKm: 0.5,
    },
    {
      id: 'nightlife-entrance',
      label: 'Entrance scene',
      title: 'Show the wildest entrance moment at this venue',
      description: 'Catch the arrival, the queue, or the first hit of energy that makes this spot feel electric.',
      missionTag: 'nightlife',
      discoveryRadiusKm: 0.5,
    },
    {
      id: 'nightlife-signature',
      label: 'Signature ritual',
      title: 'Film the signature ritual everyone remembers here',
      description: 'Capture the toast, the drop, or the crowd ritual that defines this venue.',
      missionTag: 'party',
      discoveryRadiusKm: 0.5,
    },
  ],
  beach: [
    {
      id: 'beach-sunrise',
      label: 'Sunrise shot',
      title: 'Capture the cleanest sunrise or sunset moment here',
      description: 'Film the shot that proves this place is worth the walk, swim, or early wake-up.',
      missionTag: 'scenic',
      discoveryRadiusKm: 1,
    },
    {
      id: 'beach-hidden-angle',
      label: 'Hidden angle',
      title: 'Show the best hidden angle only locals know here',
      description: 'Find a perspective that makes this place feel secret, cinematic, and unmistakably local.',
      missionTag: 'hidden-gem',
      discoveryRadiusKm: 1,
    },
    {
      id: 'beach-atmosphere',
      label: 'Local pulse',
      title: 'Capture the local pulse of this shoreline in one take',
      description: 'Film the sound, the motion, and the atmosphere that make this place feel alive right now.',
      missionTag: 'ocean',
      discoveryRadiusKm: 1,
    },
  ],
  food: [
    {
      id: 'food-signature-order',
      label: 'Signature order',
      title: 'Capture the order or dish that defines this place',
      description: 'Show what someone has to get here if they only have one shot to experience it right.',
      missionTag: 'food',
      discoveryRadiusKm: 0.5,
    },
    {
      id: 'food-best-corner',
      label: 'Best corner',
      title: 'Show the best table, corner, or seat in this spot',
      description: 'Find the little ritual or physical detail that makes this place worth returning to.',
      missionTag: 'ritual',
      discoveryRadiusKm: 0.5,
    },
    {
      id: 'food-first-impression',
      label: 'First impression',
      title: 'Film a clean first-impression walkthrough here',
      description: 'Capture the first 15 seconds that tell someone what kind of place this is.',
      missionTag: 'local-spot',
      discoveryRadiusKm: 0.5,
    },
  ],
  landmark: [
    {
      id: 'landmark-bold-intro',
      label: 'Bold intro',
      title: 'Do your boldest intro in front of this landmark',
      description: 'Film a fast, confident intro that turns this place into a story instead of a backdrop.',
      missionTag: 'landmark',
      discoveryRadiusKm: 1,
    },
    {
      id: 'landmark-cinematic',
      label: 'Cinematic angle',
      title: 'Capture the most cinematic angle of this icon',
      description: 'Show a perspective that makes this place feel larger than life without losing the local reality.',
      missionTag: 'iconic',
      discoveryRadiusKm: 1,
    },
    {
      id: 'landmark-guide',
      label: 'Micro guide',
      title: 'Film a 10-second guide to why this spot matters',
      description: 'Make a tiny field guide that explains the place like a local operator would.',
      missionTag: 'travel',
      discoveryRadiusKm: 1,
    },
  ],
  street: [
    {
      id: 'street-boardwalk-intro',
      label: 'Street intro',
      title: 'Capture the strongest street-level intro at this place',
      description: 'Film one clean sequence that shows the movement, noise, and personality of this location.',
      missionTag: 'street',
      discoveryRadiusKm: 1,
    },
    {
      id: 'street-alive-now',
      label: 'Alive now',
      title: 'Prove this place is alive right now',
      description: 'Show the people, rhythm, and texture that make this spot feel active in this exact moment.',
      missionTag: 'pulse',
      discoveryRadiusKm: 1,
    },
    {
      id: 'street-local-angle',
      label: 'Local angle',
      title: 'Show the local angle visitors usually miss here',
      description: 'Find a frame that turns this from a map point into a place with its own energy.',
      missionTag: 'local-spot',
      discoveryRadiusKm: 1,
    },
  ],
  'local-spot': [
    {
      id: 'local-spot-story',
      label: 'Start the story',
      title: 'Start the story at this place',
      description: 'Capture the proof, movement, or local texture that makes this spot worth remembering.',
      missionTag: 'place',
      discoveryRadiusKm: 0.5,
    },
    {
      id: 'local-spot-hidden',
      label: 'Hidden gem',
      title: 'Show why this place deserves hidden-gem status',
      description: 'Film the detail that makes this spot feel more valuable than it looks on a normal map.',
      missionTag: 'hidden-gem',
      discoveryRadiusKm: 0.5,
    },
    {
      id: 'local-spot-proof',
      label: 'Proof of life',
      title: 'Capture proof that this place has real local energy',
      description: 'Show the scene that makes this location feel like part of the grid instead of a blank point.',
      missionTag: 'local-spot',
      discoveryRadiusKm: 0.5,
    },
  ],
};

function normalizeParts(input: PlaceChallengeTemplateInput) {
  return [
    input.placeName,
    input.address,
    input.city,
    input.country,
    ...(input.categories ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function inferPlaceChallengeArchetype(
  input: PlaceChallengeTemplateInput
): PlaceArchetype {
  const haystack = normalizeParts(input);

  for (const archetype of ['nightlife', 'beach', 'food', 'landmark', 'street'] as const) {
    const matched = ARCHETYPE_KEYWORDS[archetype].some((keyword) => haystack.includes(keyword));
    if (matched) {
      return archetype;
    }
  }

  return 'local-spot';
}

export function getPlaceChallengeTemplates(
  input: PlaceChallengeTemplateInput
): {
  archetype: PlaceArchetype;
  title: string;
  description: string;
  templates: PlaceChallengeTemplate[];
} {
  const archetype = inferPlaceChallengeArchetype(input);

  const titleMap: Record<PlaceArchetype, string> = {
    nightlife: 'Suggested for this nightlife spot',
    beach: 'Suggested for this shoreline',
    food: 'Suggested for this food spot',
    landmark: 'Suggested for this landmark',
    street: 'Suggested for this live location',
    'local-spot': 'Suggested for this place',
  };

  const descriptionMap: Record<PlaceArchetype, string> = {
    nightlife: 'Use the venue type to start from stronger, more native challenge language instead of a blank form.',
    beach: 'These prompts are tuned for scenic places, lookout energy, and moments people actually want to prove.',
    food: 'These prompts bias toward rituals, signature moments, and why this place is worth returning to.',
    landmark: 'These suggestions turn iconic places into performable challenges instead of passive photo stops.',
    street: 'These prompts are built for boardwalks, docks, markets, and places where the local pulse matters.',
    'local-spot': 'Start from a sharp template, then tune the wording to fit this exact spot.',
  };

  return {
    archetype,
    title: titleMap[archetype],
    description: descriptionMap[archetype],
    templates: TEMPLATES[archetype],
  };
}
