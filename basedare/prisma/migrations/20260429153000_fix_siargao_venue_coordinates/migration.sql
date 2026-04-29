-- Move seeded Siargao pilot venues from water-side coordinates to land-side venue anchors.

WITH corrected(slug, latitude, longitude, geohash) AS (
  VALUES
    ('hideaway', 9.781127::double precision, 126.1566563::double precision, 'wc9xwu'),
    ('siargao-beach-club', 9.785551::double precision, 126.161095::double precision, 'wc9xwv')
)
UPDATE "Venue" AS venue
SET
  "latitude" = corrected.latitude,
  "longitude" = corrected.longitude,
  "geohash" = corrected.geohash,
  "metadataJson" = COALESCE(venue."metadataJson", '{}'::jsonb) || jsonb_build_object(
    'coordinateCorrection', jsonb_build_object(
      'source', '20260429153000_fix_siargao_venue_coordinates',
      'reason', 'Move Siargao pilot venue marker from water-side coordinate to land-side venue anchor',
      'correctedAt', CURRENT_TIMESTAMP
    )
  ),
  "updatedAt" = CURRENT_TIMESTAMP
FROM corrected
WHERE venue."slug" = corrected.slug;

WITH corrected(slug, latitude, longitude, geohash) AS (
  VALUES
    ('hideaway', 9.781127::double precision, 126.1566563::double precision, 'wc9xwu'),
    ('siargao-beach-club', 9.785551::double precision, 126.161095::double precision, 'wc9xwv')
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
