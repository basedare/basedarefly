-- CreateTable
CREATE TABLE "public"."VenueRoomMessage" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT 'Anonymous',
    "avatarUrl" TEXT,
    "body" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueRoomMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VenueRoomPresence" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT 'Anonymous',
    "avatarUrl" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "source" TEXT NOT NULL DEFAULT 'ROOM',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueRoomPresence_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."VenueRoomMessage"
ADD CONSTRAINT "VenueRoomMessage_venueId_fkey"
FOREIGN KEY ("venueId") REFERENCES "public"."Venue"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VenueRoomPresence"
ADD CONSTRAINT "VenueRoomPresence_venueId_fkey"
FOREIGN KEY ("venueId") REFERENCES "public"."Venue"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "VenueRoomMessage_venueId_expiresAt_createdAt_idx" ON "public"."VenueRoomMessage"("venueId", "expiresAt", "createdAt");

-- CreateIndex
CREATE INDEX "VenueRoomMessage_venueId_walletAddress_createdAt_idx" ON "public"."VenueRoomMessage"("venueId", "walletAddress", "createdAt");

-- CreateIndex
CREATE INDEX "VenueRoomMessage_walletAddress_createdAt_idx" ON "public"."VenueRoomMessage"("walletAddress", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VenueRoomPresence_venueId_walletAddress_key" ON "public"."VenueRoomPresence"("venueId", "walletAddress");

-- CreateIndex
CREATE INDEX "VenueRoomPresence_venueId_visibility_expiresAt_lastSeenAt_idx" ON "public"."VenueRoomPresence"("venueId", "visibility", "expiresAt", "lastSeenAt");

-- CreateIndex
CREATE INDEX "VenueRoomPresence_walletAddress_lastSeenAt_idx" ON "public"."VenueRoomPresence"("walletAddress", "lastSeenAt");

-- Lock direct Supabase client access down; the app server enforces venue-room access.
ALTER TABLE "public"."VenueRoomMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."VenueRoomPresence" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_VenueRoomMessage" ON "public"."VenueRoomMessage";
CREATE POLICY "service_role_all_VenueRoomMessage" ON "public"."VenueRoomMessage"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_VenueRoomPresence" ON "public"."VenueRoomPresence";
CREATE POLICY "service_role_all_VenueRoomPresence" ON "public"."VenueRoomPresence"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE "public"."VenueRoomMessage" FROM anon;
REVOKE ALL ON TABLE "public"."VenueRoomMessage" FROM authenticated;
REVOKE ALL ON TABLE "public"."VenueRoomPresence" FROM anon;
REVOKE ALL ON TABLE "public"."VenueRoomPresence" FROM authenticated;
