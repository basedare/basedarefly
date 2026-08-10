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

export type SurfMapSignalRole = 'break' | 'access';

export const SURF_SIGNAL_PATTERN =
  /(?:^|\s)(?:cloud\s*9|surf|surfing|wave-check|surf-break|surf-spot|reef-break)(?:\s|$)/i;

const SURF_BREAK_PRIMARY_CATEGORIES = new Set(['surf', 'surf-break', 'reef-break']);
const SURF_BUSINESS_CATEGORIES = new Set([
  'cafe',
  'restaurant',
  'resort',
  'surf-rental',
  'surf-school',
  'surf-shop',
]);

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

export function getSurfMapSignalRole(
  categories?: string[] | null
): SurfMapSignalRole | null {
  const normalizedCategories = (categories ?? [])
    .map((category) => category.trim().toLowerCase())
    .filter(Boolean);
  const primaryCategory = normalizedCategories[0];
  const categorySet = new Set(normalizedCategories);

  // A moving swell echo implies a real break, not merely a business that
  // serves surfers. Keep that promise narrow and driven by curated categories.
  const isSurfBusiness = normalizedCategories.some((category) =>
    SURF_BUSINESS_CATEGORIES.has(category)
  );
  if (
    primaryCategory &&
    SURF_BREAK_PRIMARY_CATEGORIES.has(primaryCategory) &&
    !isSurfBusiness
  ) {
    return 'break';
  }

  // Kanaway is useful as the verified board/guide + beach-launch access point
  // for outer reefs. Its smaller echo means "start here", not "waves break here".
  if (categorySet.has('boat-launch') && categorySet.has('surf-spot')) {
    return 'access';
  }

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

export function shouldRenderAdventureActivityMarker(input: {
  activityType: 'dare' | 'meetup';
  venueId: string | null;
  renderedVenueIds: ReadonlySet<string>;
}) {
  // A venue-backed dare is already expressed by that venue's live flag. A
  // second focal-activity flag at the same venue creates the doubled marker
  // seen on Community Sparks. Keep standalone dares and meetup markers intact.
  if (input.activityType !== 'dare' || !input.venueId) return true;
  return !input.renderedVenueIds.has(input.venueId);
}

export function shouldRenderLocalSignalMarker(input: {
  venueSlug?: string | null;
  renderedVenueSlugs: ReadonlySet<string>;
}) {
  // A venue-bound Hang/Ask/Offer decorates the canonical venue marker. Only
  // signals without a rendered place need their own standalone marker.
  if (!input.venueSlug) return true;
  return !input.renderedVenueSlugs.has(input.venueSlug);
}
