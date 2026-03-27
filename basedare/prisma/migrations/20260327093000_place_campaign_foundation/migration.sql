-- Phase 1 PLACE campaign foundation
-- Add minimal linkage from Campaign -> Venue and Campaign -> Dare

ALTER TABLE "Campaign"
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'CREATOR',
  ADD COLUMN IF NOT EXISTS "venueId" TEXT,
  ADD COLUMN IF NOT EXISTS "linkedDareId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Campaign_linkedDareId_key" ON "Campaign"("linkedDareId");
CREATE INDEX IF NOT EXISTS "Campaign_type_status_idx" ON "Campaign"("type", "status");
CREATE INDEX IF NOT EXISTS "Campaign_venueId_status_idx" ON "Campaign"("venueId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Campaign_venueId_fkey'
      AND table_name = 'Campaign'
  ) THEN
    ALTER TABLE "Campaign"
      ADD CONSTRAINT "Campaign_venueId_fkey"
      FOREIGN KEY ("venueId") REFERENCES "Venue"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Campaign_linkedDareId_fkey'
      AND table_name = 'Campaign'
  ) THEN
    ALTER TABLE "Campaign"
      ADD CONSTRAINT "Campaign_linkedDareId_fkey"
      FOREIGN KEY ("linkedDareId") REFERENCES "Dare"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
