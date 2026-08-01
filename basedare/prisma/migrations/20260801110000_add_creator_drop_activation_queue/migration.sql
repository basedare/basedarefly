-- Creator Drop Activation Queue.
-- Internal/manual ops layer only: assignments track outreach and repeat decisions.
-- They do not send messages, authorize proof, approve payouts, or create creator bonuses.

CREATE TABLE "CreatorDropAssignment" (
  "id" TEXT NOT NULL,
  "linkId" TEXT,
  "creatorCode" TEXT NOT NULL,
  "creatorName" TEXT,
  "contactChannel" TEXT,
  "contactHandle" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFTED',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "askText" TEXT,
  "followupText" TEXT,
  "lastTouchAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "postedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CreatorDropAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreatorDropAssignment_status_updatedAt_idx"
  ON "CreatorDropAssignment"("status", "updatedAt");
CREATE INDEX "CreatorDropAssignment_creatorCode_createdAt_idx"
  ON "CreatorDropAssignment"("creatorCode", "createdAt");
CREATE INDEX "CreatorDropAssignment_linkId_idx"
  ON "CreatorDropAssignment"("linkId");

ALTER TABLE "CreatorDropAssignment"
  ADD CONSTRAINT "CreatorDropAssignment_linkId_fkey"
  FOREIGN KEY ("linkId") REFERENCES "CreatorAttributionLink"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CreatorDropAssignment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_CreatorDropAssignment"
  ON "CreatorDropAssignment"
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
