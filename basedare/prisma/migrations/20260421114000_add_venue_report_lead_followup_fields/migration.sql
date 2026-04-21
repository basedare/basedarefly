-- AlterTable
ALTER TABLE "public"."VenueReportLead"
ADD COLUMN "followUpStatus" TEXT NOT NULL DEFAULT 'NEW',
ADD COLUMN "ownerWallet" TEXT,
ADD COLUMN "nextActionAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "VenueReportLead_followUpStatus_contactedAt_idx"
ON "public"."VenueReportLead"("followUpStatus", "contactedAt");

-- CreateIndex
CREATE INDEX "VenueReportLead_ownerWallet_contactedAt_idx"
ON "public"."VenueReportLead"("ownerWallet", "contactedAt");
