\set ON_ERROR_STOP on

BEGIN;

INSERT INTO "Venue" ("id", "slug", "name", "latitude", "longitude", "status", "updatedAt") VALUES
  ('pm_venue_a', 'pm-venue-a', 'Mechanics Place A', 9.78, 126.16, 'ACTIVE', CURRENT_TIMESTAMP),
  ('pm_venue_b', 'pm-venue-b', 'Mechanics Place B', 9.79, 126.17, 'ACTIVE', CURRENT_TIMESTAMP);

INSERT INTO "VenueCheckIn" ("id", "venueId", "walletAddress", "status", "proofLevel", "scannedAt", "updatedAt") VALUES
  ('pm_checkin_valid', 'pm_venue_a', '0x1111111111111111111111111111111111111111', 'CONFIRMED', 'QR_AND_GPS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pm_checkin_wrong_venue', 'pm_venue_b', '0x1111111111111111111111111111111111111111', 'CONFIRMED', 'QR_AND_GPS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pm_checkin_wrong_wallet', 'pm_venue_a', '0x2222222222222222222222222222222222222222', 'CONFIRMED', 'QR_AND_GPS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "AttributionJourney" ("id", "cookieHash", "status", "firstSeenAt", "lastSeenAt", "expiresAt")
VALUES ('pm_journey', 'pm_cookie_hash', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 day');

INSERT INTO "PlayableRoute" ("id", "slug", "title", "description", "mode", "status", "createdBy", "updatedAt")
VALUES ('pm_route', 'pm-route', 'Mechanics Route', 'Database evidence guard smoke route.', 'ORDERED', 'PUBLISHED', 'test', CURRENT_TIMESTAMP);

INSERT INTO "PlayableRouteStop" ("id", "routeId", "venueId", "ordinal", "loreTitle", "loreBody") VALUES
  ('pm_stop_a', 'pm_route', 'pm_venue_a', 1, 'First stop', 'Observe the first place.'),
  ('pm_stop_b', 'pm_route', 'pm_venue_b', 2, 'Second stop', 'Observe the second place.');

INSERT INTO "PlayableRouteRun" ("id", "routeId", "journeyId", "walletAddress", "status", "receiptCode", "updatedAt")
VALUES ('pm_run', 'pm_route', 'pm_journey', '0x1111111111111111111111111111111111111111', 'ACTIVE', 'pm_receipt', CURRENT_TIMESTAMP);

INSERT INTO "PlayableRouteProgress" ("id", "runId", "stopId", "checkInId")
VALUES ('pm_progress_valid', 'pm_run', 'pm_stop_a', 'pm_checkin_valid');

DO $$
BEGIN
  BEGIN
    INSERT INTO "PlayableRouteProgress" ("id", "runId", "stopId", "checkInId")
    VALUES ('pm_progress_wrong_venue', 'pm_run', 'pm_stop_b', 'pm_checkin_wrong_wallet');
    RAISE EXCEPTION 'expected route progress evidence guard to reject mismatched evidence';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected route progress evidence guard to reject mismatched evidence' THEN RAISE; END IF;
  END;
END $$;

INSERT INTO "PlaceEndorsement" ("id", "venueId", "walletAddress", "checkInId", "status", "updatedAt")
VALUES ('pm_endorsement_valid', 'pm_venue_a', '0x1111111111111111111111111111111111111111', 'pm_checkin_valid', 'ACTIVE', CURRENT_TIMESTAMP);

DO $$
BEGIN
  BEGIN
    INSERT INTO "PlaceEndorsement" ("id", "venueId", "walletAddress", "checkInId", "status", "updatedAt")
    VALUES ('pm_endorsement_invalid', 'pm_venue_a', '0x1111111111111111111111111111111111111111', 'pm_checkin_wrong_venue', 'ACTIVE', CURRENT_TIMESTAMP);
    RAISE EXCEPTION 'expected endorsement evidence guard to reject a mismatched venue';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected endorsement evidence guard to reject a mismatched venue' THEN RAISE; END IF;
  END;
END $$;

DO $$
DECLARE
  unsecured INTEGER;
BEGIN
  SELECT COUNT(*) INTO unsecured
  FROM pg_class
  WHERE relname IN ('PlayableRoute', 'PlayableRouteStop', 'PlayableRouteRun', 'PlayableRouteProgress', 'PlaceEndorsement')
    AND relrowsecurity = FALSE;
  IF unsecured <> 0 THEN RAISE EXCEPTION 'new mechanics tables must have RLS enabled'; END IF;
END $$;

ROLLBACK;
