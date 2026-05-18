-- Add denser Siargao cafe, breakfast, and rooftop anchors for intent search.

WITH siargao_venues(
  id,
  slug,
  name,
  description,
  address,
  city,
  country,
  latitude,
  longitude,
  geohash,
  categories,
  featured_label,
  location_confidence
) AS (
  VALUES
    (
      'seed_mr_turtle_siargao',
      'mr-turtle-siargao',
      'Mr. Turtle Siargao',
      'Catangnan beachfront breakfast, smoothie, and social anchor near Goodcoast for morning proof loops.',
      'Goodcoast, Tourism Road, Catangnan',
      'General Luna',
      'Philippines',
      9.80785::double precision,
      126.16085::double precision,
      'wc9xyc',
      ARRAY['restaurant', 'breakfast', 'brunch', 'smoothie', 'wellness', 'beachfront', 'bar', 'catangnan', 'trendy', 'siargao']::TEXT[],
      'morning',
      'curated-land-anchor'
    ),
    (
      'seed_greenhouse_cafe_siargao',
      'greenhouse-cafe-siargao',
      'Greenhouse Cafe Siargao',
      'Laidback Tourism Road breakfast cafe with organic island food and a calm morning route near Reef Beach.',
      'Greenhouse, Tourism Road',
      'General Luna',
      'Philippines',
      9.8112::double precision,
      126.15945::double precision,
      'wc9xyf',
      ARRAY['cafe', 'breakfast', 'brunch', 'healthy', 'organic', 'coffee', 'morning', 'catangnan', 'siargao']::TEXT[],
      'breakfast',
      'curated-land-anchor'
    ),
    (
      'seed_green_waves_cafe_siargao',
      'green-waves-cafe-siargao',
      'Green Waves Cafe',
      'Purok 3 cafe for coffee, brunch, smoothie bowls, and late casual food on the General Luna strip.',
      'Purok 3 Tourism Road',
      'General Luna',
      'Philippines',
      9.78785::double precision,
      126.15935::double precision,
      'wc9xwv',
      ARRAY['cafe', 'coffee', 'breakfast', 'brunch', 'smoothie-bowl', 'dessert', 'work-friendly', 'late-night', 'general-luna', 'siargao']::TEXT[],
      'breakfast',
      'curated-land-anchor'
    ),
    (
      'seed_spotted_pig_cafe_siargao',
      'spotted-pig-cafe-siargao',
      'Spotted Pig Cafe',
      'Catangnan all-day breakfast and specialty coffee stop with a strong brunch/work-friendly signal.',
      'Tourism Road, Catangnan',
      'General Luna',
      'Philippines',
      9.80555::double precision,
      126.16005::double precision,
      'wc9xyc',
      ARRAY['cafe', 'coffee', 'breakfast', 'brunch', 'bakery', 'work-friendly', 'catangnan', 'trendy', 'siargao']::TEXT[],
      'breakfast',
      'curated-land-anchor'
    ),
    (
      'seed_shapeshifter_cafe_siargao',
      'shapeshifter-cafe-siargao',
      'Shapeshifter Cafe',
      'Back Road cafe beside Tropical Temple for breakfast, smoothie bowls, surf errands, and quiet work starts.',
      'St. Ines Back Road, next to Tropical Temple',
      'General Luna',
      'Philippines',
      9.80495::double precision,
      126.15175::double precision,
      'wc9xy8',
      ARRAY['cafe', 'breakfast', 'brunch', 'smoothie-bowl', 'coffee', 'work-friendly', 'surf', 'back-road', 'catangnan', 'siargao']::TEXT[],
      'breakfast',
      'curated-land-anchor'
    ),
    (
      'seed_goodies_siargao',
      'goodies-siargao',
      'Goodies Siargao',
      'Healthy cafe, restaurant, bar, and eco shop on Tourism Road for breakfast, smoothies, and all-day food.',
      'Arka Hayahay Surf and Beach Resort, Tourism Road',
      'General Luna',
      'Philippines',
      9.79395::double precision,
      126.16062::double precision,
      'wc9xwy',
      ARRAY['cafe', 'restaurant', 'bar', 'breakfast', 'brunch', 'healthy', 'smoothie', 'eco-shop', 'general-luna', 'siargao']::TEXT[],
      'breakfast',
      'curated-land-anchor'
    ),
    (
      'seed_naga_siargao',
      'naga-siargao',
      'NAGA Siargao',
      'Tourism Road restaurant, cocktail bar, and work-friendly social stop for daytime laptop sessions and dinner.',
      'Tourism Road',
      'General Luna',
      'Philippines',
      9.79235::double precision,
      126.16008::double precision,
      'wc9xwy',
      ARRAY['restaurant', 'bar', 'cocktails', 'coffee', 'work-friendly', 'lunch', 'dinner', 'nightlife', 'trendy', 'siargao']::TEXT[],
      'trendy',
      'curated-land-anchor'
    ),
    (
      'seed_gaya_rooftop_space',
      'gaya-rooftop-space',
      'GAYA Rooftop Space',
      'Lexias rooftop social venue for sunset sessions, brunch energy, coworking spillover, and night events.',
      'Lexias Hostel and Workspace',
      'General Luna',
      'Philippines',
      9.80335::double precision,
      126.15685::double precision,
      'wc9xyb',
      ARRAY['rooftop', 'restaurant', 'bar', 'brunch', 'sunset', 'nightlife', 'coworking', 'events', 'trendy', 'siargao']::TEXT[],
      'rooftop',
      'curated-land-anchor'
    ),
    (
      'seed_loka_siargao',
      'loka-siargao',
      'LOKA Siargao',
      'Cloud 9 beachfront restaurant, bar, and shop with early coffee, breakfast, surf fuel, and sunset food.',
      'Cloud 9 Drive',
      'General Luna',
      'Philippines',
      9.81305::double precision,
      126.16165::double precision,
      'wc9xyf',
      ARRAY['restaurant', 'bar', 'coffee', 'breakfast', 'brunch', 'beachfront', 'surf-view', 'cloud-9', 'trendy', 'siargao']::TEXT[],
      'surf-breakfast',
      'curated-land-anchor'
    ),
    (
      'seed_nalu_cafe_bistro_siargao',
      'nalu-cafe-bistro-siargao',
      'Nalu Cafe Bistro Siargao',
      'Back Road Saging-saging bistro for Catangnan breakfast, coffee, and calmer inland food discovery.',
      'Back Road Saging-saging, Barangay Catangnan',
      'General Luna',
      'Philippines',
      9.8068::double precision,
      126.1544::double precision,
      'wc9xy9',
      ARRAY['cafe', 'bistro', 'breakfast', 'brunch', 'coffee', 'back-road', 'catangnan', 'siargao']::TEXT[],
      'breakfast',
      'curated-land-anchor'
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
  "partnerTier",
  "placeSource",
  "externalPlaceId",
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
  city,
  country,
  latitude,
  longitude,
  geohash,
  'Asia/Manila',
  categories,
  'ACTIVE',
  false,
  NULL,
  'BASEDARE_CURATED',
  'curated:' || slug,
  jsonb_build_object(
    'seeded', true,
    'seedBatch', 'siargao-breakfast-rooftop-20260518',
    'curatedSet', 'siargao-v4',
    'featuredLabel', featured_label,
    'vibe', description,
    'locationConfidence', location_confidence,
    'coordinatePolicy', 'Pinned to venue or street-side land anchor for clearer map routing.'
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM siargao_venues
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
  "metadataJson" = COALESCE("Venue"."metadataJson", '{}'::jsonb) || EXCLUDED."metadataJson",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "Venue"
SET
  "latitude" = 9.8094::double precision,
  "longitude" = 126.1683::double precision,
  "geohash" = 'wc9xz1',
  "metadataJson" = COALESCE("metadataJson", '{}'::jsonb) || jsonb_build_object(
    'locationConfidence', 'curated-land-anchor',
    'coordinatePolicy', 'Moved to the Tuason Point coast/road anchor instead of the earlier inland estimate.'
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'tuason-point';

UPDATE "Venue"
SET
  "latitude" = 9.7684925::double precision,
  "longitude" = 126.1289878::double precision,
  "geohash" = 'wc9xw4',
  "metadataJson" = COALESCE("metadataJson", '{}'::jsonb) || jsonb_build_object(
    'locationConfidence', 'curated-land-anchor',
    'coordinatePolicy', 'Moved to a Malinao shore/road anchor instead of the earlier water-side estimate.'
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'malinao-beach';
