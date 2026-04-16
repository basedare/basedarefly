-- AlterTable
ALTER TABLE "public"."WebPushSubscription"
ADD COLUMN "lastNearbyPushAt" TIMESTAMP(3),
ADD COLUMN "lastNearbyPushKey" TEXT;

-- CreateIndex
CREATE INDEX "WebPushSubscription_lastNearbyPushAt_idx" ON "public"."WebPushSubscription"("lastNearbyPushAt");
