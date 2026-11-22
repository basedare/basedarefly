-- AlterTable
ALTER TABLE "AdventureSubmission" ADD COLUMN     "sessionId" TEXT;

-- CreateTable
CREATE TABLE "LocalNode" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "about" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "ownerWallet" TEXT NOT NULL,
    "ownerTagId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publicConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeMembership" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "publicConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalOpportunity" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "nodeId" TEXT,
    "targetNodeId" TEXT,
    "authorWallet" TEXT NOT NULL,
    "authorTagId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "compensation" TEXT NOT NULL,
    "amountMinor" INTEGER,
    "currency" TEXT,
    "exchangeTerms" TEXT NOT NULL,
    "termsHash" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityRequest" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "termsHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "hostCompletedAt" TIMESTAMP(3),
    "participantCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaseDareSession" (
    "id" TEXT NOT NULL,
    "meetupId" TEXT NOT NULL,
    "nodeId" TEXT,
    "hostWallet" TEXT NOT NULL,
    "hostTagId" TEXT NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "guestCapacity" INTEGER NOT NULL,
    "recordingPolicy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaseDareSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionGuest" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "application" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "hostAttestedAt" TIMESTAMP(3),
    "participantAttestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionRecordingGrant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "sourceSha256" TEXT NOT NULL,
    "processing" BOOLEAN NOT NULL,
    "publication" BOOLEAN NOT NULL DEFAULT false,
    "destinations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredCredit" TEXT NOT NULL,
    "rightsVersion" TEXT NOT NULL,
    "rightsConfirmed" BOOLEAN NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "withdrawnAt" TIMESTAMP(3),
    "hostApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionRecordingGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocalNode_slug_key" ON "LocalNode"("slug");

-- CreateIndex
CREATE INDEX "LocalNode_status_city_category_idx" ON "LocalNode"("status", "city", "category");

-- CreateIndex
CREATE INDEX "NodeMembership_wallet_status_idx" ON "NodeMembership"("wallet", "status");

-- CreateIndex
CREATE UNIQUE INDEX "NodeMembership_nodeId_wallet_key" ON "NodeMembership"("nodeId", "wallet");

-- CreateIndex
CREATE INDEX "LocalOpportunity_status_expiresAt_venueId_idx" ON "LocalOpportunity"("status", "expiresAt", "venueId");

-- CreateIndex
CREATE INDEX "LocalOpportunity_authorWallet_idx" ON "LocalOpportunity"("authorWallet");

-- CreateIndex
CREATE INDEX "LocalOpportunity_targetNodeId_status_idx" ON "LocalOpportunity"("targetNodeId", "status");

-- CreateIndex
CREATE INDEX "OpportunityRequest_wallet_status_idx" ON "OpportunityRequest"("wallet", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityRequest_opportunityId_wallet_key" ON "OpportunityRequest"("opportunityId", "wallet");

-- CreateIndex
CREATE UNIQUE INDEX "BaseDareSession_meetupId_key" ON "BaseDareSession"("meetupId");

-- CreateIndex
CREATE INDEX "BaseDareSession_hostWallet_idx" ON "BaseDareSession"("hostWallet");

-- CreateIndex
CREATE INDEX "SessionGuest_wallet_status_idx" ON "SessionGuest"("wallet", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SessionGuest_sessionId_wallet_key" ON "SessionGuest"("sessionId", "wallet");

-- CreateIndex
CREATE INDEX "SessionRecordingGrant_wallet_idx" ON "SessionRecordingGrant"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "SessionRecordingGrant_sessionId_submissionId_key" ON "SessionRecordingGrant"("sessionId", "submissionId");

-- AddForeignKey
ALTER TABLE "AdventureSubmission" ADD CONSTRAINT "AdventureSubmission_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BaseDareSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeMembership" ADD CONSTRAINT "NodeMembership_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "LocalNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalOpportunity" ADD CONSTRAINT "LocalOpportunity_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalOpportunity" ADD CONSTRAINT "LocalOpportunity_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "LocalNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalOpportunity" ADD CONSTRAINT "LocalOpportunity_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "LocalNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityRequest" ADD CONSTRAINT "OpportunityRequest_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "LocalOpportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaseDareSession" ADD CONSTRAINT "BaseDareSession_meetupId_fkey" FOREIGN KEY ("meetupId") REFERENCES "Meetup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaseDareSession" ADD CONSTRAINT "BaseDareSession_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "LocalNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionGuest" ADD CONSTRAINT "SessionGuest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BaseDareSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRecordingGrant" ADD CONSTRAINT "SessionRecordingGrant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BaseDareSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRecordingGrant" ADD CONSTRAINT "SessionRecordingGrant_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AdventureSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Server-only product records; no direct browser/database grants. Role checks allow
-- the same migration to run on disposable PostgreSQL and the Supabase target.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['LocalNode','NodeMembership','LocalOpportunity','OpportunityRequest','BaseDareSession','SessionGuest','SessionRecordingGrant'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', 'service_role_all_' || t, t);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE format('REVOKE ALL ON %I FROM anon', t); END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE format('REVOKE ALL ON %I FROM authenticated', t); END IF;
  END LOOP;
END $$;

-- Extend canonical social references while retaining wallet and person-transfer guards.
ALTER TABLE "SocialFollow" DROP CONSTRAINT "SocialFollow_kind";
ALTER TABLE "SocialFollow" ADD CONSTRAINT "SocialFollow_kind" CHECK ("targetKind" IN ('PERSON','VENUE','NODE'));
ALTER TABLE "SocialFollow" DROP CONSTRAINT "SocialFollow_person";
ALTER TABLE "SocialFollow" ADD CONSTRAINT "SocialFollow_person" CHECK (("targetKind"='PERSON' AND "targetWallet" IS NOT NULL AND "targetWallet" ~ '^0x[0-9a-f]{40}$' AND "wallet"<>"targetWallet") OR ("targetKind" IN ('VENUE','NODE') AND "targetWallet" IS NULL));
ALTER TABLE "SavedItem" DROP CONSTRAINT "SavedItem_kind";
ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_kind" CHECK ("targetKind" IN ('VENUE','NODE','STORY','MOMENT','ACTIVITY','OPPORTUNITY'));
ALTER TABLE "LocalOpportunity" ADD CONSTRAINT "LocalOpportunity_terms" CHECK ("endsAt">"startsAt" AND "expiresAt"<="startsAt" AND "capacity" BETWEEN 1 AND 30 AND (("compensation"='PAID' AND "amountMinor">0 AND "currency" IN ('PHP','USD')) OR ("compensation" IN ('FREE','BARTER') AND "amountMinor" IS NULL AND "currency" IS NULL)));
ALTER TABLE "SessionRecordingGrant" ADD CONSTRAINT "SessionRecordingGrant_scope" CHECK ("sourceSha256" ~ '^[a-f0-9]{64}$' AND "id" ~ '^[a-f0-9]{32}$' AND ("publication" OR cardinality("destinations")=0));
