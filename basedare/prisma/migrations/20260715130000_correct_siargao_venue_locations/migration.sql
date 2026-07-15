-- Correct the user-verified Siargao venue anchors and add the two missing nightlife places.
-- Historical proof-attempt coordinates remain immutable; only live venue anchors and
-- still-open nearby dares follow these corrections.

WITH corrected_venues(
  id,
  slug,
  name,
  description,
  address,
  latitude,
  longitude,
  geohash,
  categories,
  instagram_handle,
  coordinate_source
) AS (
  VALUES
    (
      'seed_hideaway',
      'hideaway',
      'Hideaway',
      'Boardwalk bar energy right by the island hopping dock in General Luna.',
      'Boardwalk, General Luna, 8419 Surigao del Norte, Philippines',
      9.7810522::double precision,
      126.1570569::double precision,
      'wc9xwu',
      ARRAY['nightlife', 'boardwalk', 'dock', 'bar', 'dinner', 'late-night', 'siargao', 'general-luna']::TEXT[],
      NULL,
      'Siargao Island Hopping Dock public map anchor'
    ),
    (
      'seed_goodies_siargao',
      'goodies-siargao',
      'Goodies Siargao',
      'Healthy cafe, restaurant, bar, and eco shop on Tourism Road for breakfast, smoothies, and all-day food.',
      'Arka Hayahay Surf and Beach Resort, Tourism Road, General Luna, Surigao del Norte, Philippines',
      9.8019569::double precision,
      126.1599488::double precision,
      'wc9xyb',
      ARRAY['cafe', 'restaurant', 'bar', 'breakfast', 'brunch', 'healthy', 'smoothie', 'eco-shop', 'general-luna', 'siargao']::TEXT[],
      NULL,
      'Arka Hayahay public map anchor'
    ),
    (
      'seed_happiness_beach_bar_siargao',
      'happiness-beach-bar-siargao',
      'Happiness Beach Bar Siargao',
      'Catangnan beach bar and social hostel stop for Sunday sessions, poolside hangs, and meeting other travellers.',
      'Tourism Road, Catangnan, General Luna, Surigao del Norte, Philippines',
      9.8018102::double precision,
      126.159654::double precision,
      'wc9xyb',
      ARRAY['bar', 'nightlife', 'social', 'hostel', 'pool', 'sunday', 'catangnan', 'siargao']::TEXT[],
      NULL,
      'Happiness Hostel public map anchor'
    ),
    (
      'seed_barbosa_siargao',
      'barbosa-siargao',
      'Barbosa Siargao',
      'Purok 3 pub and music-led nightlife stop beside Barrel for cocktails, food, vinyl energy, and late social discovery.',
      'Tourism Road, Poblacion III, General Luna, Surigao del Norte, Philippines',
      9.789532::double precision,
      126.161923::double precision,
      'wc9xwy',
      ARRAY['pub', 'bar', 'nightlife', 'music', 'cocktails', 'food', 'late-night', 'purok-3', 'siargao', 'general-luna']::TEXT[],
      '@barbosasiargao',
      'Barbosa Siargao public business map anchor'
    )
)
INSERT INTO "Venue" (
  "id",
  "slug",
  "name",
  "description",
  "address",
  "city",
  "country",
  "latitude",
  "longitude",
  "geohash",
  "timezone",
  "categories",
  "status",
  "isPartner",
  "placeSource",
  "externalPlaceId",
  "checkInRadiusMeters",
  "metadataJson",
  "createdAt",
  "updatedAt"
)
SELECT
  id,
  slug,
  name,
  description,
  address,
  'General Luna',
  'Philippines',
  latitude,
  longitude,
  geohash,
  'Asia/Manila',
  categories,
  'ACTIVE',
  false,
  'BASEDARE_CURATED',
  'curated:' || slug,
  120,
  jsonb_strip_nulls(jsonb_build_object(
    'curated', true,
    'curatedSet', 'siargao-v7',
    'locationConfidence', 'field-checked-anchor',
    'coordinatePolicy', 'Pinned to the user-confirmed venue position and checked against the named public map anchor.',
    'coordinateCorrection', jsonb_build_object(
      'source', '20260715130000_correct_siargao_venue_locations',
      'reference', coordinate_source,
      'correctedAt', CURRENT_TIMESTAMP
    ),
    'instagramHandle', instagram_handle
  )),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM corrected_venues
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "address" = EXCLUDED."address",
  "city" = EXCLUDED."city",
  "country" = EXCLUDED."country",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "geohash" = EXCLUDED."geohash",
  "timezone" = EXCLUDED."timezone",
  "categories" = EXCLUDED."categories",
  "status" = EXCLUDED."status",
  "placeSource" = EXCLUDED."placeSource",
  "externalPlaceId" = EXCLUDED."externalPlaceId",
  "checkInRadiusMeters" = EXCLUDED."checkInRadiusMeters",
  "metadataJson" = COALESCE("Venue"."metadataJson", '{}'::jsonb) || EXCLUDED."metadataJson",
  "updatedAt" = CURRENT_TIMESTAMP;

WITH corrected(slug, latitude, longitude, geohash) AS (
  VALUES
    ('hideaway', 9.7810522::double precision, 126.1570569::double precision, 'wc9xwu'),
    ('goodies-siargao', 9.8019569::double precision, 126.1599488::double precision, 'wc9xyb'),
    ('happiness-beach-bar-siargao', 9.8018102::double precision, 126.159654::double precision, 'wc9xyb'),
    ('barbosa-siargao', 9.789532::double precision, 126.161923::double precision, 'wc9xwy')
)
UPDATE "Dare" AS dare
SET
  "latitude" = corrected.latitude,
  "longitude" = corrected.longitude,
  "geohash" = corrected.geohash,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Venue" AS venue
JOIN corrected ON corrected.slug = venue.slug
WHERE dare."venueId" = venue.id
  AND dare."isNearbyDare" = true
  AND dare."status" IN ('FUNDING', 'AWAITING_CLAIM', 'PENDING_ACCEPTANCE', 'PENDING')
  AND dare."latitude" IS NOT NULL
  AND dare."longitude" IS NOT NULL;
