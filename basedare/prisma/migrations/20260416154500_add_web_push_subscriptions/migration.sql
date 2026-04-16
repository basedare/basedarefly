-- CreateTable
CREATE TABLE "public"."WebPushSubscription" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebPushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebPushSubscription_endpoint_key" ON "public"."WebPushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "WebPushSubscription_wallet_isActive_idx" ON "public"."WebPushSubscription"("wallet", "isActive");

-- CreateIndex
CREATE INDEX "WebPushSubscription_lastSeenAt_idx" ON "public"."WebPushSubscription"("lastSeenAt");
