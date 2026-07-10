-- CreateTable
CREATE TABLE "public"."DareProofAttempt" (
    "id" TEXT NOT NULL,
    "dareId" TEXT NOT NULL,
    "submitterWallet" TEXT,
    "beneficiaryWallet" TEXT,
    "source" TEXT NOT NULL DEFAULT 'web',
    "systemActor" TEXT,
    "targetLatitude" DOUBLE PRECISION,
    "targetLongitude" DOUBLE PRECISION,
    "allowedRadiusKm" DOUBLE PRECISION,
    "submittedLatitude" DOUBLE PRECISION,
    "submittedLongitude" DOUBLE PRECISION,
    "accuracyM" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "distanceKm" DOUBLE PRECISION,
    "proximityDecision" TEXT,
    "proximityCode" TEXT,
    "mediaCid" TEXT,
    "mediaHash" TEXT,
    "verificationConfidence" DOUBLE PRECISION,
    "verificationReason" TEXT,
    "proximityReason" TEXT,
    "decision" TEXT,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "submissionKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DareProofAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Idempotency / anti-replay: one settlement attempt per (dare, media). NULL
-- submissionKey (no media) is distinct in Postgres, so no-media rows never collide.
CREATE UNIQUE INDEX "DareProofAttempt_dareId_submissionKey_key" ON "public"."DareProofAttempt"("dareId", "submissionKey");

-- CreateIndex
CREATE INDEX "DareProofAttempt_dareId_createdAt_idx" ON "public"."DareProofAttempt"("dareId", "createdAt");

-- CreateIndex
CREATE INDEX "DareProofAttempt_submitterWallet_idx" ON "public"."DareProofAttempt"("submitterWallet");

-- AddForeignKey
ALTER TABLE "public"."DareProofAttempt"
ADD CONSTRAINT "DareProofAttempt_dareId_fkey"
FOREIGN KEY ("dareId") REFERENCES "public"."Dare"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS (Supabase posture for tables added after lock-down) + service_role access.
ALTER TABLE "public"."DareProofAttempt" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_DareProofAttempt" ON "public"."DareProofAttempt";
CREATE POLICY "service_role_all_DareProofAttempt" ON "public"."DareProofAttempt"
  FOR ALL TO service_role USING (true) WITH CHECK (true);
