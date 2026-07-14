import { PrismaClient } from '@prisma/client';
import { encodeGeohash } from '../lib/geo';

const prisma = new PrismaClient();

const now = new Date();
const dayStart = new Date(now);
dayStart.setHours(0, 0, 0, 0);
const dayEnd = new Date(dayStart);
dayEnd.setDate(dayEnd.getDate() + 1);

type SeededTagInput = {
  walletAddress: string;
  creatorTag: string;
  caption: string;
  vibeTags: string[];
  proofMediaUrl: string;
  proofType: 'IMAGE' | 'VIDEO';
  minutesAgo: number;
  heatContribution?: number;
};

type SeededPlaceInput = {
  slug: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  categories: string[];
  isPartner?: boolean;
  partnerTier?: string | null;
  featuredLabel?: string;
  seededTags: SeededTagInput[];
};

const SEEDED_CREATORS = [
  { walletAddress: '0x1111111111111111111111111111111111111111', creatorTag: '@basedarebear' },
  { walletAddress: '0x2222222222222222222222222222222222222222', creatorTag: '@nightsignal' },
  { walletAddress: '0x3333333333333333333333333333333333333333', creatorTag: '@chaoscam' },
  { walletAddress: '0x4444444444444444444444444444444444444444', creatorTag: '@hiddenfreq' },
  { walletAddress: '0x5555555555555555555555555555555555555555', creatorTag: '@gridspray' },
];

const SEEDED_PLACES: SeededPlaceInput[] = [
  {
    slug: 'sydney-opera-house',
    name: 'Sydney Opera House',
    description: 'Harbour-side icon for first-spark dares, city flexes, and public place memory.',
    address: 'Bennelong Point',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8568,
    longitude: 151.2153,
    timezone: 'Australia/Sydney',
    categories: ['iconic', 'harbour', 'tourism'],
    featuredLabel: 'first-spark',
    seededTags: [
      {
        ...SEEDED_CREATORS[0],
        caption: 'Harbour wind going crazy. Left the first spark on the steps.',
        vibeTags: ['iconic', 'harbour', 'sunset'],
        proofMediaUrl: '/assets/Peebear.png',
        proofType: 'IMAGE',
        minutesAgo: 55,
      },
    ],
  },
  {
    slug: 'chinese-laundry',
    name: 'Chinese Laundry',
    description: 'Late-night underground node where the grid should feel loud.',
    address: 'Slip Inn, 111 Sussex St',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8708,
    longitude: 151.2036,
    timezone: 'Australia/Sydney',
    categories: ['nightlife', 'club', 'music'],
    featuredLabel: 'hot',
    seededTags: [
      {
        ...SEEDED_CREATORS[1],
        caption: 'Basement heat. Place was already pulsing when we walked in.',
        vibeTags: ['nightlife', 'sweaty', 'bass'],
        proofMediaUrl: '/assets/machine-loop.mp4',
        proofType: 'VIDEO',
        minutesAgo: 18,
      },
      {
        ...SEEDED_CREATORS[2],
        caption: 'Strobe chaos and no chance of acting normal.',
        vibeTags: ['club', 'chaos', 'late'],
        proofMediaUrl: '/assets/adinross.png',
        proofType: 'IMAGE',
        minutesAgo: 34,
      },
      {
        ...SEEDED_CREATORS[3],
        caption: 'Verified the floor was active long before midnight.',
        vibeTags: ['alive', 'crowd', 'sydney'],
        proofMediaUrl: '/assets/honey-card-loop.mp4',
        proofType: 'VIDEO',
        minutesAgo: 49,
      },
    ],
  },
  {
    slug: 'bondi-icebergs',
    name: 'Bondi Icebergs',
    description: 'Ocean-facing flex point for creators, tourists, and high-visibility marks.',
    address: '1 Notts Ave, Bondi Beach',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8915,
    longitude: 151.2767,
    timezone: 'Australia/Sydney',
    categories: ['beach', 'tourism', 'iconic'],
    featuredLabel: 'active',
    seededTags: [
      {
        ...SEEDED_CREATORS[3],
        caption: 'Salt, wind, and one clean first shot over the pool edge.',
        vibeTags: ['beach', 'ocean', 'clean'],
        proofMediaUrl: '/assets/basedarenew.png',
        proofType: 'IMAGE',
        minutesAgo: 92,
      },
      {
        ...SEEDED_CREATORS[4],
        caption: 'Caught the last light before the whole coast went blue.',
        vibeTags: ['bondi', 'sunset', 'coastal'],
        proofMediaUrl: '/assets/control-the-stream.png',
        proofType: 'IMAGE',
        minutesAgo: 138,
      },
    ],
  },
  {
    slug: 'barangaroo-house',
    name: 'Barangaroo House',
    description: 'Harbour-side nightlife stack with city energy and clean discovery potential.',
    address: '35 Barangaroo Ave',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8606,
    longitude: 151.2019,
    timezone: 'Australia/Sydney',
    categories: ['nightlife', 'harbour', 'rooftop'],
    featuredLabel: 'simmering',
    seededTags: [
      {
        ...SEEDED_CREATORS[2],
        caption: 'Clean harbour angle. Left a mark and kept moving.',
        vibeTags: ['harbour', 'rooftop', 'night'],
        proofMediaUrl: '/assets/basedaresolid.png',
        proofType: 'IMAGE',
        minutesAgo: 520,
      },
    ],
  },
  {
    slug: 'the-grounds-of-alexandria',
    name: 'The Grounds of Alexandria',
    description: 'Big social node for daylight dares, creator resets, and softer hidden-gem content.',
    address: '7a/2 Huntley St, Alexandria',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.9107,
    longitude: 151.1945,
    timezone: 'Australia/Sydney',
    categories: ['daylife', 'social', 'food'],
    featuredLabel: 'active',
    seededTags: [
      {
        ...SEEDED_CREATORS[0],
        caption: 'Too polished not to tag. This place already had weekend energy.',
        vibeTags: ['social', 'daytime', 'crowd'],
        proofMediaUrl: '/assets/KAICENAT.jpeg',
        proofType: 'IMAGE',
        minutesAgo: 870,
      },
      {
        ...SEEDED_CREATORS[4],
        caption: 'Left a quieter mark here. Still counts if the vibe is real.',
        vibeTags: ['soft-chaos', 'brunch', 'alexandria'],
        proofMediaUrl: '/assets/Ishowspeed.jpg',
        proofType: 'IMAGE',
        minutesAgo: 1010,
      },
    ],
  },
  {
    slug: 'ivy-sydney',
    name: 'ivy Sydney',
    description: 'CBD nightlife stack with enough foot traffic and chaos energy to keep the grid feeling live.',
    address: '330 George St',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8694,
    longitude: 151.2067,
    timezone: 'Australia/Sydney',
    categories: ['nightlife', 'club', 'cbd'],
    featuredLabel: 'hot',
    seededTags: [
      {
        ...SEEDED_CREATORS[1],
        caption: 'CBD got loud early. This one already has movement.',
        vibeTags: ['cbd', 'nightlife', 'flash'],
        proofMediaUrl: '/assets/honey-card-loop.mp4',
        proofType: 'VIDEO',
        minutesAgo: 24,
      },
      {
        ...SEEDED_CREATORS[3],
        caption: 'Left a clean nightlife mark and kept it moving.',
        vibeTags: ['club', 'grid', 'sydney'],
        proofMediaUrl: '/assets/basedarenew.png',
        proofType: 'IMAGE',
        minutesAgo: 41,
      },
    ],
  },
  {
    slug: 'circular-quay-steps',
    name: 'Circular Quay Steps',
    description: 'Harbour funnel where tourists, commuters, and first-spark dares naturally collide.',
    address: 'Circular Quay',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8617,
    longitude: 151.2108,
    timezone: 'Australia/Sydney',
    categories: ['harbour', 'tourism', 'landmark'],
    featuredLabel: 'first-spark',
    seededTags: [
      {
        ...SEEDED_CREATORS[0],
        caption: 'Easy harbour flex. Too public not to mark.',
        vibeTags: ['harbour', 'tourist', 'first-spark'],
        proofMediaUrl: '/assets/Peebear.png',
        proofType: 'IMAGE',
        minutesAgo: 66,
      },
    ],
  },
  {
    slug: 'newtown-king-street',
    name: 'Newtown King Street',
    description: 'Street-energy corridor for scrappier dares, nightlife drift, and creator traffic.',
    address: 'King St, Newtown',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8981,
    longitude: 151.1795,
    timezone: 'Australia/Sydney',
    categories: ['street', 'nightlife', 'local'],
    featuredLabel: 'active',
    seededTags: [
      {
        ...SEEDED_CREATORS[2],
        caption: 'Messier than the harbour spots, which is exactly why it works.',
        vibeTags: ['street', 'late', 'local'],
        proofMediaUrl: '/assets/adinross.png',
        proofType: 'IMAGE',
        minutesAgo: 74,
      },
      {
        ...SEEDED_CREATORS[4],
        caption: 'Good friction, good crowd, good mark.',
        vibeTags: ['newtown', 'crawl', 'alive'],
        proofMediaUrl: '/assets/control-the-stream.png',
        proofType: 'IMAGE',
        minutesAgo: 121,
      },
    ],
  },
  {
    slug: 'coogee-pavilion',
    name: 'Coogee Pavilion',
    description: 'Coastal social node that makes the beach side of the city feel active too.',
    address: '169 Dolphin St, Coogee',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.9208,
    longitude: 151.2561,
    timezone: 'Australia/Sydney',
    categories: ['beach', 'social', 'coastal'],
    featuredLabel: 'active',
    seededTags: [
      {
        ...SEEDED_CREATORS[3],
        caption: 'Coastline looked too clean not to drop a proof here.',
        vibeTags: ['coastal', 'beach', 'social'],
        proofMediaUrl: '/assets/basedaresolid.png',
        proofType: 'IMAGE',
        minutesAgo: 154,
      },
    ],
  },
  {
    slug: 'manly-wharf',
    name: 'Manly Wharf',
    description: 'Ferry-side arrival point that broadens the grid past the CBD and eastern beaches.',
    address: 'East Esplanade, Manly',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8008,
    longitude: 151.2876,
    timezone: 'Australia/Sydney',
    categories: ['ferry', 'beach', 'tourism'],
    featuredLabel: 'simmering',
    seededTags: [
      {
        ...SEEDED_CREATORS[1],
        caption: 'Ferry traffic was enough to make this one feel live fast.',
        vibeTags: ['manly', 'ferry', 'coast'],
        proofMediaUrl: '/assets/KAICENAT.jpeg',
        proofType: 'IMAGE',
        minutesAgo: 215,
      },
    ],
  },
  {
    slug: 'watsons-bay-hotel',
    name: 'Watsons Bay Hotel',
    description: 'Sunset-heavy harbour edge that gives the east another visible live node.',
    address: '1 Military Rd, Watsons Bay',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8411,
    longitude: 151.2803,
    timezone: 'Australia/Sydney',
    categories: ['harbour', 'sunset', 'coastal'],
    featuredLabel: 'active',
    seededTags: [
      {
        ...SEEDED_CREATORS[4],
        caption: 'Harbour edge was glowing. Good place for a visible mark.',
        vibeTags: ['sunset', 'harbour', 'east'],
        proofMediaUrl: '/assets/Ishowspeed.jpg',
        proofType: 'IMAGE',
        minutesAgo: 248,
      },
    ],
  },
  {
    slug: 'darling-harbour-steps',
    name: 'Darling Harbour Steps',
    description: 'High-footfall harbour crossover point that makes the city core feel fuller on the map.',
    address: 'Darling Harbour',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8734,
    longitude: 151.1987,
    timezone: 'Australia/Sydney',
    categories: ['harbour', 'city', 'social'],
    featuredLabel: 'active',
    seededTags: [
      {
        ...SEEDED_CREATORS[0],
        caption: 'Harbour traffic did the rest. This one already had witness energy.',
        vibeTags: ['city', 'harbour', 'crowd'],
        proofMediaUrl: '/assets/basedarenew.png',
        proofType: 'IMAGE',
        minutesAgo: 302,
      },
    ],
  },
  {
    slug: 'luna-park-sydney',
    name: 'Luna Park Sydney',
    description: 'Iconic spectacle node to make the north side of the harbour feel alive too.',
    address: '1 Olympic Dr, Milsons Point',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8477,
    longitude: 151.2108,
    timezone: 'Australia/Sydney',
    categories: ['iconic', 'harbour', 'entertainment'],
    featuredLabel: 'first-spark',
    seededTags: [
      {
        ...SEEDED_CREATORS[2],
        caption: 'Too iconic to leave unmarked.',
        vibeTags: ['iconic', 'north-shore', 'bright'],
        proofMediaUrl: '/assets/control-the-stream.png',
        proofType: 'IMAGE',
        minutesAgo: 412,
      },
    ],
  },
  {
    slug: 'hyde-park-archibald-fountain',
    name: 'Hyde Park Fountain',
    description: 'Open city landmark waiting for its first real place-memory moment.',
    address: 'Elizabeth St & Liverpool St',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8731,
    longitude: 151.2113,
    timezone: 'Australia/Sydney',
    categories: ['city', 'landmark', 'unmarked'],
    featuredLabel: 'unmarked',
    seededTags: [],
  },
  {
    slug: 'bgc-high-street',
    name: 'BGC High Street',
    description: 'Clean Manila activity spine with enough foot traffic to make the grid feel awake fast.',
    address: 'Bonifacio High Street, Taguig',
    city: 'Metro Manila',
    country: 'Philippines',
    latitude: 14.5509,
    longitude: 121.0494,
    timezone: 'Asia/Manila',
    categories: ['city', 'social', 'high-street'],
    featuredLabel: 'hot',
    seededTags: [
      {
        ...SEEDED_CREATORS[0],
        caption: 'Clean Manila start point. Crowd was already there.',
        vibeTags: ['bgc', 'city', 'active'],
        proofMediaUrl: '/assets/Peebear.png',
        proofType: 'IMAGE',
        minutesAgo: 19,
      },
      {
        ...SEEDED_CREATORS[3],
        caption: 'Bright, walkable, and easy to mark.',
        vibeTags: ['walkable', 'night', 'metro-manila'],
        proofMediaUrl: '/assets/control-the-stream.png',
        proofType: 'IMAGE',
        minutesAgo: 43,
      },
    ],
  },
  {
    slug: 'poblacion-makati',
    name: 'Poblacion Makati',
    description: 'Dense nightlife node for late creator energy, faster proofs, and visible movement.',
    address: 'Poblacion, Makati',
    city: 'Metro Manila',
    country: 'Philippines',
    latitude: 14.5658,
    longitude: 121.0336,
    timezone: 'Asia/Manila',
    categories: ['nightlife', 'bar-hop', 'city'],
    featuredLabel: 'hot',
    seededTags: [
      {
        ...SEEDED_CREATORS[1],
        caption: 'This one should absolutely be loud on the grid.',
        vibeTags: ['poblacion', 'nightlife', 'bars'],
        proofMediaUrl: '/assets/honey-card-loop.mp4',
        proofType: 'VIDEO',
        minutesAgo: 28,
      },
      {
        ...SEEDED_CREATORS[2],
        caption: 'Fast crowd, messy energy, good signal.',
        vibeTags: ['late', 'crowd', 'makati'],
        proofMediaUrl: '/assets/adinross.png',
        proofType: 'IMAGE',
        minutesAgo: 51,
      },
    ],
  },
  {
    slug: 'greenbelt-makati',
    name: 'Greenbelt',
    description: 'High-footfall Makati social node to make the city core feel fuller on the map.',
    address: 'Ayala Center, Makati',
    city: 'Metro Manila',
    country: 'Philippines',
    latitude: 14.5511,
    longitude: 121.0215,
    timezone: 'Asia/Manila',
    categories: ['social', 'shopping', 'city'],
    featuredLabel: 'active',
    seededTags: [
      {
        ...SEEDED_CREATORS[4],
        caption: 'Easy first spark. Too much traffic for this not to convert.',
        vibeTags: ['makati', 'walk', 'social'],
        proofMediaUrl: '/assets/Ishowspeed.jpg',
        proofType: 'IMAGE',
        minutesAgo: 97,
      },
    ],
  },
  {
    slug: 'intramuros-fort-santiago',
    name: 'Intramuros Fort Santiago',
    description: 'Historic city landmark so Manila has more than nightlife and mall energy on the grid.',
    address: 'Sta. Clara St, Intramuros, Manila',
    city: 'Metro Manila',
    country: 'Philippines',
    latitude: 14.5946,
    longitude: 120.9707,
    timezone: 'Asia/Manila',
    categories: ['historic', 'tourism', 'landmark'],
    featuredLabel: 'first-spark',
    seededTags: [
      {
        ...SEEDED_CREATORS[0],
        caption: 'Historic spots count too if the mark is real.',
        vibeTags: ['historic', 'tourist', 'manila'],
        proofMediaUrl: '/assets/basedarenew.png',
        proofType: 'IMAGE',
        minutesAgo: 131,
      },
    ],
  },
  {
    slug: 'mall-of-asia-bay',
    name: 'Mall of Asia Bay Walk',
    description: 'Big bayfront crowd magnet to make the Manila coast feel visibly active.',
    address: 'Seaside Blvd, Pasay',
    city: 'Metro Manila',
    country: 'Philippines',
    latitude: 14.5352,
    longitude: 120.9817,
    timezone: 'Asia/Manila',
    categories: ['bayfront', 'crowd', 'social'],
    featuredLabel: 'active',
    seededTags: [
      {
        ...SEEDED_CREATORS[2],
        caption: 'Bay traffic did most of the work here.',
        vibeTags: ['moa', 'bay', 'crowd'],
        proofMediaUrl: '/assets/basedaresolid.png',
        proofType: 'IMAGE',
        minutesAgo: 176,
      },
    ],
  },
  {
    slug: 'binondo-food-crawl',
    name: 'Binondo Food Crawl',
    description: 'Dense food and street-energy node to give old Manila a live social mark too.',
    address: 'Ongpin St, Binondo, Manila',
    city: 'Metro Manila',
    country: 'Philippines',
    latitude: 14.6027,
    longitude: 120.9743,
    timezone: 'Asia/Manila',
    categories: ['food', 'street', 'historic'],
    featuredLabel: 'simmering',
    seededTags: [
      {
        ...SEEDED_CREATORS[4],
        caption: 'Street-food chaos still counts as a clean mark.',
        vibeTags: ['food', 'crawl', 'binondo'],
        proofMediaUrl: '/assets/KAICENAT.jpeg',
        proofType: 'IMAGE',
        minutesAgo: 228,
      },
    ],
  },
  {
    slug: 'hideaway',
    name: 'Hideaway',
    description: 'Boardwalk bar energy right by the island hopping dock in General Luna.',
    address: 'Boardwalk, General Luna, 8419 Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.78134,
    longitude: 126.15625,
    timezone: 'Asia/Manila',
    categories: ['nightlife', 'boardwalk', 'dock'],
    featuredLabel: 'hot',
    seededTags: [
      {
        ...SEEDED_CREATORS[0],
        caption: 'Dockside was loud tonight. This one is definitely alive.',
        vibeTags: ['siargao', 'dock', 'nightlife'],
        proofMediaUrl: '/assets/honey-card-loop.mp4',
        proofType: 'VIDEO',
        minutesAgo: 12,
      },
      {
        ...SEEDED_CREATORS[1],
        caption: 'Island hopping dock by day, chaos signal by night.',
        vibeTags: ['dock', 'boardwalk', 'pulse'],
        proofMediaUrl: '/assets/basedarenew.png',
        proofType: 'IMAGE',
        minutesAgo: 27,
      },
      {
        ...SEEDED_CREATORS[2],
        caption: 'Caught the boardwalk lights just before it got packed.',
        vibeTags: ['lights', 'siargao', 'alive'],
        proofMediaUrl: '/assets/control-the-stream.png',
        proofType: 'IMAGE',
        minutesAgo: 46,
      },
    ],
  },
  {
    slug: 'siargao-beach-club',
    name: 'Siargao Beach Club',
    description: 'A seeded nightlife pilot venue for BaseDare venue-memory and QR-console testing in General Luna.',
    address: 'Tourism Road, Purok 3',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.785133,
    longitude: 126.161438,
    timezone: 'Asia/Manila',
    categories: ['nightlife', 'music', 'pilot'],
    isPartner: true,
    partnerTier: 'PILOT',
    featuredLabel: 'active',
    seededTags: [
      {
        ...SEEDED_CREATORS[0],
        caption: 'Pilot venue is warm. People are already leaving marks here.',
        vibeTags: ['pilot', 'nightlife', 'creator'],
        proofMediaUrl: '/assets/Peebear.png',
        proofType: 'IMAGE',
        minutesAgo: 88,
      },
      {
        ...SEEDED_CREATORS[3],
        caption: 'Verified the afterparty layer is starting to stick.',
        vibeTags: ['afterparty', 'music', 'siargao'],
        proofMediaUrl: '/assets/machine-loop.mp4',
        proofType: 'VIDEO',
        minutesAgo: 143,
      },
    ],
  },
  {
    slug: 'cloud-9-boardwalk',
    name: 'Cloud 9 Boardwalk',
    description: 'Iconic surf-side walkway and a clean first-mark target for Siargao.',
    address: 'Cloud 9, Catangnan',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.81276,
    longitude: 126.16408,
    timezone: 'Asia/Manila',
    categories: ['surf', 'boardwalk', 'iconic'],
    featuredLabel: 'first-spark',
    seededTags: [
      {
        ...SEEDED_CREATORS[4],
        caption: 'Boardwalk was quiet enough to leave one clean spark.',
        vibeTags: ['surf', 'boardwalk', 'sunrise'],
        proofMediaUrl: '/assets/basedaresolid.png',
        proofType: 'IMAGE',
        minutesAgo: 360,
      },
    ],
  },
  {
    slug: 'the-cat-and-gun',
    name: 'The Cat & Gun',
    description: 'Catangnan coffee and sports-bar stop with an obvious creator rail for food, match-night, and island hangout dares.',
    address: 'R555+PWX, Catangnan',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.8093625,
    longitude: 126.1598594,
    timezone: 'Asia/Manila',
    categories: ['cafe', 'coffee', 'sports-bar', 'food', 'siargao'],
    featuredLabel: 'simmering',
    seededTags: [
      {
        ...SEEDED_CREATORS[2],
        caption: 'Coffee, match-night energy, and a clean Catangnan signal.',
        vibeTags: ['catangnan', 'coffee', 'sports-bar'],
        proofMediaUrl: '/assets/basedarenew.png',
        proofType: 'IMAGE',
        minutesAgo: 185,
      },
    ],
  },
  {
    slug: 'la-sola-sunset-bar-and-lounge',
    name: 'La Sola Sunset Bar & Lounge',
    description:
      'Sunset bar and lounge beside Catangnan (AFAM) Bridge for golden-hour drinks and easy social discovery.',
    address: 'R554+RC8, General Luna, Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.8098397,
    longitude: 126.1560223,
    timezone: 'Asia/Manila',
    categories: [
      'bar',
      'lounge',
      'sunset',
      'cocktails',
      'nightlife',
      'social',
      'catangnan',
      'siargao',
      'general-luna',
    ],
    featuredLabel: 'unmarked',
    seededTags: [],
  },
  {
    slug: 'shaka-siargao',
    name: 'Shaka Siargao',
    description: 'Cloud 9 smoothie-bowl and surf-view stop that gives the Catangnan side a daytime proof anchor.',
    address: 'Tourism Road, Cloud 9',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.8119606,
    longitude: 126.1644192,
    timezone: 'Asia/Manila',
    categories: ['cafe', 'healthy', 'surf-view', 'cloud-9', 'siargao'],
    featuredLabel: 'active',
    seededTags: [
      {
        ...SEEDED_CREATORS[0],
        caption: 'Cloud 9 breakfast rail was already awake before the surf crowd moved.',
        vibeTags: ['cloud-9', 'breakfast', 'surf-view'],
        proofMediaUrl: '/assets/Peebear.png',
        proofType: 'IMAGE',
        minutesAgo: 64,
      },
    ],
  },
  {
    slug: 'kermit-siargao',
    name: 'Kermit Siargao',
    description: 'Surf-camp restaurant node between town and Cloud 9 for dinner marks, surf plans, and creator meetups.',
    address: 'Purok 5',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.7877583,
    longitude: 126.160523,
    timezone: 'Asia/Manila',
    categories: ['restaurant', 'surf-camp', 'pizza', 'social', 'siargao'],
    featuredLabel: 'hot',
    seededTags: [
      {
        ...SEEDED_CREATORS[1],
        caption: 'Dinner crowd, surf chatter, and enough movement to make this one glow.',
        vibeTags: ['dinner', 'surf-camp', 'social'],
        proofMediaUrl: '/assets/honey-card-loop.mp4',
        proofType: 'VIDEO',
        minutesAgo: 31,
      },
      {
        ...SEEDED_CREATORS[4],
        caption: 'Marked the pre-Cloud 9 route before everyone scattered.',
        vibeTags: ['route', 'creator-meet', 'siargao'],
        proofMediaUrl: '/assets/basedaresolid.png',
        proofType: 'IMAGE',
        minutesAgo: 118,
      },
    ],
  },
  {
    slug: 'bravo-restaurant-siargao',
    name: 'Bravo Restaurant Siargao',
    description: 'Beachfront General Luna dinner and drinks anchor with lagoon-facing social energy.',
    address: 'Tourism Road, Barangay 5',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.7919,
    longitude: 126.162584,
    timezone: 'Asia/Manila',
    categories: ['restaurant', 'beachfront', 'bar', 'dinner', 'siargao'],
    featuredLabel: 'active',
    seededTags: [
      {
        ...SEEDED_CREATORS[3],
        caption: 'Lagoon-side dinner line felt like an easy proof target.',
        vibeTags: ['beachfront', 'dinner', 'lagoon'],
        proofMediaUrl: '/assets/machine-loop.mp4',
        proofType: 'VIDEO',
        minutesAgo: 82,
      },
    ],
  },
  {
    slug: 'harana-surf-resort',
    name: 'Harana Surf Resort',
    description: 'Tuason/Catangnan surf-resort stop for surf lessons, food, and after-session place memory.',
    address: 'Tuason Point, Barangay Catangnan',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.8068136,
    longitude: 126.1670614,
    timezone: 'Asia/Manila',
    categories: ['surf', 'resort', 'restaurant', 'catangnan', 'siargao'],
    featuredLabel: 'simmering',
    seededTags: [
      {
        ...SEEDED_CREATORS[2],
        caption: 'Post-surf table had the right amount of island noise.',
        vibeTags: ['post-surf', 'tuason', 'catangnan'],
        proofMediaUrl: '/assets/control-the-stream.png',
        proofType: 'IMAGE',
        minutesAgo: 149,
      },
    ],
  },
  {
    slug: 'white-beard-coffee-siargao',
    name: 'White Beard Coffee Siargao',
    description: 'Poblacion coffee and breakfast stop that fills the town-side morning route.',
    address: 'Poblacion 1',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.7820115,
    longitude: 126.1560357,
    timezone: 'Asia/Manila',
    categories: ['coffee', 'breakfast', 'cafe', 'poblacion', 'siargao'],
    featuredLabel: 'active',
    seededTags: [
      {
        ...SEEDED_CREATORS[4],
        caption: 'Coffee route needed a mark. This one made the morning map feel real.',
        vibeTags: ['coffee', 'morning', 'poblacion'],
        proofMediaUrl: '/assets/KAICENAT.jpeg',
        proofType: 'IMAGE',
        minutesAgo: 206,
      },
    ],
  },
  {
    slug: 'las-barricas-siargao',
    name: 'Las Barricas Siargao',
    description: 'Spanish and taco dinner spot in General Luna that adds a compact food-nightlife pin.',
    address: 'Poblacion V, General Luna',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.7897,
    longitude: 126.16055,
    timezone: 'Asia/Manila',
    categories: ['restaurant', 'tapas', 'tacos', 'dinner', 'siargao'],
    featuredLabel: 'simmering',
    seededTags: [
      {
        ...SEEDED_CREATORS[1],
        caption: 'Taco table turned into a tiny dinner rally point.',
        vibeTags: ['tacos', 'dinner', 'general-luna'],
        proofMediaUrl: '/assets/basedarenew.png',
        proofType: 'IMAGE',
        minutesAgo: 233,
      },
    ],
  },
  {
    slug: 'barrel-siargao',
    name: 'BARREL Siargao',
    description: 'Beachfront sports-bar anchor for late food, games, and nightlife marks near the main General Luna strip.',
    address: 'Route to Romantic',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.7896886,
    longitude: 126.161981,
    timezone: 'Asia/Manila',
    categories: ['sports-bar', 'beachfront', 'nightlife', 'food', 'siargao'],
    featuredLabel: 'hot',
    seededTags: [
      {
        ...SEEDED_CREATORS[0],
        caption: 'Sports bar was loud enough to earn a late-night signal.',
        vibeTags: ['sports-bar', 'late', 'beachfront'],
        proofMediaUrl: '/assets/honey-card-loop.mp4',
        proofType: 'VIDEO',
        minutesAgo: 22,
      },
      {
        ...SEEDED_CREATORS[2],
        caption: 'Marked the match-night crowd before the strip got packed.',
        vibeTags: ['match-night', 'bar', 'crowd'],
        proofMediaUrl: '/assets/adinross.png',
        proofType: 'IMAGE',
        minutesAgo: 48,
      },
    ],
  },
  {
    slug: 'general-luna-island-hopping-dock',
    name: 'General Luna Island Hopping Dock',
    description: 'Public launch point for tri-island tours, boat meetups, and high-intent tourist movement.',
    address: 'General Luna Local Market',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.78115,
    longitude: 126.15645,
    timezone: 'Asia/Manila',
    categories: ['dock', 'island-hopping', 'tourism', 'boats', 'siargao'],
    featuredLabel: 'first-spark',
    seededTags: [
      {
        ...SEEDED_CREATORS[3],
        caption: 'Boat crews were loading up early. Perfect first-spark dock mark.',
        vibeTags: ['dock', 'island-hopping', 'morning'],
        proofMediaUrl: '/assets/basedaresolid.png',
        proofType: 'IMAGE',
        minutesAgo: 276,
      },
    ],
  },
  {
    slug: 'tuason-point',
    name: 'Tuason Point',
    description: 'Advanced surf-break pin north of General Luna that stretches the map past Cloud 9.',
    address: 'Tuason Point, Catangnan',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.8094,
    longitude: 126.1683,
    timezone: 'Asia/Manila',
    categories: ['surf', 'reef-break', 'catangnan', 'advanced', 'siargao'],
    featuredLabel: 'first-spark',
    seededTags: [
      {
        ...SEEDED_CREATORS[4],
        caption: 'Heavy break, clean lookout, no filler needed.',
        vibeTags: ['surf', 'tuason', 'reef'],
        proofMediaUrl: '/assets/control-the-stream.png',
        proofType: 'IMAGE',
        minutesAgo: 337,
      },
    ],
  },
  {
    slug: 'malinao-beach',
    name: 'Malinao Beach',
    description: 'Quieter beach-side General Luna anchor so the map has a calmer south-side route too.',
    address: 'Malinao Road',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.7684925,
    longitude: 126.1289878,
    timezone: 'Asia/Manila',
    categories: ['beach', 'quiet', 'malinao', 'tourism', 'siargao'],
    featuredLabel: 'unmarked',
    seededTags: [],
  },
];

function minutesAgoDate(minutesAgo: number) {
  return new Date(now.getTime() - minutesAgo * 60 * 1000);
}

async function upsertSeededPlace(place: SeededPlaceInput) {
  const geohash = encodeGeohash(place.latitude, place.longitude, 6);

  const venue = await prisma.venue.upsert({
    where: { slug: place.slug },
    update: {
      name: place.name,
      description: place.description,
      address: place.address,
      city: place.city,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
      geohash,
      timezone: place.timezone,
      categories: place.categories,
      status: 'ACTIVE',
      isPartner: place.isPartner ?? false,
      partnerTier: place.partnerTier ?? null,
      placeSource: 'seed',
      externalPlaceId: `seed:${place.slug}`,
      metadataJson: {
        seeded: true,
        featuredLabel: place.featuredLabel ?? null,
        vibe: place.description,
        locationConfidence: 'approximate-seed',
      },
    },
    create: {
      slug: place.slug,
      name: place.name,
      description: place.description,
      address: place.address,
      city: place.city,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
      geohash,
      timezone: place.timezone,
      categories: place.categories,
      status: 'ACTIVE',
      isPartner: place.isPartner ?? false,
      partnerTier: place.partnerTier ?? null,
      placeSource: 'seed',
      externalPlaceId: `seed:${place.slug}`,
      metadataJson: {
        seeded: true,
        featuredLabel: place.featuredLabel ?? null,
        vibe: place.description,
        locationConfidence: 'approximate-seed',
      },
    },
  });

  await prisma.placeTag.deleteMany({
    where: {
      venueId: venue.id,
      source: 'SEEDED_MEMORY',
    },
  });

  if (place.seededTags.length > 0) {
    await prisma.placeTag.createMany({
      data: place.seededTags.map((tag, index) => {
        const submittedAt = minutesAgoDate(tag.minutesAgo);
        return {
          venueId: venue.id,
          walletAddress: tag.walletAddress.toLowerCase(),
          creatorTag: tag.creatorTag,
          status: 'APPROVED',
          caption: tag.caption,
          vibeTags: tag.vibeTags,
          proofMediaUrl: tag.proofMediaUrl,
          proofCid: null,
          proofHash: `seeded:${place.slug}:${index}`,
          proofType: tag.proofType,
          source: 'SEEDED_MEMORY',
          linkedDareId: null,
          hiddenPromptId: null,
          latitude: place.latitude,
          longitude: place.longitude,
          geoDistanceMeters: 18 + index * 11,
          heatContribution: tag.heatContribution ?? 10,
          firstMark: index === 0,
          submittedAt,
          reviewedAt: new Date(submittedAt.getTime() + 5 * 60 * 1000),
          reviewerWallet: 'seed-admin',
          reviewReason: 'Seeded approved memory',
          metadataJson: {
            seeded: true,
            seedPlaceSlug: place.slug,
          },
        };
      }),
    });
  }

  const approvedCount = place.seededTags.length;

  await prisma.venueMemory.upsert({
    where: {
      venueId_bucketType_bucketStartAt: {
        venueId: venue.id,
        bucketType: 'DAY',
        bucketStartAt: dayStart,
      },
    },
    update: {
      bucketEndAt: dayEnd,
      checkInCount: Math.max(approvedCount * 3, 0),
      uniqueVisitorCount: approvedCount,
      dareCount: Math.max(1, Math.min(approvedCount, 3)),
      completedDareCount: Math.max(approvedCount - 1, 0),
      proofCount: approvedCount,
      perkRedemptionCount: 0,
      topCreatorTag: place.seededTags[0]?.creatorTag ?? null,
      metadataJson: {
        seeded: true,
        featuredLabel: place.featuredLabel ?? null,
      },
    },
    create: {
      venueId: venue.id,
      bucketType: 'DAY',
      bucketStartAt: dayStart,
      bucketEndAt: dayEnd,
      checkInCount: Math.max(approvedCount * 3, 0),
      uniqueVisitorCount: approvedCount,
      dareCount: Math.max(1, Math.min(approvedCount, 3)),
      completedDareCount: Math.max(approvedCount - 1, 0),
      proofCount: approvedCount,
      perkRedemptionCount: 0,
      topCreatorTag: place.seededTags[0]?.creatorTag ?? null,
      metadataJson: {
        seeded: true,
        featuredLabel: place.featuredLabel ?? null,
      },
    },
  });

  return venue;
}

async function seedPilotSession(venueId: string) {
  return prisma.venueQrSession.upsert({
    where: { sessionKey: 'siargao-beach-club-live' },
    update: {
      venueId,
      scope: 'VENUE_CHECKIN',
      status: 'LIVE',
      label: 'Siargao pilot venue console',
      campaignLabel: 'Foam Party Check-In',
      rotationSeconds: 45,
      startedAt: now,
      endsAt: null,
      lastRotatedAt: now,
      pausedAt: null,
      metadataJson: {
        seeded: true,
        perksEnabled: false,
      },
    },
    create: {
      venueId,
      scope: 'VENUE_CHECKIN',
      sessionKey: 'siargao-beach-club-live',
      status: 'LIVE',
      label: 'Siargao pilot venue console',
      campaignLabel: 'Foam Party Check-In',
      rotationSeconds: 45,
      startedAt: now,
      lastRotatedAt: now,
      metadataJson: {
        seeded: true,
        perksEnabled: false,
      },
    },
  });
}

async function main() {
  const seededVenueMap = new Map<string, Awaited<ReturnType<typeof upsertSeededPlace>>>();

  for (const place of SEEDED_PLACES) {
    const venue = await upsertSeededPlace(place);
    seededVenueMap.set(place.slug, venue);
  }

  const pilotVenue = seededVenueMap.get('siargao-beach-club');
  if (!pilotVenue) {
    throw new Error('Seeded pilot venue missing');
  }

  const pilotSession = await seedPilotSession(pilotVenue.id);

  const baseGod = await prisma.user.upsert({
    where: { walletAddress: '0xBaseGod0000000000000000000000000000000001' },
    update: {},
    create: {
      walletAddress: '0xBaseGod0000000000000000000000000000000001',
      baseTag: 'BaseGod',
      reputationScore: 1000,
    },
  });

  const xqc = await prisma.user.upsert({
    where: { walletAddress: '0xXqc0000000000000000000000000000000000002' },
    update: {},
    create: {
      walletAddress: '0xXqc0000000000000000000000000000000000002',
      baseTag: 'xQc',
      reputationScore: 750,
    },
  });

  const speed = await prisma.user.upsert({
    where: { walletAddress: '0xSpeed000000000000000000000000000000000003' },
    update: {},
    create: {
      walletAddress: '0xSpeed000000000000000000000000000000000003',
      baseTag: 'Speed',
      reputationScore: 600,
    },
  });

  const pilotVenueGeohash = encodeGeohash(pilotVenue.latitude, pilotVenue.longitude, 6);
  const dareData = [
    {
      shortId: 'seed-ghostp',
      title: 'Eat a Ghost Pepper',
      bounty: 50000.0,
      streamerHandle: 'xQc',
      status: 'PENDING' as const,
      creatorId: baseGod.id,
    },
    {
      shortId: 'seed-silent',
      title: '24 Hour Silent Stream',
      bounty: 25000.0,
      streamerHandle: 'Speed',
      status: 'VERIFIED' as const,
      creatorId: baseGod.id,
    },
    {
      shortId: 'seed-excall',
      title: 'Call Your Ex Live',
      bounty: 100000.0,
      streamerHandle: 'xQc',
      status: 'PENDING' as const,
      creatorId: speed.id,
    },
    {
      shortId: 'seed-dancep',
      title: 'Dance in Public',
      bounty: 15000.0,
      streamerHandle: 'Speed',
      status: 'VERIFIED' as const,
      creatorId: xqc.id,
    },
    {
      shortId: 'seed-fanmail',
      title: 'Read Fan Mail Aloud',
      bounty: 30000.0,
      streamerHandle: 'BaseGod',
      status: 'PENDING' as const,
      creatorId: xqc.id,
    },
    {
      shortId: 'seed-venue1',
      title: 'Freestyle with three strangers at Siargao Beach Club',
      bounty: 150.0,
      streamerHandle: null,
      missionMode: 'IRL' as const,
      status: 'PENDING' as const,
      creatorId: baseGod.id,
      venueId: pilotVenue.id,
      locationLabel: pilotVenue.name,
      latitude: pilotVenue.latitude,
      longitude: pilotVenue.longitude,
      geohash: pilotVenueGeohash,
      isNearbyDare: true,
      discoveryRadiusKm: 2,
      dare_text: 'Freestyle with three strangers at Siargao Beach Club',
    },
  ];

  for (const dare of dareData) {
    await prisma.dare.upsert({
      where: { shortId: dare.shortId },
      update: dare,
      create: dare,
    });
  }

  const seededVenueDare = await prisma.dare.findUnique({
    where: { shortId: 'seed-venue1' },
    select: { id: true },
  });

  await prisma.venueCheckIn.deleteMany({
    where: {
      venueId: pilotVenue.id,
      source: 'SEEDED_PILOT',
    },
  });

  await prisma.venueCheckIn.createMany({
    data: [
      {
        venueId: pilotVenue.id,
        venueSessionId: pilotSession.id,
        walletAddress: baseGod.walletAddress.toLowerCase(),
        tag: '@basedarebear',
        dareId: seededVenueDare?.id,
        status: 'CONFIRMED',
        proofLevel: 'QR_AND_GPS',
        source: 'SEEDED_PILOT',
        geoDistanceMeters: 18,
        scannedAt: now,
      },
      {
        venueId: pilotVenue.id,
        venueSessionId: pilotSession.id,
        walletAddress: xqc.walletAddress.toLowerCase(),
        tag: '@launchcheck177372',
        status: 'CONFIRMED',
        proofLevel: 'QR_ONLY',
        source: 'SEEDED_PILOT',
        geoDistanceMeters: 41,
        scannedAt: new Date(now.getTime() - 18 * 60 * 1000),
      },
    ],
  });

  console.log(`✅ Seeded ${SEEDED_PLACES.length} map places with place-memory states`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
