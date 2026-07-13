export type AdventureSpriteKind =
  | 'flag'
  | 'beer'
  | 'surf'
  | 'palm'
  | 'cafe'
  | 'gathering'
  | 'rumor';

export const SURF_SIGNAL_PATTERN = /(?:cloud\s*9|surf(?:ing)?|wave-check|surf-break)/i;

const BAR_SIGNAL_PATTERN =
  /(?:nightlife|late-night|nightclub|beach-club|sports-bar|cocktail|pub|\bbar\b|music-club)/i;
const PALM_SIGNAL_PATTERN =
  /(?:beach|island|coast|water|lagoon|river|rock-pool|dock|boat|boardwalk|nature|trail|waterfall|viewpoint|attraction|activity|tour|adventure|outdoor)/i;
const CAFE_SIGNAL_PATTERN = /(?:coffee|cafe|bakery|restaurant|food|eat|kitchen|market)/i;
const GATHERING_SIGNAL_PATTERN =
  /(?:community|gather|hostel|hotel|stay|resort|wellness|yoga|spa)/i;

export function getAdventurePlaceSprite({
  challengeLiveCount,
  categories,
}: {
  challengeLiveCount: number;
  categories?: string[] | null;
}): AdventureSpriteKind {
  if (challengeLiveCount > 0) return 'flag';

  const categoryText = (categories ?? []).join(' ').toLowerCase();

  // Venue identity wins over incidental geography: Hideaway is a bar beside a
  // dock, not a surf break. Strong nightlife categories must resolve first.
  if (BAR_SIGNAL_PATTERN.test(categoryText)) return 'beer';
  if (SURF_SIGNAL_PATTERN.test(categoryText)) return 'surf';
  if (PALM_SIGNAL_PATTERN.test(categoryText)) return 'palm';
  if (CAFE_SIGNAL_PATTERN.test(categoryText)) return 'cafe';
  if (GATHERING_SIGNAL_PATTERN.test(categoryText)) return 'gathering';
  return 'rumor';
}
