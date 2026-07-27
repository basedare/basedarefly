-- Reconcile the June scout-engine schema change that was historically applied
-- with `prisma db push` but never recorded as a migration. Every statement is
-- idempotent so databases that already received the push remain safe.

ALTER TABLE "Venue"
  ADD COLUMN IF NOT EXISTS "discoveryScoutId" TEXT,
  ADD COLUMN IF NOT EXISTS "activeScoutId" TEXT,
  ADD COLUMN IF NOT EXISTS "activeRakeReviewedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Venue_discoveryScoutId_idx"
  ON "Venue"("discoveryScoutId");

CREATE INDEX IF NOT EXISTS "Venue_activeScoutId_idx"
  ON "Venue"("activeScoutId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Venue_discoveryScoutId_fkey'
  ) THEN
    ALTER TABLE "Venue"
      ADD CONSTRAINT "Venue_discoveryScoutId_fkey"
      FOREIGN KEY ("discoveryScoutId") REFERENCES "Scout"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Venue_activeScoutId_fkey'
  ) THEN
    ALTER TABLE "Venue"
      ADD CONSTRAINT "Venue_activeScoutId_fkey"
      FOREIGN KEY ("activeScoutId") REFERENCES "Scout"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "ScoutRakeEvent" (
  "id" TEXT NOT NULL,
  "scoutId" TEXT NOT NULL,
  "venueId" TEXT,
  "kind" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL DEFAULT 'B2B_PAYMENT',
  "sourceId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "vestsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScoutRakeEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScoutRakeEvent_scoutId_sourceId_kind_key"
  ON "ScoutRakeEvent"("scoutId", "sourceId", "kind");

CREATE INDEX IF NOT EXISTS "ScoutRakeEvent_scoutId_idx"
  ON "ScoutRakeEvent"("scoutId");

CREATE INDEX IF NOT EXISTS "ScoutRakeEvent_venueId_idx"
  ON "ScoutRakeEvent"("venueId");

CREATE INDEX IF NOT EXISTS "ScoutRakeEvent_status_idx"
  ON "ScoutRakeEvent"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ScoutRakeEvent_scoutId_fkey'
  ) THEN
    ALTER TABLE "ScoutRakeEvent"
      ADD CONSTRAINT "ScoutRakeEvent_scoutId_fkey"
      FOREIGN KEY ("scoutId") REFERENCES "Scout"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

ALTER TABLE "ScoutRakeEvent" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_scout_rake_events" ON "ScoutRakeEvent";
CREATE POLICY "service_role_all_scout_rake_events"
  ON "ScoutRakeEvent"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE "ScoutRakeEvent" FROM anon, authenticated;
