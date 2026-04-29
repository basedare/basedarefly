-- Persistent founder operating ledger for money, proof, and venue utility events.
CREATE TABLE "FounderEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'server',
    "subjectType" TEXT,
    "subjectId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "title" TEXT,
    "amount" DOUBLE PRECISION,
    "status" TEXT,
    "actor" TEXT,
    "href" TEXT,
    "venueId" TEXT,
    "venueSlug" TEXT,
    "metadataJson" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FounderEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FounderEvent_dedupeKey_key" ON "FounderEvent"("dedupeKey");
CREATE INDEX "FounderEvent_eventType_occurredAt_idx" ON "FounderEvent"("eventType", "occurredAt");
CREATE INDEX "FounderEvent_subjectType_subjectId_idx" ON "FounderEvent"("subjectType", "subjectId");
CREATE INDEX "FounderEvent_venueId_occurredAt_idx" ON "FounderEvent"("venueId", "occurredAt");
CREATE INDEX "FounderEvent_occurredAt_idx" ON "FounderEvent"("occurredAt");

ALTER TABLE "FounderEvent"
  ADD CONSTRAINT "FounderEvent_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FounderEvent" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_FounderEvent" ON "FounderEvent";
CREATE POLICY "service_role_all_FounderEvent" ON "FounderEvent"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE "FounderEvent" FROM anon;
REVOKE ALL ON TABLE "FounderEvent" FROM authenticated;
