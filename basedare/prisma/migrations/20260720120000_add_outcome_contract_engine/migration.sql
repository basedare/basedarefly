ALTER TABLE "Dare"
  ADD COLUMN "outcomeContractFamily" TEXT,
  ADD COLUMN "outcomeContractVersion" INTEGER,
  ADD COLUMN "outcomeContractSnapshot" JSONB,
  ADD COLUMN "reportedOutcome" JSONB,
  ADD COLUMN "evidenceDecision" TEXT,
  ADD COLUMN "orchestrationDecision" JSONB;

ALTER TABLE "DareProofAttempt"
  ADD COLUMN "reportedOutcome" JSONB,
  ADD COLUMN "evidenceDecision" TEXT;

ALTER TABLE "Dare"
  ADD CONSTRAINT "Dare_outcome_contract_all_or_none" CHECK (
    ("outcomeContractFamily" IS NULL AND "outcomeContractVersion" IS NULL AND "outcomeContractSnapshot" IS NULL)
    OR
    ("outcomeContractFamily" IS NOT NULL AND "outcomeContractVersion" IS NOT NULL AND "outcomeContractSnapshot" IS NOT NULL)
  );

ALTER TABLE "Dare"
  ADD CONSTRAINT "Dare_outcome_contract_family_check" CHECK (
    "outcomeContractFamily" IS NULL OR "outcomeContractFamily" IN (
      'FIELD_TRUTH',
      'EXPERIENCE_EXECUTION',
      'PUBLICATION',
      'ATTENTION',
      'ARRIVAL_REDEMPTION',
      'QUALIFIED_ACTION'
    )
  );

ALTER TABLE "Dare"
  ADD CONSTRAINT "Dare_evidence_decision_check" CHECK (
    "evidenceDecision" IS NULL OR "evidenceDecision" IN ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED')
  );

ALTER TABLE "DareProofAttempt"
  ADD CONSTRAINT "DareProofAttempt_evidence_decision_check" CHECK (
    "evidenceDecision" IS NULL OR "evidenceDecision" IN ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED')
  );

CREATE OR REPLACE FUNCTION prevent_outcome_contract_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."outcomeContractSnapshot" IS NOT NULL AND (
    NEW."outcomeContractFamily" IS DISTINCT FROM OLD."outcomeContractFamily"
    OR NEW."outcomeContractVersion" IS DISTINCT FROM OLD."outcomeContractVersion"
    OR NEW."outcomeContractSnapshot" IS DISTINCT FROM OLD."outcomeContractSnapshot"
  ) THEN
    RAISE EXCEPTION 'Outcome contract snapshots are immutable after creation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Dare_outcome_contract_immutable"
BEFORE UPDATE ON "Dare"
FOR EACH ROW
EXECUTE FUNCTION prevent_outcome_contract_mutation();

COMMENT ON COLUMN "Dare"."reportedOutcome" IS
  'Contributor-reported real-world result. A truthful negative can be accepted and paid.';
COMMENT ON COLUMN "Dare"."evidenceDecision" IS
  'Current decision about evidence sufficiency, separate from the reported result.';
COMMENT ON COLUMN "Dare"."orchestrationDecision" IS
  'Current next-action decision, kept separate from both the reported result and the evidence decision.';
