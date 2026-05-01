-- CreateTable
CREATE TABLE "public"."InboxThread" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DIRECT',
    "subject" TEXT,
    "participantWallets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdByWallet" TEXT NOT NULL,
    "venueId" TEXT,
    "dareId" TEXT,
    "campaignId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadataJson" JSONB,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InboxMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderWallet" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "redacted" BOOLEAN NOT NULL DEFAULT false,
    "readByWallets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."InboxThread"
ADD CONSTRAINT "InboxThread_venueId_fkey"
FOREIGN KEY ("venueId") REFERENCES "public"."Venue"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboxThread"
ADD CONSTRAINT "InboxThread_dareId_fkey"
FOREIGN KEY ("dareId") REFERENCES "public"."Dare"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboxThread"
ADD CONSTRAINT "InboxThread_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboxMessage"
ADD CONSTRAINT "InboxMessage_threadId_fkey"
FOREIGN KEY ("threadId") REFERENCES "public"."InboxThread"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "InboxThread_status_idx" ON "public"."InboxThread"("status");

-- CreateIndex
CREATE INDEX "InboxThread_venueId_idx" ON "public"."InboxThread"("venueId");

-- CreateIndex
CREATE INDEX "InboxThread_dareId_idx" ON "public"."InboxThread"("dareId");

-- CreateIndex
CREATE INDEX "InboxThread_campaignId_idx" ON "public"."InboxThread"("campaignId");

-- CreateIndex
CREATE INDEX "InboxThread_lastMessageAt_idx" ON "public"."InboxThread"("lastMessageAt");

-- CreateIndex
CREATE INDEX "InboxThread_updatedAt_idx" ON "public"."InboxThread"("updatedAt");

-- CreateIndex
CREATE INDEX "InboxThread_participantWallets_gin_idx" ON "public"."InboxThread" USING GIN ("participantWallets");

-- CreateIndex
CREATE INDEX "InboxMessage_threadId_createdAt_idx" ON "public"."InboxMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "InboxMessage_senderWallet_createdAt_idx" ON "public"."InboxMessage"("senderWallet", "createdAt");

-- Lock direct Supabase client access down; the app server enforces wallet-scoped auth.
ALTER TABLE "public"."InboxThread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."InboxMessage" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_InboxThread" ON "public"."InboxThread";
CREATE POLICY "service_role_all_InboxThread" ON "public"."InboxThread"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_InboxMessage" ON "public"."InboxMessage";
CREATE POLICY "service_role_all_InboxMessage" ON "public"."InboxMessage"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE "public"."InboxThread" FROM anon;
REVOKE ALL ON TABLE "public"."InboxThread" FROM authenticated;
REVOKE ALL ON TABLE "public"."InboxMessage" FROM anon;
REVOKE ALL ON TABLE "public"."InboxMessage" FROM authenticated;
