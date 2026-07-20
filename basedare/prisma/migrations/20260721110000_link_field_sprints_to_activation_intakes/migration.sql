-- A buyer-approved activation intake may produce at most one managed Field Sprint.
-- The intake remains a FounderEvent ledger record; this stable identifier closes
-- the approval -> funding -> real escrow -> receipt chain without coupling the
-- generic event table to one product workflow.
ALTER TABLE "VerifiedFieldSprint"
ADD COLUMN "activationIntakeId" TEXT;

CREATE UNIQUE INDEX "VerifiedFieldSprint_activationIntakeId_key"
ON "VerifiedFieldSprint"("activationIntakeId");
