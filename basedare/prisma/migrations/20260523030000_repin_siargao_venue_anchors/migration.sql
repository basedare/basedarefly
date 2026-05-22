-- Re-pin curated Siargao venues to checked venue/map anchors.
-- Keep historical migrations immutable; this migration corrects live rows and nearby dare coordinates.

WITH corrected(slug, latitude, longitude, geohash, location_confidence) AS (
  VALUES
    ('siargao-beach-club', 9.785133::double precision, 126.161438::double precision, 'wc9xwv', 'externally-checked-anchor'),
    ('shaka-siargao', 9.8119606::double precision, 126.1644192::double precision, 'wc9xyf', 'externally-checked-anchor'),
    ('kermit-siargao', 9.7877583::double precision, 126.160523::double precision, 'wc9xwv', 'externally-checked-anchor'),
    ('bravo-restaurant-siargao', 9.7919::double precision, 126.162584::double precision, 'wc9xwy', 'externally-checked-anchor'),
    ('harana-surf-resort', 9.8068136::double precision, 126.1670614::double precision, 'wc9xz1', 'externally-checked-anchor'),
    ('white-beard-coffee-siargao', 9.7820115::double precision, 126.1560357::double precision, 'wc9xwu', 'externally-checked-anchor'),
    ('mr-turtle-siargao', 9.80695::double precision, 126.1662::double precision, 'wc9xyc', 'approximate-goodcoast-anchor'),
    ('greenhouse-cafe-siargao', 9.803789::double precision, 126.161223::double precision, 'wc9xyb', 'externally-checked-anchor'),
    ('green-waves-cafe-siargao', 9.7843233::double precision, 126.1580796::double precision, 'wc9xwv', 'externally-checked-anchor'),
    ('spotted-pig-cafe-siargao', 9.80199::double precision, 126.15996::double precision, 'wc9xyb', 'externally-checked-anchor'),
    ('shapeshifter-cafe-siargao', 9.8010026::double precision, 126.1582172::double precision, 'wc9xyb', 'externally-checked-anchor'),
    ('loka-siargao', 9.8132877::double precision, 126.1632141::double precision, 'wc9xyf', 'externally-checked-anchor'),
    ('barrel-siargao', 9.7896886::double precision, 126.161981::double precision, 'wc9xwy', 'externally-checked-anchor')
)
UPDATE "Venue" AS venue
SET
  "latitude" = corrected.latitude,
  "longitude" = corrected.longitude,
  "geohash" = corrected.geohash,
  "metadataJson" = COALESCE(venue."metadataJson", '{}'::jsonb) || jsonb_build_object(
    'curatedSet', 'siargao-v5',
    'locationConfidence', corrected.location_confidence,
    'coordinatePolicy', 'Pinned to externally checked venue/map anchors; unresolved venues use explicit approximate land anchors.',
    'coordinateCorrection', jsonb_build_object(
      'source', '20260523030000_repin_siargao_venue_anchors',
      'reason', 'Correct curated Siargao venue pins that were appearing on water or wrong road-side anchors.',
      'correctedAt', CURRENT_TIMESTAMP
    )
  ),
  "updatedAt" = CURRENT_TIMESTAMP
FROM corrected
WHERE venue."slug" = corrected.slug;

WITH corrected(slug, latitude, longitude, geohash) AS (
  VALUES
    ('siargao-beach-club', 9.785133::double precision, 126.161438::double precision, 'wc9xwv'),
    ('shaka-siargao', 9.8119606::double precision, 126.1644192::double precision, 'wc9xyf'),
    ('kermit-siargao', 9.7877583::double precision, 126.160523::double precision, 'wc9xwv'),
    ('bravo-restaurant-siargao', 9.7919::double precision, 126.162584::double precision, 'wc9xwy'),
    ('harana-surf-resort', 9.8068136::double precision, 126.1670614::double precision, 'wc9xz1'),
    ('white-beard-coffee-siargao', 9.7820115::double precision, 126.1560357::double precision, 'wc9xwu'),
    ('mr-turtle-siargao', 9.80695::double precision, 126.1662::double precision, 'wc9xyc'),
    ('greenhouse-cafe-siargao', 9.803789::double precision, 126.161223::double precision, 'wc9xyb'),
    ('green-waves-cafe-siargao', 9.7843233::double precision, 126.1580796::double precision, 'wc9xwv'),
    ('spotted-pig-cafe-siargao', 9.80199::double precision, 126.15996::double precision, 'wc9xyb'),
    ('shapeshifter-cafe-siargao', 9.8010026::double precision, 126.1582172::double precision, 'wc9xyb'),
    ('loka-siargao', 9.8132877::double precision, 126.1632141::double precision, 'wc9xyf'),
    ('barrel-siargao', 9.7896886::double precision, 126.161981::double precision, 'wc9xwy')
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
  AND dare."latitude" IS NOT NULL
  AND dare."longitude" IS NOT NULL;
