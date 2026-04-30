export type PlaceChallengeTemplate = {
  id: string;
  label: string;
  title: string;
  description: string;
  missionTag: string;
  discoveryRadiusKm: number;
  creatorAngle: string;
  proofMetric: string;
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
  | 'surf'
  | 'beach'
  | 'food'
  | 'wellness'
  | 'stay'
  | 'landmark'
  | 'street'
  | 'local-spot';

type PlaceTemplateContext = {
  place: string;
  location: string;
  category: string;
  anchor: string;
  signal: string;
  proof: string;
  creator: string;
};

const ARCHETYPE_KEYWORDS: Record<PlaceArchetype, string[]> = {
  nightlife: ['bar', 'club', 'nightlife', 'rooftop', 'lounge', 'pub', 'party', 'cocktail', 'music', 'afterparty'],
  surf: ['surf', 'wave', 'cloud 9', 'boardwalk', 'reef', 'break', 'catangnan', 'barrel', 'tide'],
  beach: ['beach', 'coast', 'bay', 'lookout', 'ocean', 'pool', 'shore', 'icebergs', 'harbour', 'harbor', 'sunset'],
  food: ['cafe', 'coffee', 'restaurant', 'food', 'bakery', 'brunch', 'diner', 'eatery', 'menu', 'kitchen'],
  wellness: ['gym', 'fitness', 'yoga', 'wellness', 'spa', 'sauna', 'recovery', 'pilates'],
  stay: ['hotel', 'hostel', 'resort', 'villa', 'hideaway', 'stay', 'lobby', 'suite', 'guesthouse'],
  landmark: ['landmark', 'museum', 'opera', 'tower', 'bridge', 'monument', 'gallery', 'icon', 'iconic'],
  street: ['street', 'market', 'plaza', 'pier', 'dock', 'walk', 'wharf', 'ferry', 'corridor'],
  'local-spot': [],
};

const TEMPLATES: Record<PlaceArchetype, PlaceChallengeTemplate[]> = {
  nightlife: [
    {
      id: 'nightlife-crowd-energy',
      label: 'Crowd energy',
      title: "Capture {place}'s loudest crowd moment tonight",
      description: 'Film a clean 20-second clip at {anchor}. Show {signal}, then end with one usable crowd reaction the venue can repost.',
      missionTag: 'nightlife',
      discoveryRadiusKm: 0.5,
      creatorAngle: 'Best for creators who can make a venue feel packed, loud, and worth joining.',
      proofMetric: 'Reusable crowd clip + recognizable venue context.',
    },
    {
      id: 'nightlife-entrance',
      label: 'Door signal',
      title: 'Show the first hit of energy when someone enters {place}',
      description: 'Film the arrival, door, queue, host, or first room reveal at {anchor}. The clip should make viewers understand the vibe fast.',
      missionTag: 'nightlife',
      discoveryRadiusKm: 0.5,
      creatorAngle: 'Turns the venue arrival into a simple short-form hook.',
      proofMetric: 'Entrance proof + first-impression content.',
    },
    {
      id: 'nightlife-signature',
      label: 'Signature ritual',
      title: 'Film the ritual people remember from {place}',
      description: 'Capture the toast, track drop, bartender move, table moment, or late-night ritual that makes {place} different from a generic bar.',
      missionTag: 'party',
      discoveryRadiusKm: 0.5,
      creatorAngle: 'Gives the venue a repeatable identity instead of one random post.',
      proofMetric: 'Venue ritual + repeatable content angle.',
    },
  ],
  surf: [
    {
      id: 'surf-pre-session',
      label: 'Pre-surf ritual',
      title: 'Film the pre-surf ritual at {place}',
      description: 'Capture boards, wax, coffee, boardwalk movement, or the walk toward the break around {anchor}. Make it feel like a real local start, not a stock travel shot.',
      missionTag: 'surf',
      discoveryRadiusKm: 1,
      creatorAngle: 'Perfect for surf creators, island vloggers, and travel reels.',
      proofMetric: 'Local surf context + presence at the venue.',
    },
    {
      id: 'surf-wave-check',
      label: 'Wave check',
      title: 'Give {place} a 15-second wave-check report',
      description: 'Stand at the recognizable anchor near {place}, show the conditions, and explain whether someone should come now, wait, or bring a board.',
      missionTag: 'surf',
      discoveryRadiusKm: 1,
      creatorAngle: 'Makes the creator useful to locals and visitors in one clip.',
      proofMetric: 'Time-stamped conditions + location proof.',
    },
    {
      id: 'surf-local-legend',
      label: 'Local legend',
      title: 'Find the detail that makes {place} a surf legend node',
      description: 'Film one object, sign, angle, person, sound, or ritual that explains why {place} matters on the island grid.',
      missionTag: 'iconic',
      discoveryRadiusKm: 1,
      creatorAngle: 'Turns a famous surf spot into story, not just scenery.',
      proofMetric: 'Recognizable anchor + local story hook.',
    },
  ],
  beach: [
    {
      id: 'beach-golden-hour',
      label: 'Golden hour',
      title: "Capture {place}'s cleanest golden-hour proof",
      description: 'Film the shot that proves {place} is worth the walk, swim, ride, or early wake-up. Include {signal} and one clean venue or location anchor.',
      missionTag: 'scenic',
      discoveryRadiusKm: 1,
      creatorAngle: 'Works for travel, lifestyle, couple, and food creators near the coast.',
      proofMetric: 'Scenic proof + recognizable local anchor.',
    },
    {
      id: 'beach-hidden-angle',
      label: 'Hidden angle',
      title: 'Show the hidden angle visitors miss at {place}',
      description: 'Find a perspective around {anchor} that makes the place feel secret, cinematic, and specific to {location}.',
      missionTag: 'hidden-gem',
      discoveryRadiusKm: 1,
      creatorAngle: 'Rewards creators who can scout better frames than normal tourists.',
      proofMetric: 'Distinct angle + location-specific content.',
    },
    {
      id: 'beach-local-pulse',
      label: 'Local pulse',
      title: 'Capture the local pulse around {place} in one take',
      description: 'Show people, movement, water, music, dogs, boards, boats, or sunset traffic. The clip should prove the place is alive right now.',
      missionTag: 'ocean',
      discoveryRadiusKm: 1,
      creatorAngle: 'Good for creators who are better at atmosphere than stunts.',
      proofMetric: 'Live scene proof + timestamp-worthy activity.',
    },
  ],
  food: [
    {
      id: 'food-signature-order',
      label: 'Signature order',
      title: 'Order the thing that defines {place}',
      description: 'Film the order, reveal, first bite, and one sentence on why someone should come to {place} instead of scrolling past it.',
      missionTag: 'food',
      discoveryRadiusKm: 0.5,
      creatorAngle: 'Clear monetization rail for food creators and micro-reviewers.',
      proofMetric: 'Owned food clip + venue mention.',
    },
    {
      id: 'food-best-seat',
      label: 'Best seat',
      title: 'Find the best seat or corner inside {place}',
      description: 'Show the exact table, counter, window, view, or quiet corner that makes {place} feel worth returning to.',
      missionTag: 'ritual',
      discoveryRadiusKm: 0.5,
      creatorAngle: 'Creates practical discovery content, not generic food footage.',
      proofMetric: 'Interior proof + return-visit hook.',
    },
    {
      id: 'food-speed-review',
      label: 'Speed review',
      title: 'Give {place} a 15-second honest menu verdict',
      description: 'Film one dish or drink, say who should order it, and end with the one friend you would bring here.',
      missionTag: 'local-spot',
      discoveryRadiusKm: 0.5,
      creatorAngle: 'Simple enough for any creator, useful enough for the venue to repost.',
      proofMetric: 'Menu proof + creator recommendation.',
    },
  ],
  wellness: [
    {
      id: 'wellness-reset',
      label: 'Reset ritual',
      title: 'Film the reset ritual at {place}',
      description: 'Capture the warm-up, workout, recovery, breath, or after-glow moment that makes {place} feel like a real habit.',
      missionTag: 'wellness',
      discoveryRadiusKm: 0.5,
      creatorAngle: 'Best for fitness, wellness, yoga, and routine-based creators.',
      proofMetric: 'Routine proof + habit-building content.',
    },
    {
      id: 'wellness-challenge',
      label: 'Micro challenge',
      title: 'Complete a clean micro-challenge at {place}',
      description: 'Do one safe, filmable challenge at {anchor}: plank, mobility flow, breath hold, recovery dip, or coach-approved movement.',
      missionTag: 'fitness',
      discoveryRadiusKm: 0.5,
      creatorAngle: 'Turns wellness venues into action loops without making it unsafe.',
      proofMetric: 'Completed movement + venue proof.',
    },
    {
      id: 'wellness-before-after',
      label: 'Before/after',
      title: 'Show the before-and-after energy of {place}',
      description: 'Film one clip before the session and one after. The point is to prove the venue changed your state.',
      missionTag: 'recovery',
      discoveryRadiusKm: 0.5,
      creatorAngle: 'Strong for venues selling transformation, calm, or performance.',
      proofMetric: 'Two-state proof + emotional outcome.',
    },
  ],
  stay: [
    {
      id: 'stay-arrival',
      label: 'Arrival ritual',
      title: 'Film the arrival moment that sells {place}',
      description: 'Capture the walk-in, view, lobby, staff greeting, room reveal, or first drink. Make the first 10 seconds feel like someone just arrived.',
      missionTag: 'stay',
      discoveryRadiusKm: 0.5,
      creatorAngle: 'Works for hotel, resort, hostel, villa, and guesthouse creators.',
      proofMetric: 'Arrival proof + bookable first impression.',
    },
    {
      id: 'stay-best-corner',
      label: 'Best corner',
      title: 'Show the best corner of {place} most guests miss',
      description: 'Find one view, seat, light pocket, pool angle, hallway, garden, or lobby detail that turns {place} into a memory.',
      missionTag: 'hidden-gem',
      discoveryRadiusKm: 0.5,
      creatorAngle: 'Gives venues content that feels discovered, not staged.',
      proofMetric: 'Hidden amenity + venue identity.',
    },
    {
      id: 'stay-host-proof',
      label: 'Host proof',
      title: 'Prove what kind of guest belongs at {place}',
      description: 'Film a short scene showing the guest vibe: surfer, backpacker, couple, remote worker, party crew, or quiet reset.',
      missionTag: 'hospitality',
      discoveryRadiusKm: 0.5,
      creatorAngle: 'Helps the venue attract the right customer, not just more views.',
      proofMetric: 'Audience fit + venue positioning signal.',
    },
  ],
  landmark: [
    {
      id: 'landmark-bold-intro',
      label: 'Bold intro',
      title: 'Do your boldest intro at {place}',
      description: 'Film a fast, confident intro that turns {place} into a story instead of a passive backdrop.',
      missionTag: 'landmark',
      discoveryRadiusKm: 1,
      creatorAngle: 'Lets creators use public icons as a stage.',
      proofMetric: 'Recognizable landmark + creator hook.',
    },
    {
      id: 'landmark-cinematic',
      label: 'Cinematic angle',
      title: 'Capture the most cinematic angle of {place}',
      description: 'Show a perspective that makes {place} feel larger than life without losing the local reality around {location}.',
      missionTag: 'iconic',
      discoveryRadiusKm: 1,
      creatorAngle: 'Built for travel, drone-style framing, and cinematic editors.',
      proofMetric: 'Iconic angle + shareable location content.',
    },
    {
      id: 'landmark-guide',
      label: 'Micro guide',
      title: 'Film a 10-second guide to why {place} matters',
      description: 'Explain the place like a local operator would: what it is, why it matters, and what someone should do next.',
      missionTag: 'travel',
      discoveryRadiusKm: 1,
      creatorAngle: 'Turns passive foot traffic into useful creator output.',
      proofMetric: 'Educational proof + visitor intent.',
    },
  ],
  street: [
    {
      id: 'street-alive-now',
      label: 'Alive now',
      title: 'Prove {place} is alive at street level right now',
      description: 'Show the people, rhythm, sound, and texture around {anchor}. The point is to make the grid feel current.',
      missionTag: 'pulse',
      discoveryRadiusKm: 1,
      creatorAngle: 'Good for creators who can read a street scene fast.',
      proofMetric: 'Live movement + local texture.',
    },
    {
      id: 'street-local-angle',
      label: 'Local angle',
      title: 'Show the local angle visitors miss at {place}',
      description: 'Find one frame, route, stall, dock, sign, or interaction that turns {place} from a map point into a place with personality.',
      missionTag: 'local-spot',
      discoveryRadiusKm: 1,
      creatorAngle: 'Rewards creators who can scout, not just perform.',
      proofMetric: 'Local discovery + useful route context.',
    },
    {
      id: 'street-stranger-spark',
      label: 'Stranger spark',
      title: 'Start one safe stranger interaction at {place}',
      description: 'Ask for a recommendation, quick rating, local tip, or photo direction. Keep it respectful, public, and easy to verify.',
      missionTag: 'street',
      discoveryRadiusKm: 1,
      creatorAngle: 'Makes creator content social without pushing unsafe chaos.',
      proofMetric: 'Human interaction + public-place proof.',
    },
  ],
  'local-spot': [
    {
      id: 'local-spot-story',
      label: 'Start the story',
      title: 'Start the story at {place}',
      description: 'Capture the proof, movement, or local texture that makes {place} worth remembering on the grid.',
      missionTag: 'place',
      discoveryRadiusKm: 0.5,
      creatorAngle: 'The safest default when BaseDare has limited venue metadata.',
      proofMetric: 'First usable venue proof.',
    },
    {
      id: 'local-spot-hidden',
      label: 'Hidden gem',
      title: 'Show why {place} deserves hidden-gem status',
      description: 'Film the detail that makes {place} feel more valuable than it looks on a normal map.',
      missionTag: 'hidden-gem',
      discoveryRadiusKm: 0.5,
      creatorAngle: 'Gives creators an easy discovery angle when the brief is open.',
      proofMetric: 'Hidden detail + place identity.',
    },
    {
      id: 'local-spot-proof',
      label: 'Proof of life',
      title: 'Capture proof that {place} has real local energy',
      description: 'Show the scene that makes this location feel like part of the BaseDare grid instead of a blank coordinate.',
      missionTag: 'local-spot',
      discoveryRadiusKm: 0.5,
      creatorAngle: 'Turns dormant pins into first-memory targets.',
      proofMetric: 'Presence proof + first spark signal.',
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

function cleanText(value?: string | null) {
  return value?.trim().replace(/\s+/g, ' ') || null;
}

function getArchetypeLabel(archetype: PlaceArchetype) {
  return archetype.replace('-', ' ');
}

function buildContext(input: PlaceChallengeTemplateInput, archetype: PlaceArchetype): PlaceTemplateContext {
  const place = cleanText(input.placeName) ?? 'this place';
  const city = cleanText(input.city);
  const country = cleanText(input.country);
  const address = cleanText(input.address);
  const categories = (input.categories ?? [])
    .map((category) => cleanText(category))
    .filter((category): category is string => Boolean(category));
  const location = [city, country].filter(Boolean).join(', ') || address || 'this grid zone';
  const category = categories.slice(0, 3).join(' / ') || getArchetypeLabel(archetype);
  const anchor = address ? `${place} on ${address}` : `${place} in ${location}`;

  const signalMap: Record<PlaceArchetype, string> = {
    nightlife: 'music, crowd movement, the bar, the door, and one moment that proves the room is active',
    surf: 'boards, waves, boardwalk movement, tide energy, and one recognizable surf-side anchor',
    beach: 'water, coastline, sunset, people, sound, and one recognizable local anchor',
    food: 'the order, the table, the first bite, the staff rhythm, and one reason to come back',
    wellness: 'movement, breath, recovery, routine, and one safe proof moment',
    stay: 'arrival energy, view, guest vibe, staff touchpoint, and one bookable memory',
    landmark: 'the icon, surrounding movement, local context, and one reason the place matters',
    street: 'people, rhythm, signs, sound, movement, and one interaction that feels local',
    'local-spot': 'the venue, the action, the local texture, and one clean proof moment',
  };

  const proofMap: Record<PlaceArchetype, string> = {
    nightlife: 'Show the venue, the action, and a real crowd or staff moment.',
    surf: 'Show the surf-side anchor, conditions, and the creator physically there.',
    beach: 'Show the location anchor, the scene, and one current atmospheric detail.',
    food: 'Show the order, the venue context, and a creator verdict.',
    wellness: 'Show the venue, safe movement or recovery, and a completed action.',
    stay: 'Show the arrival, view, or amenity with recognizable venue context.',
    landmark: 'Show the landmark clearly and explain why it matters.',
    street: 'Show a public interaction, route, sign, or movement at the location.',
    'local-spot': 'Show the place, the creator, and one visible proof of life.',
  };

  const creatorMap: Record<PlaceArchetype, string> = {
    nightlife: 'nightlife creator',
    surf: 'surf or island creator',
    beach: 'travel or lifestyle creator',
    food: 'food creator',
    wellness: 'fitness or wellness creator',
    stay: 'travel or hospitality creator',
    landmark: 'travel creator',
    street: 'street or local discovery creator',
    'local-spot': 'local creator',
  };

  return {
    place,
    location,
    category,
    anchor,
    signal: signalMap[archetype],
    proof: proofMap[archetype],
    creator: creatorMap[archetype],
  };
}

function hydrateText(value: string, context: PlaceTemplateContext) {
  return value.replace(/\{([a-z]+)\}/g, (_match, key: string) => {
    return context[key as keyof PlaceTemplateContext] ?? '';
  });
}

function hydrateTemplate(template: PlaceChallengeTemplate, context: PlaceTemplateContext): PlaceChallengeTemplate {
  return {
    ...template,
    title: hydrateText(template.title, context),
    description: `${hydrateText(template.description, context)} ${context.proof}`,
    creatorAngle: hydrateText(template.creatorAngle, context),
    proofMetric: hydrateText(template.proofMetric, context),
  };
}

export function inferPlaceChallengeArchetype(
  input: PlaceChallengeTemplateInput
): PlaceArchetype {
  const haystack = normalizeParts(input);

  for (const archetype of ['surf', 'food', 'wellness', 'stay', 'nightlife', 'beach', 'landmark', 'street'] as const) {
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
  const context = buildContext(input, archetype);

  const titleMap: Record<PlaceArchetype, string> = {
    nightlife: `Suggested for ${context.place}'s nightlife signal`,
    surf: `Suggested for ${context.place}'s surf signal`,
    beach: `Suggested for ${context.place}'s coastal signal`,
    food: `Suggested for ${context.place}'s menu signal`,
    wellness: `Suggested for ${context.place}'s wellness signal`,
    stay: `Suggested for ${context.place}'s hospitality signal`,
    landmark: `Suggested for ${context.place}'s landmark signal`,
    street: `Suggested for ${context.place}'s street signal`,
    'local-spot': `Suggested for ${context.place}`,
  };

  const descriptionMap: Record<PlaceArchetype, string> = {
    nightlife: `BaseDare reads this as ${context.category} in ${context.location}. Pick a mission that proves crowd energy, gives creators a hook, and gives the venue reusable content.`,
    surf: `BaseDare reads this as ${context.category} in ${context.location}. Pick a mission that catches conditions, movement, and a creator-friendly island story.`,
    beach: `BaseDare reads this as ${context.category} in ${context.location}. Pick a mission that turns scenery into proof, not another passive postcard.`,
    food: `BaseDare reads this as ${context.category} in ${context.location}. Pick a mission that turns an order, seat, or ritual into venue-owned UGC.`,
    wellness: `BaseDare reads this as ${context.category} in ${context.location}. Pick a safe, repeatable action that proves the venue changes someone's state.`,
    stay: `BaseDare reads this as ${context.category} in ${context.location}. Pick a mission that makes the stay, arrival, or guest fit obvious in one clip.`,
    landmark: `BaseDare reads this as ${context.category} in ${context.location}. Pick a mission that turns a known place into a creator-led story.`,
    street: `BaseDare reads this as ${context.category} in ${context.location}. Pick a mission that shows live movement, local texture, and a reason to route people there.`,
    'local-spot': `BaseDare has limited metadata for ${context.place}. These prompts start the first proof loop and turn the pin into venue memory.`,
  };

  return {
    archetype,
    title: titleMap[archetype],
    description: descriptionMap[archetype],
    templates: TEMPLATES[archetype].map((template) => hydrateTemplate(template, context)),
  };
}
