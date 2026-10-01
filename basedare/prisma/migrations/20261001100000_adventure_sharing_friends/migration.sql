CREATE TABLE "AdventureSubmission" (
 "id" TEXT PRIMARY KEY, "wallet" TEXT NOT NULL, "activityId" TEXT NOT NULL, "runId" TEXT NOT NULL,
 "venueSlug" TEXT NOT NULL REFERENCES "Venue"("slug") ON UPDATE CASCADE ON DELETE RESTRICT,
 "caption" TEXT NOT NULL, "hashtag" TEXT NOT NULL, "mediaUrl" TEXT NOT NULL, "mediaType" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING', "publicConsentVersion" TEXT NOT NULL,
 "promotionContact" BOOLEAN NOT NULL DEFAULT false, "reviewReason" TEXT, "reviewedBy" TEXT,
 "reviewedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AdventureSubmission_status_check" CHECK ("status" IN ('PENDING','APPROVED','REJECTED','WITHDRAWN'))
);
CREATE UNIQUE INDEX "AdventureSubmission_wallet_runId_key" ON "AdventureSubmission"("wallet","runId");
CREATE INDEX "AdventureSubmission_status_createdAt_idx" ON "AdventureSubmission"("status","createdAt");
CREATE INDEX "AdventureSubmission_venueSlug_status_idx" ON "AdventureSubmission"("venueSlug","status");
CREATE INDEX "AdventureSubmission_hashtag_status_idx" ON "AdventureSubmission"("hashtag","status");
CREATE TABLE "FriendConnection" (
 "id" TEXT PRIMARY KEY, "pairKey" TEXT NOT NULL UNIQUE, "requester" TEXT NOT NULL, "recipient" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "FriendConnection_status_check" CHECK ("status" IN ('PENDING','ACCEPTED','CLOSED')),
 CONSTRAINT "FriendConnection_self_check" CHECK ("requester" <> "recipient")
);
CREATE INDEX "FriendConnection_requester_status_idx" ON "FriendConnection"("requester","status");
CREATE INDEX "FriendConnection_recipient_status_idx" ON "FriendConnection"("recipient","status");
ALTER TABLE "AdventureSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FriendConnection" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AdventureSubmission", "FriendConnection" FROM anon, authenticated;
GRANT ALL ON "AdventureSubmission", "FriendConnection" TO service_role;
CREATE POLICY "service_role_adventure" ON "AdventureSubmission" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_friends" ON "FriendConnection" FOR ALL TO service_role USING (true) WITH CHECK (true);
