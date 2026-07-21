CREATE TABLE "VerifiedFieldSprintMissionLink" (
  "id" TEXT NOT NULL,
  "sprintMissionId" TEXT NOT NULL,
  "dareId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "linkKind" TEXT NOT NULL DEFAULT 'INITIAL',
  "replacementKind" TEXT,
  "replacementReason" TEXT,
  "fundingTreatment" TEXT,
  "fundingReference" TEXT,
  "linkedBy" TEXT NOT NULL,
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerifiedFieldSprintMissionLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VerifiedFieldSprintMissionLink_sequence_check" CHECK ("sequence" BETWEEN 1 AND 2),
  CONSTRAINT "VerifiedFieldSprintMissionLink_shape_check" CHECK (
    ("sequence" = 1 AND "linkKind" = 'INITIAL' AND "replacementKind" IS NULL AND "fundingTreatment" IS NULL)
    OR
    ("sequence" = 2 AND "linkKind" = 'REPLACEMENT'
      AND "replacementKind" IN ('REJECTED','ABANDONED')
      AND length(trim("replacementReason")) >= 8
      AND "fundingTreatment" IN ('RECOVERED_ESCROW','SUPPLEMENTAL_125')
      AND length(trim("fundingReference")) >= 3)
  )
);

CREATE TABLE "VerifiedFieldSprintBuyerDecision" (
  "id" TEXT NOT NULL,
  "sprintId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "contactName" TEXT,
  "email" TEXT,
  "nextQuestion" TEXT,
  "note" TEXT,
  "termsVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerifiedFieldSprintBuyerDecision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VerifiedFieldSprintBuyerDecision_decision_check" CHECK ("decision" IN ('REPEAT','ADJUST','ASK','STOP'))
);

CREATE UNIQUE INDEX "VerifiedFieldSprintMissionLink_dareId_key" ON "VerifiedFieldSprintMissionLink"("dareId");
CREATE UNIQUE INDEX "VerifiedFieldSprintMissionLink_sprintMissionId_sequence_key" ON "VerifiedFieldSprintMissionLink"("sprintMissionId", "sequence");
CREATE INDEX "VerifiedFieldSprintMissionLink_sprintMissionId_linkedAt_idx" ON "VerifiedFieldSprintMissionLink"("sprintMissionId", "linkedAt");
CREATE UNIQUE INDEX "VerifiedFieldSprintBuyerDecision_requestId_key" ON "VerifiedFieldSprintBuyerDecision"("requestId");
CREATE INDEX "VerifiedFieldSprintBuyerDecision_sprintId_createdAt_idx" ON "VerifiedFieldSprintBuyerDecision"("sprintId", "createdAt");
CREATE INDEX "VerifiedFieldSprintBuyerDecision_decision_createdAt_idx" ON "VerifiedFieldSprintBuyerDecision"("decision", "createdAt");

ALTER TABLE "VerifiedFieldSprintMissionLink" ADD CONSTRAINT "VerifiedFieldSprintMissionLink_sprintMissionId_fkey" FOREIGN KEY ("sprintMissionId") REFERENCES "VerifiedFieldSprintMission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VerifiedFieldSprintMissionLink" ADD CONSTRAINT "VerifiedFieldSprintMissionLink_dareId_fkey" FOREIGN KEY ("dareId") REFERENCES "Dare"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VerifiedFieldSprintBuyerDecision" ADD CONSTRAINT "VerifiedFieldSprintBuyerDecision_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "VerifiedFieldSprint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve the currently linked escrow as sequence one for Sprints created
-- before this closure-hardening migration.
INSERT INTO "VerifiedFieldSprintMissionLink" (
  "id", "sprintMissionId", "dareId", "sequence", "linkKind", "linkedBy", "linkedAt"
)
SELECT
  'vfsl_' || md5(m."id" || ':' || m."dareId"),
  m."id",
  m."dareId",
  1,
  'INITIAL',
  'migration-backfill',
  m."updatedAt"
FROM "VerifiedFieldSprintMission" m
WHERE m."dareId" IS NOT NULL;

CREATE OR REPLACE FUNCTION prevent_verified_field_sprint_closure_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Verified Field Sprint closure ledgers are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "VerifiedFieldSprintMissionLink_append_only_update"
BEFORE UPDATE ON "VerifiedFieldSprintMissionLink"
FOR EACH ROW EXECUTE FUNCTION prevent_verified_field_sprint_closure_ledger_mutation();
CREATE TRIGGER "VerifiedFieldSprintMissionLink_append_only_delete"
BEFORE DELETE ON "VerifiedFieldSprintMissionLink"
FOR EACH ROW EXECUTE FUNCTION prevent_verified_field_sprint_closure_ledger_mutation();
CREATE TRIGGER "VerifiedFieldSprintBuyerDecision_append_only_update"
BEFORE UPDATE ON "VerifiedFieldSprintBuyerDecision"
FOR EACH ROW EXECUTE FUNCTION prevent_verified_field_sprint_closure_ledger_mutation();
CREATE TRIGGER "VerifiedFieldSprintBuyerDecision_append_only_delete"
BEFORE DELETE ON "VerifiedFieldSprintBuyerDecision"
FOR EACH ROW EXECUTE FUNCTION prevent_verified_field_sprint_closure_ledger_mutation();

ALTER TABLE "VerifiedFieldSprintMissionLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerifiedFieldSprintBuyerDecision" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_VerifiedFieldSprintMissionLink" ON "VerifiedFieldSprintMissionLink" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_VerifiedFieldSprintBuyerDecision" ON "VerifiedFieldSprintBuyerDecision" FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE "VerifiedFieldSprintMissionLink" FROM anon, authenticated;
REVOKE ALL ON TABLE "VerifiedFieldSprintBuyerDecision" FROM anon, authenticated;
