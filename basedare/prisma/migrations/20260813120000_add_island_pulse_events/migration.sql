-- Island Pulse keeps raw source observations separate from reviewed public events.
CREATE TABLE "VenueEventSignal" (
  "id" TEXT NOT NULL,
  "venueId" TEXT,
  "sourceKind" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "sourceAccount" TEXT,
  "sourcePublishedAt" TIMESTAMP(3),
  "rawText" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "extractionJson" JSONB,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "submittedBy" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VenueEventSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueEvent" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "signalId" TEXT,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "category" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "timezone" TEXT NOT NULL,
  "priceLabel" TEXT,
  "sourceLabel" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "trustLevel" TEXT NOT NULL DEFAULT 'SOURCE_CHECKED',
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  "publishedAt" TIMESTAMP(3),
  "lastConfirmedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VenueEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VenueEvent_time_check" CHECK ("endsAt" IS NULL OR "endsAt" > "startsAt"),
  CONSTRAINT "VenueEvent_expiry_check" CHECK ("expiresAt" >= COALESCE("endsAt", "startsAt"))
);

CREATE TABLE "VenueEventFeed" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'INSTAGRAM',
  "externalAccountId" TEXT NOT NULL,
  "accountHandle" TEXT,
  "accessTokenCiphertext" TEXT NOT NULL,
  "tokenExpiresAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastCursor" TEXT,
  "lastCheckedAt" TIMESTAMP(3),
  "lastSuccessfulAt" TIMESTAMP(3),
  "lastError" TEXT,
  "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "connectedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VenueEventFeed_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueEventRsvp" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "baretagId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'INTERESTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VenueEventRsvp_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VenueEventRsvp_status_check" CHECK ("status" IN ('INTERESTED', 'GOING'))
);

CREATE UNIQUE INDEX "VenueEventSignal_fingerprint_key" ON "VenueEventSignal"("fingerprint");
CREATE INDEX "VenueEventSignal_status_createdAt_idx" ON "VenueEventSignal"("status", "createdAt");
CREATE INDEX "VenueEventSignal_venueId_status_idx" ON "VenueEventSignal"("venueId", "status");
CREATE INDEX "VenueEventSignal_sourceKind_sourcePublishedAt_idx" ON "VenueEventSignal"("sourceKind", "sourcePublishedAt");
CREATE UNIQUE INDEX "VenueEvent_slug_key" ON "VenueEvent"("slug");
CREATE UNIQUE INDEX "VenueEventFeed_platform_externalAccountId_key" ON "VenueEventFeed"("platform", "externalAccountId");
CREATE INDEX "VenueEventFeed_status_lastCheckedAt_idx" ON "VenueEventFeed"("status", "lastCheckedAt");
CREATE INDEX "VenueEventFeed_venueId_status_idx" ON "VenueEventFeed"("venueId", "status");
CREATE UNIQUE INDEX "VenueEvent_signalId_key" ON "VenueEvent"("signalId");
CREATE INDEX "VenueEvent_status_startsAt_idx" ON "VenueEvent"("status", "startsAt");
CREATE INDEX "VenueEvent_venueId_status_startsAt_idx" ON "VenueEvent"("venueId", "status", "startsAt");
CREATE INDEX "VenueEvent_expiresAt_status_idx" ON "VenueEvent"("expiresAt", "status");
CREATE UNIQUE INDEX "VenueEventRsvp_eventId_baretagId_key" ON "VenueEventRsvp"("eventId", "baretagId");
CREATE INDEX "VenueEventRsvp_baretagId_updatedAt_idx" ON "VenueEventRsvp"("baretagId", "updatedAt");
CREATE INDEX "VenueEventRsvp_eventId_status_idx" ON "VenueEventRsvp"("eventId", "status");

ALTER TABLE "VenueEventSignal" ADD CONSTRAINT "VenueEventSignal_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VenueEvent" ADD CONSTRAINT "VenueEvent_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueEventFeed" ADD CONSTRAINT "VenueEventFeed_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueEvent" ADD CONSTRAINT "VenueEvent_signalId_fkey"
  FOREIGN KEY ("signalId") REFERENCES "VenueEventSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VenueEventRsvp" ADD CONSTRAINT "VenueEventRsvp_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "VenueEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VenueEventSignal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VenueEventFeed" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VenueEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VenueEventRsvp" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "VenueEventSignal", "VenueEventFeed", "VenueEvent", "VenueEventRsvp" FROM anon, authenticated;
CREATE POLICY "service_role_all_VenueEventSignal" ON "VenueEventSignal" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_VenueEventFeed" ON "VenueEventFeed" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_VenueEvent" ON "VenueEvent" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_VenueEventRsvp" ON "VenueEventRsvp" FOR ALL TO service_role USING (true) WITH CHECK (true);
