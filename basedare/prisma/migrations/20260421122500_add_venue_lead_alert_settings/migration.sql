-- AlterTable
ALTER TABLE "public"."AppSettings"
ADD COLUMN "venueLeadAlertThreshold" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN "lastVenueLeadAlertSent" TIMESTAMP(3);
