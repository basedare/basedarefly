-- Field Station acquisition alpha.
-- Physical QR scans remain discovery touches only. They never authorize a
-- claim, prove presence, move money, or reuse the rotating venue-handshake QR.

CREATE SEQUENCE IF NOT EXISTS "CreatorAttributionLink_serialNumber_seq";

ALTER TABLE "CreatorAttributionLink"
  ADD COLUMN "serialNumber" INTEGER NOT NULL DEFAULT nextval('"CreatorAttributionLink_serialNumber_seq"'),
  ADD COLUMN "stationCode" TEXT,
  ADD COLUMN "stationHostVenueId" TEXT,
  ADD COLUMN "attentionMode" TEXT,
  ADD COLUMN "fallbackAttentionMode" TEXT,
  ADD COLUMN "minimumDensity" INTEGER,
  ADD COLUMN "densityRadiusKm" DOUBLE PRECISION;

ALTER SEQUENCE "CreatorAttributionLink_serialNumber_seq"
  OWNED BY "CreatorAttributionLink"."serialNumber";

ALTER TABLE "AttributionTouch"
  ADD COLUMN "stationCode" TEXT,
  ADD COLUMN "stationHostVenueId" TEXT,
  ADD COLUMN "requestedAttentionMode" TEXT,
  ADD COLUMN "attentionMode" TEXT,
  ADD COLUMN "densityCount" INTEGER,
  ADD COLUMN "fallbackApplied" BOOLEAN;

ALTER TABLE "ActionIntent"
  ADD COLUMN "stationTouchId" TEXT,
  ADD COLUMN "destinationVenueId" TEXT;

ALTER TABLE "AttributionEvent"
  ADD COLUMN "stationCode" TEXT,
  ADD COLUMN "stationHostVenueId" TEXT,
  ADD COLUMN "attentionMode" TEXT,
  ADD COLUMN "destinationVenueId" TEXT;

CREATE UNIQUE INDEX "CreatorAttributionLink_serialNumber_key"
  ON "CreatorAttributionLink"("serialNumber");
CREATE INDEX "CreatorAttributionLink_stationCode_active_createdAt_idx"
  ON "CreatorAttributionLink"("stationCode", "active", "createdAt");
CREATE INDEX "CreatorAttributionLink_stationHostVenueId_active_idx"
  ON "CreatorAttributionLink"("stationHostVenueId", "active");
CREATE INDEX "AttributionTouch_stationCode_occurredAt_idx"
  ON "AttributionTouch"("stationCode", "occurredAt");
CREATE INDEX "ActionIntent_stationTouchId_idx"
  ON "ActionIntent"("stationTouchId");
CREATE INDEX "ActionIntent_destinationVenueId_state_idx"
  ON "ActionIntent"("destinationVenueId", "state");
CREATE INDEX "AttributionEvent_stationCode_occurredAt_idx"
  ON "AttributionEvent"("stationCode", "occurredAt");
CREATE INDEX "AttributionEvent_stationHostVenueId_occurredAt_idx"
  ON "AttributionEvent"("stationHostVenueId", "occurredAt");
CREATE INDEX "AttributionEvent_destinationVenueId_occurredAt_idx"
  ON "AttributionEvent"("destinationVenueId", "occurredAt");

ALTER TABLE "CreatorAttributionLink"
  ADD CONSTRAINT "CreatorAttributionLink_stationHostVenueId_fkey"
  FOREIGN KEY ("stationHostVenueId") REFERENCES "Venue"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActionIntent"
  ADD CONSTRAINT "ActionIntent_stationTouchId_fkey"
  FOREIGN KEY ("stationTouchId") REFERENCES "AttributionTouch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
