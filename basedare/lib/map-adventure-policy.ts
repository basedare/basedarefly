export type AdventureSpriteKind =
  | 'flag'
  | 'beer'
  | 'surf'
  | 'palm'
  | 'cafe'
  | 'fitness'
  | 'rental'
  | 'wellness'
  | 'gathering'
  | 'rumor';

export const SURF_SIGNAL_PATTERN =
  /(?:^|\s)(?:cloud\s*9|surf|surfing|wave-check|surf-break|surf-spot|reef-break)(?:\s|$)/i;

const BAR_SIGNAL_PATTERN =
  /(?:nightlife|late-night|nightclub|beach-club|sports-bar|cocktail|pub|\bbar\b|music-club)/i;
const PALM_SIGNAL_PATTERN =
  /(?:beach|island|coast|water|lagoon|river|rock-pool|dock|boat|boardwalk|nature|trail|waterfall|viewpoint|attraction|activity|tour|adventure|outdoor)/i;
const CAFE_SIGNAL_PATTERN = /(?:coffee|cafe|bakery|restaurant|food|eat|kitchen|market)/i;
const FITNESS_SIGNAL_PATTERN =
  /(?:crossfit|fitness|functional-fitness|gym|strength|weight-training|weights|boxing|muay-thai|hiit|kettlebell|tennis|padel|pickleball|sports-court)/i;
const RENTAL_SIGNAL_PATTERN =
  /(?:surf-rental|board-rental|surf-shop|surf-school|kite-shop|kitesurfing|wing-foiling|wingfoil|hydrofoil|e-foil|foil|watersports|water-sports|paddleboard|kayak|sup-rental)/i;
const WELLNESS_SIGNAL_PATTERN =
  /(?:pilates|yoga|massage|spa|sauna|ice-bath|cold-plunge|recovery|wellness|physio|barre|meditation|breathwork)/i;
const GATHERING_SIGNAL_PATTERN =
  /(?:community|gather|hostel|hotel|stay|resort)/i;

function getSpriteForCategory(category: string): AdventureSpriteKind | null {
  if (BAR_SIGNAL_PATTERN.test(category)) return 'beer';
  if (FITNESS_SIGNAL_PATTERN.test(category)) return 'fitness';
  if (RENTAL_SIGNAL_PATTERN.test(category)) return 'rental';
  if (WELLNESS_SIGNAL_PATTERN.test(category)) return 'wellness';
  if (CAFE_SIGNAL_PATTERN.test(category)) return 'cafe';
  if (SURF_SIGNAL_PATTERN.test(category)) return 'surf';
  if (PALM_SIGNAL_PATTERN.test(category)) return 'palm';
  if (GATHERING_SIGNAL_PATTERN.test(category)) return 'gathering';
  return null;
}

export function getAdventurePlaceSprite({
  challengeLiveCount,
  categories,
}: {
  challengeLiveCount: number;
  categories?: string[] | null;
}): AdventureSpriteKind {
  if (challengeLiveCount > 0) return 'flag';

  const normalizedCategories = (categories ?? []).map((category) => category.toLowerCase());
  const categoryText = normalizedCategories.join(' ');

  // Venue identity wins over incidental geography: Hideaway is a bar beside a
  // dock, not a surf break. Strong nightlife categories must resolve first.
  if (BAR_SIGNAL_PATTERN.test(categoryText)) return 'beer';

  // Curated categories are ordered by primary use. Respecting that identity
  // keeps restaurants such as Kermit from becoming surfboards merely because
  // they also serve a surf-camp audience.
  const primarySprite = normalizedCategories[0]
    ? getSpriteForCategory(normalizedCategories[0])
    : null;
  if (primarySprite) return primarySprite;

  if (FITNESS_SIGNAL_PATTERN.test(categoryText)) return 'fitness';
  if (RENTAL_SIGNAL_PATTERN.test(categoryText)) return 'rental';
  if (WELLNESS_SIGNAL_PATTERN.test(categoryText)) return 'wellness';
  if (SURF_SIGNAL_PATTERN.test(categoryText)) return 'surf';
  if (CAFE_SIGNAL_PATTERN.test(categoryText)) return 'cafe';
  if (PALM_SIGNAL_PATTERN.test(categoryText)) return 'palm';
  if (GATHERING_SIGNAL_PATTERN.test(categoryText)) return 'gathering';
  return 'rumor';
}
