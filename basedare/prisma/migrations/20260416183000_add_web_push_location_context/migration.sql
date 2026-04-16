-- AlterTable
ALTER TABLE "public"."WebPushSubscription"
ADD COLUMN "lastLatitude" DOUBLE PRECISION,
ADD COLUMN "lastLongitude" DOUBLE PRECISION,
ADD COLUMN "nearbyRadiusKm" DOUBLE PRECISION DEFAULT 5,
ADD COLUMN "lastLocationAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "WebPushSubscription_lastLocationAt_idx" ON "public"."WebPushSubscription"("lastLocationAt");
