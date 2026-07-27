CREATE TABLE "VenueRitual" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startLocalMinutes" INTEGER NOT NULL,
    "endLocalMinutes" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Manila',
    "sourceKind" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceLastConfirmedAt" TIMESTAMP(3) NOT NULL,
    "freshnessExpiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "permissionStatus" TEXT NOT NULL DEFAULT 'PUBLICLY_REPORTED',
    "offerLabel" TEXT,
    "rewardDareId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueRitual_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VenueRitual_weekday_check" CHECK ("weekday" BETWEEN 0 AND 6),
    CONSTRAINT "VenueRitual_start_minutes_check" CHECK ("startLocalMinutes" BETWEEN 0 AND 1439),
    CONSTRAINT "VenueRitual_end_minutes_check" CHECK ("endLocalMinutes" IS NULL OR "endLocalMinutes" BETWEEN 0 AND 1439),
    CONSTRAINT "VenueRitual_freshness_check" CHECK ("freshnessExpiresAt" >= "sourceLastConfirmedAt")
);

CREATE UNIQUE INDEX "VenueRitual_slug_key" ON "VenueRitual"("slug");
CREATE INDEX "VenueRitual_venueId_status_freshnessExpiresAt_idx" ON "VenueRitual"("venueId", "status", "freshnessExpiresAt");
CREATE INDEX "VenueRitual_weekday_status_freshnessExpiresAt_idx" ON "VenueRitual"("weekday", "status", "freshnessExpiresAt");
CREATE INDEX "VenueRitual_rewardDareId_idx" ON "VenueRitual"("rewardDareId");

ALTER TABLE "VenueRitual"
  ADD CONSTRAINT "VenueRitual_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorAttributionLink"
  ADD COLUMN "placementPermissionConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "placementPermissionConfirmedBy" TEXT;

ALTER TABLE "VenueRitual" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_VenueRitual"
  ON "VenueRitual"
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE "VenueRitual" FROM anon, authenticated;
