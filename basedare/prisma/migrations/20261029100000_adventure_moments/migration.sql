-- Compatible with existing venue uploads. New anywhere/social submissions need no fabricated place or media URL.
ALTER TABLE "AdventureSubmission"
  ALTER COLUMN "venueSlug" DROP NOT NULL,
  ALTER COLUMN "mediaUrl" DROP NOT NULL,
  ADD COLUMN "socialUrl" TEXT,
  ADD COLUMN "socialPlatform" TEXT,
  ADD COLUMN "sourceKey" TEXT,
  ADD COLUMN "privateMediaCid" TEXT,
  ADD COLUMN "privateMediaMime" TEXT,
  ADD COLUMN "creatorCreditConsent" BOOLEAN,
  ADD COLUMN "spotlightConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "featuredAt" TIMESTAMP(3),
  ADD COLUMN "featuredBy" TEXT,
  ADD COLUMN "parentMomentId" TEXT;
CREATE UNIQUE INDEX "AdventureSubmission_wallet_sourceKey_key" ON "AdventureSubmission"("wallet", "sourceKey");
CREATE INDEX "AdventureSubmission_parentMomentId_status_idx" ON "AdventureSubmission"("parentMomentId", "status");
ALTER TABLE "AdventureSubmission" ADD CONSTRAINT "AdventureSubmission_parentMomentId_fkey" FOREIGN KEY ("parentMomentId") REFERENCES "AdventureSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve the original private RLS policy; never grant browser roles access.
ALTER TABLE "AdventureSubmission" DROP CONSTRAINT "AdventureSubmission_status_check";
ALTER TABLE "AdventureSubmission" ADD CONSTRAINT "AdventureSubmission_status_check" CHECK ("status" IN ('PENDING','APPROVED','REJECTED','FLAGGED','WITHDRAWN'));
-- Legacy public files remain valid. New records have exactly one reviewable source.
ALTER TABLE "AdventureSubmission" ADD CONSTRAINT "AdventureSubmission_source_check" CHECK (num_nonnulls("mediaUrl", "socialUrl", "privateMediaCid") = 1);
ALTER TABLE "AdventureSubmission" ADD CONSTRAINT "AdventureSubmission_private_mime_check" CHECK (("privateMediaCid" IS NULL) = ("privateMediaMime" IS NULL));

-- One active source cannot masquerade as independent contributions across wallets.
CREATE UNIQUE INDEX "AdventureSubmission_active_sourceKey_key" ON "AdventureSubmission"("sourceKey") WHERE "sourceKey" IS NOT NULL AND "status" IN ('PENDING','APPROVED','FLAGGED');
