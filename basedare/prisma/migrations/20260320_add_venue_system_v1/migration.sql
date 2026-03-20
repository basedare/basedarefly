ALTER TABLE "Dare"
ADD COLUMN "venueId" TEXT;

CREATE TABLE "Venue" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "address" TEXT,
  "city" TEXT,
  "country" TEXT,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "geohash" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "isPartner" BOOLEAN NOT NULL DEFAULT false,
  "partnerTier" TEXT,
  "placeSource" TEXT,
  "externalPlaceId" TEXT,
  "qrMode" TEXT NOT NULL DEFAULT 'ROTATING',
  "qrRotationSeconds" INTEGER NOT NULL DEFAULT 45,
  "checkInRadiusMeters" INTEGER NOT NULL DEFAULT 120,
  "hoursJson" JSONB,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueQrSession" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'VENUE_CHECKIN',
  "sessionKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'LIVE',
  "label" TEXT,
  "campaignLabel" TEXT,
  "rotationSeconds" INTEGER NOT NULL DEFAULT 45,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "lastRotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pausedAt" TIMESTAMP(3),
  "lastCheckInAt" TIMESTAMP(3),
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VenueQrSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueCheckIn" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "tag" TEXT,
  "dareId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
  "proofLevel" TEXT NOT NULL DEFAULT 'QR_AND_GPS',
  "source" TEXT NOT NULL DEFAULT 'VENUE_QR',
  "venueSessionId" TEXT,
  "qrTokenHash" TEXT,
  "geoDistanceMeters" INTEGER,
  "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "windowStartAt" TIMESTAMP(3),
  "windowEndAt" TIMESTAMP(3),
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VenueCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueMemory" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "bucketType" TEXT NOT NULL DEFAULT 'DAY',
  "bucketStartAt" TIMESTAMP(3) NOT NULL,
  "bucketEndAt" TIMESTAMP(3) NOT NULL,
  "checkInCount" INTEGER NOT NULL DEFAULT 0,
  "uniqueVisitorCount" INTEGER NOT NULL DEFAULT 0,
  "dareCount" INTEGER NOT NULL DEFAULT 0,
  "completedDareCount" INTEGER NOT NULL DEFAULT 0,
  "proofCount" INTEGER NOT NULL DEFAULT 0,
  "perkRedemptionCount" INTEGER NOT NULL DEFAULT 0,
  "topCreatorTag" TEXT,
  "topMomentDareId" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VenueMemory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");
CREATE UNIQUE INDEX "Venue_placeSource_externalPlaceId_key" ON "Venue"("placeSource", "externalPlaceId");
CREATE INDEX "Venue_status_idx" ON "Venue"("status");
CREATE INDEX "Venue_geohash_idx" ON "Venue"("geohash");
CREATE INDEX "Venue_city_status_idx" ON "Venue"("city", "status");

CREATE UNIQUE INDEX "VenueQrSession_sessionKey_key" ON "VenueQrSession"("sessionKey");
CREATE INDEX "VenueQrSession_venueId_status_idx" ON "VenueQrSession"("venueId", "status");
CREATE INDEX "VenueQrSession_startedAt_idx" ON "VenueQrSession"("startedAt");

CREATE INDEX "VenueCheckIn_venueId_scannedAt_idx" ON "VenueCheckIn"("venueId", "scannedAt");
CREATE INDEX "VenueCheckIn_venueSessionId_idx" ON "VenueCheckIn"("venueSessionId");
CREATE INDEX "VenueCheckIn_walletAddress_scannedAt_idx" ON "VenueCheckIn"("walletAddress", "scannedAt");
CREATE INDEX "VenueCheckIn_tag_idx" ON "VenueCheckIn"("tag");
CREATE INDEX "VenueCheckIn_dareId_idx" ON "VenueCheckIn"("dareId");
CREATE INDEX "VenueCheckIn_status_idx" ON "VenueCheckIn"("status");

CREATE UNIQUE INDEX "VenueMemory_venueId_bucketType_bucketStartAt_key" ON "VenueMemory"("venueId", "bucketType", "bucketStartAt");
CREATE INDEX "VenueMemory_venueId_bucketStartAt_idx" ON "VenueMemory"("venueId", "bucketStartAt");

CREATE INDEX "Dare_venueId_status_idx" ON "Dare"("venueId", "status");

ALTER TABLE "VenueQrSession"
ADD CONSTRAINT "VenueQrSession_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VenueCheckIn"
ADD CONSTRAINT "VenueCheckIn_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VenueCheckIn"
ADD CONSTRAINT "VenueCheckIn_venueSessionId_fkey" FOREIGN KEY ("venueSessionId") REFERENCES "VenueQrSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VenueMemory"
ADD CONSTRAINT "VenueMemory_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Dare"
ADD CONSTRAINT "Dare_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
