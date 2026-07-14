export const SIARGAO_TIME_ZONE = 'Asia/Manila';

export type SiargaoWeekday =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

type NightVenue = {
  name: string;
  displayName?: string;
  matchers: readonly RegExp[];
};

type NightRotationEntry = {
  venues: readonly NightVenue[];
};

const SIARGAO_BEACH_CLUB: NightVenue = {
  name: 'Siargao Beach Club',
  displayName: 'SBC',
  matchers: [/siargao[\s-]?beach[\s-]?club/i, /\bsbc\b/i],
};

const NIGHT_ROTATION: Record<SiargaoWeekday, NightRotationEntry> = {
  Sunday: {
    venues: [{ name: 'Happiness', matchers: [/happiness/i] }],
  },
  Monday: {
    venues: [{ name: 'Mama Coco', matchers: [/mama[\s-]?coco/i] }],
  },
  Tuesday: {
    venues: [
      { name: 'Barbosa', matchers: [/barbosa/i] },
      {
        name: 'Barrel',
        displayName: 'Barrel quiz',
        matchers: [/\bbarrel\b/i],
      },
    ],
  },
  Wednesday: {
    venues: [{ name: 'Goodies', matchers: [/goodies/i] }],
  },
  Thursday: {
    venues: [
      {
        name: 'Bed and Brew',
        matchers: [/bed[\s-]?(?:and|&|n)[\s-]?brew/i],
      },
    ],
  },
  Friday: {
    venues: [
      { name: 'Mama Coco', matchers: [/mama[\s-]?coco/i] },
      { name: 'Barbosa', matchers: [/barbosa/i] },
    ],
  },
  Saturday: {
    venues: [{ name: 'Harana', matchers: [/harana/i] }],
  },
};

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: SIARGAO_TIME_ZONE,
  weekday: 'long',
});

function getSiargaoWeekday(now: Date): SiargaoWeekday {
  return weekdayFormatter.format(now) as SiargaoWeekday;
}

function venueMatches(
  venue: NightVenue,
  name?: string | null,
  slug?: string | null
) {
  const candidate = `${name ?? ''} ${slug ?? ''}`;
  return venue.matchers.some((matcher) => matcher.test(candidate));
}

export function getSiargaoNightGuide(now = new Date()) {
  const weekday = getSiargaoWeekday(now);
  const rotation = NIGHT_ROTATION[weekday];

  return {
    weekday,
    headline: rotation.venues
      .map((venue) => venue.displayName ?? venue.name)
      .join(' + '),
    lateVenue: SIARGAO_BEACH_CLUB.name,
    lateVenueShort: SIARGAO_BEACH_CLUB.displayName ?? SIARGAO_BEACH_CLUB.name,
    lateHoursLabel: 'until about 3am',
    disclaimer:
      'Typical weekly rhythm, not a live guarantee. Confirmed one-offs appear in Tonight.',
  };
}

export function isSiargaoVenueFeaturedTonight({
  name,
  slug,
  now = new Date(),
}: {
  name?: string | null;
  slug?: string | null;
  now?: Date;
}) {
  if (venueMatches(SIARGAO_BEACH_CLUB, name, slug)) return true;

  const weekday = getSiargaoWeekday(now);
  return NIGHT_ROTATION[weekday].venues.some((venue) =>
    venueMatches(venue, name, slug)
  );
}
