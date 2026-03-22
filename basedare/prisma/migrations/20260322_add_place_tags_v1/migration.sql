CREATE TABLE "PlaceTag" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "creatorTag" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "caption" TEXT,
  "vibeTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "proofMediaUrl" TEXT NOT NULL,
  "proofCid" TEXT,
  "proofHash" TEXT,
  "proofType" TEXT NOT NULL DEFAULT 'IMAGE',
  "source" TEXT NOT NULL DEFAULT 'DIRECT_TAG',
  "linkedDareId" TEXT,
  "hiddenPromptId" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "geoDistanceMeters" INTEGER,
  "heatContribution" INTEGER NOT NULL DEFAULT 10,
  "firstMark" BOOLEAN NOT NULL DEFAULT false,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewerWallet" TEXT,
  "reviewReason" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlaceTag_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlaceTag_venueId_submittedAt_idx" ON "PlaceTag"("venueId", "submittedAt");
CREATE INDEX "PlaceTag_venueId_status_submittedAt_idx" ON "PlaceTag"("venueId", "status", "submittedAt");
CREATE INDEX "PlaceTag_walletAddress_submittedAt_idx" ON "PlaceTag"("walletAddress", "submittedAt");
CREATE INDEX "PlaceTag_creatorTag_submittedAt_idx" ON "PlaceTag"("creatorTag", "submittedAt");
CREATE INDEX "PlaceTag_linkedDareId_idx" ON "PlaceTag"("linkedDareId");

ALTER TABLE "PlaceTag"
ADD CONSTRAINT "PlaceTag_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
