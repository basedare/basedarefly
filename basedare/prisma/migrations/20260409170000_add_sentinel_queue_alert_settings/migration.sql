ALTER TABLE "AppSettings"
ADD COLUMN "sentinelPendingAlertThreshold" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "lastSentinelQueueAlertSent" TIMESTAMP(3);
