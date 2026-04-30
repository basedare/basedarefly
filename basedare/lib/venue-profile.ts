export type VenueLegendKey =
  | 'beach'
  | 'water'
  | 'bar'
  | 'food'
  | 'coffee'
  | 'nightlife'
  | 'music'
  | 'hotel'
  | 'surf'
  | 'sport'
  | 'park'
  | 'landmark'
  | 'shopping'
  | 'creator';

export type VenueLegend = {
  key: VenueLegendKey;
  label: string;
  emoji: string;
};

export type VenueProfileSummary = {
  bio: string;
  tagline: string;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  legends: VenueLegend[];
  primaryLegend: VenueLegend;
};

const FALLBACK_LEGEND: VenueLegend = {
  key: 'creator',
  label: 'Creator spot',
  emoji: '✦',
};

const VENUE_LEGENDS: Record<VenueLegendKey, VenueLegend & { keywords: string[]; story: string }> = {
  beach: {
    key: 'beach',
    label: 'Beach',
    emoji: '🏖️',
    keywords: ['beach', 'shore', 'shoreline', 'coast', 'coastal', 'sand', 'bay', 'icebergs'],
    story: 'sun, water, crowd energy, and clean outdoor proof',
  },
  water: {
    key: 'water',
    label: 'Water',
    emoji: '🌊',
    keywords: ['water', 'harbour', 'harbor', 'marina', 'pier', 'dock', 'lagoon', 'pool', 'island'],
    story: 'waterfront movement, arrival shots, and scenic proof',
  },
  surf: {
    key: 'surf',
    label: 'Surf',
    emoji: '🏄',
    keywords: ['surf', 'cloud 9', 'boardwalk', 'wave', 'surfing'],
    story: 'wave culture, boardwalk rituals, and island proof',
  },
  bar: {
    key: 'bar',
    label: 'Bar',
    emoji: '🍺',
    keywords: ['bar', 'pub', 'brew', 'beer', 'cocktail', 'taproom', 'tavern', 'club'],
    story: 'drink rituals, first rounds, and night-out proof',
  },
  food: {
    key: 'food',
    label: 'Food',
    emoji: '🍴',
    keywords: ['restaurant', 'food', 'grill', 'kitchen', 'diner', 'pizza', 'taco', 'sushi', 'eatery', 'pavilion'],
    story: 'signature dishes, table moments, and taste-proof clips',
  },
  coffee: {
    key: 'coffee',
    label: 'Cafe',
    emoji: '☕',
    keywords: ['cafe', 'coffee', 'espresso', 'bakery', 'brunch'],
    story: 'coffee rituals, calm creator shots, and morning proof',
  },
  nightlife: {
    key: 'nightlife',
    label: 'Nightlife',
    emoji: '💃',
    keywords: ['night', 'dance', 'dj', 'club', 'party', 'lounge', 'disco', 'karaoke'],
    story: 'crowd pulse, music energy, and late-night proof',
  },
  music: {
    key: 'music',
    label: 'Music',
    emoji: '🎵',
    keywords: ['music', 'live', 'band', 'stage', 'gig', 'venue', 'concert'],
    story: 'sound, crowd reaction, and performance proof',
  },
  hotel: {
    key: 'hotel',
    label: 'Hotel',
    emoji: '🛎️',
    keywords: ['hotel', 'resort', 'villa', 'hostel', 'hideaway', 'stay'],
    story: 'arrival, hospitality, and travel-proof moments',
  },
  sport: {
    key: 'sport',
    label: 'Sport',
    emoji: '⚡',
    keywords: ['gym', 'fitness', 'run', 'sport', 'court', 'parkour', 'yoga', 'training'],
    story: 'movement, challenge, and performance proof',
  },
  park: {
    key: 'park',
    label: 'Park',
    emoji: '🌿',
    keywords: ['park', 'garden', 'reserve', 'lookout', 'trail', 'outdoor'],
    story: 'walk-up moments, scenery, and public-space proof',
  },
  landmark: {
    key: 'landmark',
    label: 'Landmark',
    emoji: '📍',
    keywords: ['landmark', 'museum', 'gallery', 'bridge', 'tower', 'square', 'luna', 'monument'],
    story: 'recognizable anchors, tourist moments, and story proof',
  },
  shopping: {
    key: 'shopping',
    label: 'Retail',
    emoji: '🛍️',
    keywords: ['shop', 'store', 'market', 'mall', 'retail', 'boutique'],
    story: 'product finds, shop rituals, and discovery proof',
  },
  creator: {
    ...FALLBACK_LEGEND,
    keywords: [],
    story: 'creator action, local proof, and venue memory',
  },
};

function asMetadataRecord(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  return metadata as Record<string, unknown>;
}

function readString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readStringArray(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (!Array.isArray(value)) continue;

    const normalized = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [];
}

function compactSentence(value: string, max = 180) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function getLegendByKey(key: string | null | undefined) {
  if (!key) return null;
  const normalized = key.toLowerCase().replace(/[^a-z0-9]+/g, '-') as VenueLegendKey;
  return VENUE_LEGENDS[normalized] ?? null;
}

export function buildVenueProfile(input: {
  name: string;
  description?: string | null;
  categories?: string[] | null;
  city?: string | null;
  country?: string | null;
  metadataJson?: unknown;
}): VenueProfileSummary {
  const metadata = asMetadataRecord(input.metadataJson);
  const explicitLegendKeys = readStringArray(metadata, ['legendKeys', 'legends', 'vibeIcons']);
  const searchText = [
    input.name,
    input.description,
    input.city,
    input.country,
    ...(input.categories ?? []),
    ...readStringArray(metadata, ['vibeTags', 'tags', 'keywords']),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const legends = new Map<VenueLegendKey, VenueLegend>();

  explicitLegendKeys.forEach((key) => {
    const legend = getLegendByKey(key);
    if (legend) legends.set(legend.key, legend);
  });

  Object.values(VENUE_LEGENDS).forEach((legend) => {
    if (legend.key === 'creator') return;
    if (legend.keywords.some((keyword) => searchText.includes(keyword))) {
      legends.set(legend.key, legend);
    }
  });

  if (legends.size === 0) {
    legends.set(FALLBACK_LEGEND.key, FALLBACK_LEGEND);
  }

  const legendList = Array.from(legends.values()).slice(0, 4);
  const primaryLegend = legendList[0] ?? FALLBACK_LEGEND;
  const explicitBio = readString(metadata, ['bio', 'shortBio', 'profileBio', 'venueBio']);
  const tagline = readString(metadata, ['tagline', 'positioning', 'storyTagline']) ??
    `${primaryLegend.label} node for real-world creator proof.`;
  const bio = compactSentence(
    explicitBio ??
      input.description ??
      `${input.name} is a ${legendList.map((legend) => legend.label.toLowerCase()).join(' + ')} node built for ${VENUE_LEGENDS[primaryLegend.key].story}.`
  );

  return {
    bio,
    tagline: compactSentence(tagline, 96),
    profileImageUrl: readString(metadata, ['profileImageUrl', 'avatarUrl', 'logoUrl', 'imageUrl']),
    coverImageUrl: readString(metadata, ['coverImageUrl', 'heroImageUrl', 'bannerUrl']),
    legends: legendList,
    primaryLegend,
  };
}
