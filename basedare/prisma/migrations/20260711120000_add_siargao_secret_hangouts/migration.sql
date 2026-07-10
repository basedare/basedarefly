-- Siargao "secret" public hangout spots: nature/hangout venues with place-appropriate legend badges.
-- Idempotent (ON CONFLICT (slug) DO UPDATE) — safe to re-run. Coordinates are best-effort seeds
-- (metadataJson.locationConfidence = 'approximate-seed') and can be refined by re-running with fixes.

WITH secret_venues(
  id, slug, name, description, address, city, country,
  latitude, longitude, geohash, categories, legend_key, featured_label, location_confidence
) AS (
  VALUES
    (
      'seed_maasin_river_siargao',
      'maasin-river-siargao',
      'Maasin River (Rope Swing)',
      'Jungle-lined river with the famous coconut-tree rope swing - a local freshwater hangout off the Del Carmen road.',
      'Maasin, Del Carmen road',
      'Del Carmen',
      'Philippines',
      9.836::double precision,
      126.083::double precision,
      'wc9xvn',
      ARRAY['hangout', 'river', 'nature', 'freshwater', 'siargao']::TEXT[],
      'river',
      'active',
      'approximate-seed'
    ),
    (
      'seed_coconut_viewpoint_siargao',
      'coconut-viewpoint-siargao',
      'Coconut Sunset Viewpoint',
      'Ridge lookout over the endless coconut forest - a golden-hour gathering spot on the road toward Pilar.',
      'Coconut Road ridge',
      'Pilar',
      'Philippines',
      9.845::double precision,
      126.095::double precision,
      'wcc8j2',
      ARRAY['hangout', 'viewpoint', 'sunset', 'nature', 'siargao']::TEXT[],
      'viewpoint',
      'active',
      'approximate-seed'
    ),
    (
      'seed_magpupungko_rock_pools',
      'magpupungko-rock-pools',
      'Magpupungko Rock Pools',
      'Natural tidal rock pools revealed at low tide - a swim-and-chill spot on the Pilar coast.',
      'Magpupungko, Pilar',
      'Pilar',
      'Philippines',
      9.9175::double precision,
      126.101::double precision,
      'wcc8mm',
      ARRAY['hangout', 'water', 'rock-pool', 'nature', 'siargao']::TEXT[],
      'water',
      'active',
      'approximate-seed'
    ),
    (
      'seed_sugba_lagoon_siargao',
      'sugba-lagoon-siargao',
      'Sugba Lagoon',
      'Turquoise mangrove lagoon with a diving platform - a day-trip hangout out of Del Carmen.',
      'Sugba, Del Carmen',
      'Del Carmen',
      'Philippines',
      9.898::double precision,
      125.982::double precision,
      'wcc86c',
      ARRAY['hangout', 'water', 'lagoon', 'nature', 'siargao']::TEXT[],
      'water',
      'active',
      'approximate-seed'
    ),
    (
      'seed_tayangban_cave_pool',
      'tayangban-cave-pool',
      'Tayangban Cave Pool',
      'Hidden cave pool you wade and swim through - a cool jungle escape near Pilar.',
      'Tayangban, Pilar',
      'Pilar',
      'Philippines',
      9.87::double precision,
      126.115::double precision,
      'wcc8ju',
      ARRAY['hangout', 'cave', 'nature', 'siargao']::TEXT[],
      'cave',
      'active',
      'approximate-seed'
    ),
    (
      'seed_pacifico_beach_siargao',
      'pacifico-beach-siargao',
      'Pacifico Beach',
      'Quiet wide beach on the north coast - mellow surf and low-key sunset hangouts.',
      'Pacifico, San Isidro',
      'San Isidro',
      'Philippines',
      9.976::double precision,
      126.276::double precision,
      'wccbc2',
      ARRAY['hangout', 'beach', 'surf', 'nature', 'siargao']::TEXT[],
      'beach',
      'active',
      'approximate-seed'
    ),
    (
      'seed_alegria_black_sand_beach',
      'alegria-black-sand-beach',
      'Alegria Black-Sand Beach',
      'Remote black-sand beach in the far north - an off-the-map quiet hangout.',
      'Alegria',
      'Alegria',
      'Philippines',
      10::double precision,
      126::double precision,
      'wcc8gh',
      ARRAY['hangout', 'beach', 'nature', 'siargao']::TEXT[],
      'beach',
      'active',
      'approximate-seed'
    )
)
INSERT INTO "Venue" (
  "id", "slug", "name", "description", "address", "city", "country",
  "latitude", "longitude", "geohash", "timezone", "categories", "status", "isPartner", "partnerTier",
  "placeSource", "externalPlaceId", "metadataJson", "createdAt", "updatedAt"
)
SELECT
  id, slug, name, description, address, city, country,
  latitude, longitude, geohash, 'Asia/Manila', categories, 'ACTIVE', false, NULL,
  'seed', 'seed:' || slug,
  jsonb_build_object(
    'seeded', true,
    'seedBatch', 'siargao-secret-hangouts-20260711',
    'featuredLabel', featured_label,
    'vibe', description,
    'locationConfidence', location_confidence,
    'isPublicHangoutSpot', true,
    'legendKeys', jsonb_build_array(legend_key)
  ),
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM secret_venues
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
