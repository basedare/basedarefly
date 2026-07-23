CREATE TABLE "PlayableRoute" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'ORDERED',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "loreIntro" TEXT,
    "createdBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlayableRoute_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PlayableRoute_mode_check" CHECK ("mode" IN ('ORDERED', 'FREE_PLAY')),
    CONSTRAINT "PlayableRoute_status_check" CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'RETIRED'))
);

CREATE TABLE "PlayableRouteStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "loreTitle" TEXT NOT NULL,
    "loreBody" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayableRouteStop_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PlayableRouteStop_ordinal_check" CHECK ("ordinal" BETWEEN 1 AND 5)
);

CREATE TABLE "PlayableRouteRun" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "actionIntentId" TEXT,
    "walletAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "receiptCode" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlayableRouteRun_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PlayableRouteRun_status_check" CHECK ("status" IN ('ACTIVE', 'COMPLETE'))
);

CREATE TABLE "PlayableRouteProgress" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayableRouteProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlaceEndorsement" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "tag" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlaceEndorsement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PlaceEndorsement_status_check" CHECK ("status" IN ('ACTIVE', 'RETRACTED', 'SUPPRESSED'))
);

CREATE UNIQUE INDEX "PlayableRoute_slug_key" ON "PlayableRoute"("slug");
CREATE INDEX "PlayableRoute_status_publishedAt_idx" ON "PlayableRoute"("status", "publishedAt");
CREATE INDEX "PlayableRoute_createdBy_createdAt_idx" ON "PlayableRoute"("createdBy", "createdAt");
CREATE UNIQUE INDEX "PlayableRouteStop_routeId_ordinal_key" ON "PlayableRouteStop"("routeId", "ordinal");
CREATE UNIQUE INDEX "PlayableRouteStop_routeId_venueId_key" ON "PlayableRouteStop"("routeId", "venueId");
CREATE INDEX "PlayableRouteStop_venueId_idx" ON "PlayableRouteStop"("venueId");
CREATE UNIQUE INDEX "PlayableRouteRun_actionIntentId_key" ON "PlayableRouteRun"("actionIntentId");
CREATE UNIQUE INDEX "PlayableRouteRun_receiptCode_key" ON "PlayableRouteRun"("receiptCode");
CREATE UNIQUE INDEX "PlayableRouteRun_routeId_journeyId_key" ON "PlayableRouteRun"("routeId", "journeyId");
CREATE INDEX "PlayableRouteRun_walletAddress_status_idx" ON "PlayableRouteRun"("walletAddress", "status");
CREATE INDEX "PlayableRouteRun_routeId_status_idx" ON "PlayableRouteRun"("routeId", "status");
CREATE UNIQUE INDEX "PlayableRouteProgress_checkInId_key" ON "PlayableRouteProgress"("checkInId");
CREATE UNIQUE INDEX "PlayableRouteProgress_runId_stopId_key" ON "PlayableRouteProgress"("runId", "stopId");
CREATE INDEX "PlayableRouteProgress_stopId_completedAt_idx" ON "PlayableRouteProgress"("stopId", "completedAt");
CREATE UNIQUE INDEX "PlaceEndorsement_venueId_walletAddress_key" ON "PlaceEndorsement"("venueId", "walletAddress");
CREATE INDEX "PlaceEndorsement_venueId_status_createdAt_idx" ON "PlaceEndorsement"("venueId", "status", "createdAt");
CREATE INDEX "PlaceEndorsement_walletAddress_status_createdAt_idx" ON "PlaceEndorsement"("walletAddress", "status", "createdAt");
CREATE INDEX "PlaceEndorsement_checkInId_idx" ON "PlaceEndorsement"("checkInId");

ALTER TABLE "PlayableRouteStop" ADD CONSTRAINT "PlayableRouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "PlayableRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayableRouteStop" ADD CONSTRAINT "PlayableRouteStop_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayableRouteRun" ADD CONSTRAINT "PlayableRouteRun_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "PlayableRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayableRouteRun" ADD CONSTRAINT "PlayableRouteRun_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "AttributionJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayableRouteRun" ADD CONSTRAINT "PlayableRouteRun_actionIntentId_fkey" FOREIGN KEY ("actionIntentId") REFERENCES "ActionIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlayableRouteProgress" ADD CONSTRAINT "PlayableRouteProgress_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PlayableRouteRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayableRouteProgress" ADD CONSTRAINT "PlayableRouteProgress_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "PlayableRouteStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayableRouteProgress" ADD CONSTRAINT "PlayableRouteProgress_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "VenueCheckIn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlaceEndorsement" ADD CONSTRAINT "PlaceEndorsement_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaceEndorsement" ADD CONSTRAINT "PlaceEndorsement_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "VenueCheckIn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_playable_route_progress_evidence()
RETURNS TRIGGER AS $$
DECLARE
    run_route_id TEXT;
    run_wallet TEXT;
    stop_route_id TEXT;
    stop_venue_id TEXT;
    checkin_venue_id TEXT;
    checkin_wallet TEXT;
    checkin_status TEXT;
    checkin_level TEXT;
    checkin_scanned_at TIMESTAMP(3);
BEGIN
    SELECT "routeId", "walletAddress" INTO run_route_id, run_wallet FROM "PlayableRouteRun" WHERE "id" = NEW."runId";
    SELECT "routeId", "venueId" INTO stop_route_id, stop_venue_id FROM "PlayableRouteStop" WHERE "id" = NEW."stopId";
    SELECT "venueId", "walletAddress", "status", "proofLevel", "scannedAt"
      INTO checkin_venue_id, checkin_wallet, checkin_status, checkin_level, checkin_scanned_at
      FROM "VenueCheckIn" WHERE "id" = NEW."checkInId";

    IF run_route_id IS NULL OR stop_route_id IS NULL OR run_route_id <> stop_route_id THEN
        RAISE EXCEPTION 'route progress stop must belong to the run route';
    END IF;
    IF run_wallet IS NULL OR checkin_wallet IS NULL OR LOWER(run_wallet) <> LOWER(checkin_wallet) THEN
        RAISE EXCEPTION 'route progress check-in wallet must match the run wallet';
    END IF;
    IF checkin_venue_id <> stop_venue_id THEN
        RAISE EXCEPTION 'route progress check-in venue must match the route stop';
    END IF;
    IF checkin_status <> 'CONFIRMED' OR checkin_level <> 'QR_AND_GPS' THEN
        RAISE EXCEPTION 'route progress requires a confirmed QR_AND_GPS check-in';
    END IF;
    IF checkin_scanned_at < CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN
        RAISE EXCEPTION 'route progress check-in is older than 24 hours';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PlayableRouteProgress_evidence_guard"
BEFORE INSERT OR UPDATE ON "PlayableRouteProgress"
FOR EACH ROW EXECUTE FUNCTION enforce_playable_route_progress_evidence();

CREATE OR REPLACE FUNCTION enforce_place_endorsement_evidence()
RETURNS TRIGGER AS $$
DECLARE
    checkin_venue_id TEXT;
    checkin_wallet TEXT;
    checkin_status TEXT;
    checkin_level TEXT;
BEGIN
    SELECT "venueId", "walletAddress", "status", "proofLevel"
      INTO checkin_venue_id, checkin_wallet, checkin_status, checkin_level
      FROM "VenueCheckIn" WHERE "id" = NEW."checkInId";

    IF checkin_venue_id IS NULL OR checkin_venue_id <> NEW."venueId" THEN
        RAISE EXCEPTION 'endorsement check-in venue must match the endorsed place';
    END IF;
    IF checkin_wallet IS NULL OR LOWER(checkin_wallet) <> LOWER(NEW."walletAddress") THEN
        RAISE EXCEPTION 'endorsement check-in wallet must match the endorser';
    END IF;
    IF checkin_status <> 'CONFIRMED' OR checkin_level <> 'QR_AND_GPS' THEN
        RAISE EXCEPTION 'endorsement requires a confirmed QR_AND_GPS check-in';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PlaceEndorsement_evidence_guard"
BEFORE INSERT OR UPDATE OF "venueId", "walletAddress", "checkInId" ON "PlaceEndorsement"
FOR EACH ROW EXECUTE FUNCTION enforce_place_endorsement_evidence();

ALTER TABLE "PlayableRoute" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlayableRouteStop" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlayableRouteRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlayableRouteProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlaceEndorsement" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "PlayableRoute" FROM anon, authenticated;
REVOKE ALL ON TABLE "PlayableRouteStop" FROM anon, authenticated;
REVOKE ALL ON TABLE "PlayableRouteRun" FROM anon, authenticated;
REVOKE ALL ON TABLE "PlayableRouteProgress" FROM anon, authenticated;
REVOKE ALL ON TABLE "PlaceEndorsement" FROM anon, authenticated;
