-- Add The Cat & Gun as a seeded Siargao venue anchor.

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
VALUES (
  'seed_the_cat_and_gun',
  'the-cat-and-gun',
  'The Cat & Gun',
  'Catangnan coffee and sports-bar stop with an obvious creator rail for food, match-night, and island hangout dares.',
  'R555+PWX, Catangnan',
  'General Luna',
  'Philippines',
  9.8093625,
  126.1598594,
  'wc9xyc',
  'Asia/Manila',
  ARRAY['cafe', 'coffee', 'sports-bar', 'food', 'siargao']::TEXT[],
  'ACTIVE',
  false,
  NULL,
  'seed',
  'seed:the-cat-and-gun',
  jsonb_build_object(
    'seeded', true,
    'featuredLabel', 'simmering',
    'vibe', 'Catangnan coffee and sports-bar stop with an obvious creator rail for food, match-night, and island hangout dares.',
    'locationConfidence', 'plus-code-approximate',
    'instagramHandle', '@the_cat_n_gun'
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
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
