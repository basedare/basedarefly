-- CreateTable
CREATE TABLE "public"."WebPushDelivery" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "wallet" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebPushDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebPushDelivery_wallet_createdAt_idx" ON "public"."WebPushDelivery"("wallet", "createdAt");

-- CreateIndex
CREATE INDEX "WebPushDelivery_topic_createdAt_idx" ON "public"."WebPushDelivery"("topic", "createdAt");

-- CreateIndex
CREATE INDEX "WebPushDelivery_status_createdAt_idx" ON "public"."WebPushDelivery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WebPushDelivery_subscriptionId_createdAt_idx" ON "public"."WebPushDelivery"("subscriptionId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."WebPushDelivery" ADD CONSTRAINT "WebPushDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."WebPushSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
