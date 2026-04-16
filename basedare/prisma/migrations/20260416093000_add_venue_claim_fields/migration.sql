ALTER TABLE "Venue"
ADD COLUMN "claimedBy" TEXT,
ADD COLUMN "claimedAt" TIMESTAMP(3),
ADD COLUMN "claimRequestWallet" TEXT,
ADD COLUMN "claimRequestTag" TEXT,
ADD COLUMN "claimRequestedAt" TIMESTAMP(3),
ADD COLUMN "claimRequestStatus" TEXT,
ADD COLUMN "moderatorAddress" TEXT,
ADD COLUMN "moderatedAt" TIMESTAMP(3),
ADD COLUMN "moderatorNote" TEXT;

CREATE INDEX "Venue_claimRequestStatus_idx" ON "Venue"("claimRequestStatus");
CREATE INDEX "Venue_claimedBy_idx" ON "Venue"("claimedBy");
