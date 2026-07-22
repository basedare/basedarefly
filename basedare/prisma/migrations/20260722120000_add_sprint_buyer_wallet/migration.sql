-- Connect a managed Sprint receipt to the buyer wallet that scoped it. This is
-- intentionally nullable so existing and manually-created Sprints remain valid.
ALTER TABLE "VerifiedFieldSprint"
ADD COLUMN "buyerWalletAddress" TEXT;

CREATE INDEX "VerifiedFieldSprint_buyerWalletAddress_status_completedAt_idx"
ON "VerifiedFieldSprint"("buyerWalletAddress", "status", "completedAt");
