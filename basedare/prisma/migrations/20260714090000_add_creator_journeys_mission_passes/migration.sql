-- Creator attribution + Mission Pass alpha.
-- This is a separate consumer-intent rail: it does not alter Dare invite,
-- referral, claim, proof, payout, User, or wallet authorization columns.

CREATE TABLE "CreatorAttributionLink" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "creatorCode" TEXT NOT NULL,
    "contentCode" TEXT NOT NULL,
    "campaignCode" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetHref" TEXT NOT NULL,
    "participationOwner" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorAttributionLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttributionJourney" (
    "id" TEXT NOT NULL,
    "cookieHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "participantKey" TEXT,
    "firstReferrer" TEXT,
    "userAgentClass" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttributionJourney_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttributionTouch" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "linkId" TEXT,
    "creatorCode" TEXT,
    "contentCode" TEXT,
    "campaignCode" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetHref" TEXT NOT NULL,
    "referrer" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttributionTouch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActionIntent" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "primaryTouchId" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetHref" TEXT NOT NULL,
    "titleSnapshot" TEXT,
    "state" TEXT NOT NULL DEFAULT 'LOCKED',
    "participantKey" TEXT,
    "walletAddress" TEXT,
    "canonicalIntentId" TEXT,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "boundAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionIntent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MissionPass" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "actionIntentId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "emailHmac" TEXT,
    "purpose" TEXT NOT NULL DEFAULT 'ACTION',
    "deliveryMethod" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'ISSUED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionPass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttributionEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "journeyId" TEXT,
    "touchId" TEXT,
    "actionIntentId" TEXT,
    "missionPassId" TEXT,
    "creatorCode" TEXT,
    "contentCode" TEXT,
    "campaignCode" TEXT,
    "participantKey" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadataJson" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttributionEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorAttributionLink_slug_key" ON "CreatorAttributionLink"("slug");
CREATE INDEX "CreatorAttributionLink_creatorCode_createdAt_idx" ON "CreatorAttributionLink"("creatorCode", "createdAt");
CREATE INDEX "CreatorAttributionLink_targetType_targetId_active_idx" ON "CreatorAttributionLink"("targetType", "targetId", "active");
CREATE UNIQUE INDEX "CreatorAttributionLink_one_active_owner_per_target_key"
ON "CreatorAttributionLink"("targetType", "targetId")
WHERE "participationOwner" = true AND "active" = true;

CREATE UNIQUE INDEX "AttributionJourney_cookieHash_key" ON "AttributionJourney"("cookieHash");
CREATE INDEX "AttributionJourney_participantKey_lastSeenAt_idx" ON "AttributionJourney"("participantKey", "lastSeenAt");
CREATE INDEX "AttributionJourney_status_expiresAt_idx" ON "AttributionJourney"("status", "expiresAt");

CREATE INDEX "AttributionTouch_journeyId_occurredAt_idx" ON "AttributionTouch"("journeyId", "occurredAt");
CREATE INDEX "AttributionTouch_linkId_occurredAt_idx" ON "AttributionTouch"("linkId", "occurredAt");
CREATE INDEX "AttributionTouch_creatorCode_occurredAt_idx" ON "AttributionTouch"("creatorCode", "occurredAt");
CREATE INDEX "AttributionTouch_targetType_targetId_occurredAt_idx" ON "AttributionTouch"("targetType", "targetId", "occurredAt");

CREATE UNIQUE INDEX "ActionIntent_journeyId_targetType_targetId_key" ON "ActionIntent"("journeyId", "targetType", "targetId");
CREATE INDEX "ActionIntent_participantKey_state_updatedAt_idx" ON "ActionIntent"("participantKey", "state", "updatedAt");
CREATE INDEX "ActionIntent_walletAddress_targetType_targetId_idx" ON "ActionIntent"("walletAddress", "targetType", "targetId");
CREATE INDEX "ActionIntent_targetType_targetId_state_idx" ON "ActionIntent"("targetType", "targetId", "state");
CREATE INDEX "ActionIntent_canonicalIntentId_idx" ON "ActionIntent"("canonicalIntentId");

CREATE UNIQUE INDEX "MissionPass_tokenHash_key" ON "MissionPass"("tokenHash");
CREATE INDEX "MissionPass_emailHmac_state_issuedAt_idx" ON "MissionPass"("emailHmac", "state", "issuedAt");
CREATE INDEX "MissionPass_actionIntentId_issuedAt_idx" ON "MissionPass"("actionIntentId", "issuedAt");
CREATE INDEX "MissionPass_journeyId_issuedAt_idx" ON "MissionPass"("journeyId", "issuedAt");
CREATE INDEX "MissionPass_state_expiresAt_idx" ON "MissionPass"("state", "expiresAt");

CREATE UNIQUE INDEX "AttributionEvent_dedupeKey_key" ON "AttributionEvent"("dedupeKey");
CREATE INDEX "AttributionEvent_eventType_occurredAt_idx" ON "AttributionEvent"("eventType", "occurredAt");
CREATE INDEX "AttributionEvent_creatorCode_occurredAt_idx" ON "AttributionEvent"("creatorCode", "occurredAt");
CREATE INDEX "AttributionEvent_targetType_targetId_occurredAt_idx" ON "AttributionEvent"("targetType", "targetId", "occurredAt");
CREATE INDEX "AttributionEvent_participantKey_occurredAt_idx" ON "AttributionEvent"("participantKey", "occurredAt");

ALTER TABLE "AttributionTouch" ADD CONSTRAINT "AttributionTouch_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "AttributionJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttributionTouch" ADD CONSTRAINT "AttributionTouch_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "CreatorAttributionLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActionIntent" ADD CONSTRAINT "ActionIntent_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "AttributionJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionIntent" ADD CONSTRAINT "ActionIntent_primaryTouchId_fkey" FOREIGN KEY ("primaryTouchId") REFERENCES "AttributionTouch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionIntent" ADD CONSTRAINT "ActionIntent_canonicalIntentId_fkey" FOREIGN KEY ("canonicalIntentId") REFERENCES "ActionIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MissionPass" ADD CONSTRAINT "MissionPass_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "AttributionJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionPass" ADD CONSTRAINT "MissionPass_actionIntentId_fkey" FOREIGN KEY ("actionIntentId") REFERENCES "ActionIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttributionEvent" ADD CONSTRAINT "AttributionEvent_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "AttributionJourney"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AttributionEvent" ADD CONSTRAINT "AttributionEvent_touchId_fkey" FOREIGN KEY ("touchId") REFERENCES "AttributionTouch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AttributionEvent" ADD CONSTRAINT "AttributionEvent_actionIntentId_fkey" FOREIGN KEY ("actionIntentId") REFERENCES "ActionIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AttributionEvent" ADD CONSTRAINT "AttributionEvent_missionPassId_fkey" FOREIGN KEY ("missionPassId") REFERENCES "MissionPass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Supabase posture: these records are server-only. The browser never reads
-- token hashes, keyed email digests, participant keys, or attribution history
-- through a direct anon/authenticated database client.
ALTER TABLE "public"."CreatorAttributionLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AttributionJourney" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AttributionTouch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ActionIntent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."MissionPass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AttributionEvent" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_CreatorAttributionLink" ON "public"."CreatorAttributionLink";
CREATE POLICY "service_role_all_CreatorAttributionLink" ON "public"."CreatorAttributionLink" FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_all_AttributionJourney" ON "public"."AttributionJourney";
CREATE POLICY "service_role_all_AttributionJourney" ON "public"."AttributionJourney" FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_all_AttributionTouch" ON "public"."AttributionTouch";
CREATE POLICY "service_role_all_AttributionTouch" ON "public"."AttributionTouch" FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_all_ActionIntent" ON "public"."ActionIntent";
CREATE POLICY "service_role_all_ActionIntent" ON "public"."ActionIntent" FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_all_MissionPass" ON "public"."MissionPass";
CREATE POLICY "service_role_all_MissionPass" ON "public"."MissionPass" FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_all_AttributionEvent" ON "public"."AttributionEvent";
CREATE POLICY "service_role_all_AttributionEvent" ON "public"."AttributionEvent" FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE "public"."CreatorAttributionLink" FROM anon;
REVOKE ALL ON TABLE "public"."CreatorAttributionLink" FROM authenticated;
REVOKE ALL ON TABLE "public"."AttributionJourney" FROM anon;
REVOKE ALL ON TABLE "public"."AttributionJourney" FROM authenticated;
REVOKE ALL ON TABLE "public"."AttributionTouch" FROM anon;
REVOKE ALL ON TABLE "public"."AttributionTouch" FROM authenticated;
REVOKE ALL ON TABLE "public"."ActionIntent" FROM anon;
REVOKE ALL ON TABLE "public"."ActionIntent" FROM authenticated;
REVOKE ALL ON TABLE "public"."MissionPass" FROM anon;
REVOKE ALL ON TABLE "public"."MissionPass" FROM authenticated;
REVOKE ALL ON TABLE "public"."AttributionEvent" FROM anon;
REVOKE ALL ON TABLE "public"."AttributionEvent" FROM authenticated;
