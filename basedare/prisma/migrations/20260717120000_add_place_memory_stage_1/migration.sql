-- BaseDare Place Memory Stage 1.
-- Additive only. Deploy this migration before code that finalizes structured
-- Dares: their durable Place Memory and receipt writes intentionally fail
-- closed when storage is unavailable.

CREATE TYPE "PlaceAssertionKind" AS ENUM (
  'OPENING_WINDOW',
  'ITEM_PRICE',
  'PAYMENT_METHOD'
);

CREATE TYPE "PlaceAssertionState" AS ENUM (
  'UNKNOWN',
  'CURRENT',
  'STALE',
  'CONFLICTED'
);

CREATE TYPE "AssertionValidTimeBasis" AS ENUM (
  'OBSERVED',
  'REPORTED',
  'INFERRED'
);

CREATE TYPE "AssertionConflictStatus" AS ENUM (
  'OPEN',
  'NEEDS_CORROBORATION',
  'RESOLVED',
  'DISMISSED'
);

CREATE TYPE "RefreshScheduleStatus" AS ENUM (
  'SCHEDULED',
  'NEEDS_REVIEW',
  'LEASED',
  'MISSION_CREATED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "FieldStationStatus" AS ENUM (
  'LATENT',
  'ANCHORED',
  'TRUSTED'
);

CREATE TYPE "PlacePulseState" AS ENUM (
  'COLD',
  'SIMMERING',
  'IGNITING',
  'BLAZING'
);

CREATE TYPE "PlaceReceiptOutcome" AS ENUM (
  'MEMORY_CONFIRMED',
  'MEMORY_UPDATED',
  'CONFLICT_OPENED'
);

ALTER TABLE "Dare"
  ADD COLUMN "approvedProofAttemptId" TEXT;

ALTER TABLE "DareProofAttempt"
  ADD COLUMN "structuredAnswersJson" JSONB,
  ADD COLUMN "structuredAnswersHash" TEXT,
  ADD COLUMN "proofPolicySnapshotJson" JSONB,
  ADD COLUMN "proofPolicySnapshotHash" TEXT;

ALTER TABLE "PlaceTag"
  ADD COLUMN "placeReceiptId" TEXT;

CREATE TABLE "ProofPolicyVersion" (
  "id" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "canonicalPolicyJson" JSONB NOT NULL,
  "policyHash" TEXT NOT NULL,
  "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProofPolicyVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DareAssertionTarget" (
  "id" TEXT NOT NULL,
  "dareId" TEXT NOT NULL,
  "kind" "PlaceAssertionKind" NOT NULL,
  "subjectKey" TEXT NOT NULL,
  "valueSchemaVersion" INTEGER NOT NULL DEFAULT 1,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "proofPolicyVersionId" TEXT NOT NULL,
  "displayConfigJson" JSONB,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DareAssertionTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FieldStationProfile" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "status" "FieldStationStatus" NOT NULL DEFAULT 'LATENT',
  "pulseState" "PlacePulseState" NOT NULL DEFAULT 'COLD',
  "pulseScore" INTEGER NOT NULL DEFAULT 0,
  "pulseComputedAt" TIMESTAMP(3),
  "pulseModelVersion" INTEGER NOT NULL DEFAULT 1,
  "pulseComponentsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FieldStationProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FieldStationProfile_pulseScore_check" CHECK ("pulseScore" BETWEEN 0 AND 100)
);

-- The current-version foreign keys are added after AssertionVersion exists.
CREATE TABLE "PlaceAssertion" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "kind" "PlaceAssertionKind" NOT NULL,
  "subjectKey" TEXT NOT NULL,
  "state" "PlaceAssertionState" NOT NULL DEFAULT 'UNKNOWN',
  "currentVersionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlaceAssertion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssertionObservation" (
  "id" TEXT NOT NULL,
  "assertionId" TEXT NOT NULL,
  "proofAttemptId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "valueJson" JSONB NOT NULL,
  "valueSchemaVersion" INTEGER NOT NULL,
  "valueHash" TEXT NOT NULL,
  "observationHash" TEXT NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssertionObservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssertionVersion" (
  "id" TEXT NOT NULL,
  "assertionId" TEXT NOT NULL,
  "valueJson" JSONB NOT NULL,
  "valueSchemaVersion" INTEGER NOT NULL,
  "valueHash" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "observedAt" TIMESTAMP(3) NOT NULL,
  "validTimeBasis" "AssertionValidTimeBasis" NOT NULL DEFAULT 'OBSERVED',
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "supersededAt" TIMESTAMP(3),
  CONSTRAINT "AssertionVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssertionVersionObservation" (
  "versionId" TEXT NOT NULL,
  "observationId" TEXT NOT NULL,
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssertionVersionObservation_pkey" PRIMARY KEY ("versionId", "observationId")
);

CREATE TABLE "AssertionConflict" (
  "id" TEXT NOT NULL,
  "assertionId" TEXT NOT NULL,
  "previousVersionId" TEXT NOT NULL,
  "resolvedVersionId" TEXT,
  "status" "AssertionConflictStatus" NOT NULL DEFAULT 'OPEN',
  "severity" INTEGER NOT NULL DEFAULT 1,
  "reason" TEXT NOT NULL,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "reviewerIdentity" TEXT,
  "resolution" TEXT,
  "missionDraftJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssertionConflict_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssertionConflict_severity_check" CHECK ("severity" BETWEEN 1 AND 5)
);

CREATE TABLE "AssertionConflictObservation" (
  "conflictId" TEXT NOT NULL,
  "observationId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssertionConflictObservation_pkey" PRIMARY KEY ("conflictId", "observationId")
);

CREATE TABLE "RefreshSchedule" (
  "id" TEXT NOT NULL,
  "assertionId" TEXT NOT NULL,
  "status" "RefreshScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
  "dueAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "missionDraftJson" JSONB,
  "futureDareId" TEXT,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RefreshSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlaceReceipt" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "dareId" TEXT NOT NULL,
  "proofAttemptId" TEXT NOT NULL,
  "serialNumber" INTEGER NOT NULL,
  "outcome" "PlaceReceiptOutcome" NOT NULL,
  "contentHash" TEXT NOT NULL,
  "settlementTxHash" TEXT,
  "publicPayloadVersion" INTEGER NOT NULL DEFAULT 1,
  "publicPayloadJson" JSONB NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlaceReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlaceReceiptObservation" (
  "receiptId" TEXT NOT NULL,
  "observationId" TEXT NOT NULL,
  CONSTRAINT "PlaceReceiptObservation_pkey" PRIMARY KEY ("receiptId", "observationId")
);

CREATE TABLE "PlaceReceiptAssertionVersion" (
  "receiptId" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'CURRENT',
  CONSTRAINT "PlaceReceiptAssertionVersion_pkey" PRIMARY KEY ("receiptId", "versionId")
);

CREATE UNIQUE INDEX "ProofPolicyVersion_policyHash_key" ON "ProofPolicyVersion"("policyHash");
CREATE UNIQUE INDEX "ProofPolicyVersion_identifier_version_key" ON "ProofPolicyVersion"("identifier", "version");
CREATE INDEX "ProofPolicyVersion_identifier_activatedAt_idx" ON "ProofPolicyVersion"("identifier", "activatedAt");

CREATE UNIQUE INDEX "DareAssertionTarget_dareId_kind_subjectKey_key" ON "DareAssertionTarget"("dareId", "kind", "subjectKey");
CREATE UNIQUE INDEX "DareAssertionTarget_dareId_position_key" ON "DareAssertionTarget"("dareId", "position");
CREATE INDEX "DareAssertionTarget_proofPolicyVersionId_idx" ON "DareAssertionTarget"("proofPolicyVersionId");
CREATE INDEX "DareAssertionTarget_dareId_position_idx" ON "DareAssertionTarget"("dareId", "position");

CREATE UNIQUE INDEX "FieldStationProfile_venueId_key" ON "FieldStationProfile"("venueId");
CREATE INDEX "FieldStationProfile_pulseState_pulseScore_idx" ON "FieldStationProfile"("pulseState", "pulseScore");

CREATE UNIQUE INDEX "PlaceAssertion_venueId_kind_subjectKey_key" ON "PlaceAssertion"("venueId", "kind", "subjectKey");
CREATE UNIQUE INDEX "PlaceAssertion_currentVersionId_key" ON "PlaceAssertion"("currentVersionId");
CREATE UNIQUE INDEX "PlaceAssertion_id_currentVersionId_key" ON "PlaceAssertion"("id", "currentVersionId");
CREATE INDEX "PlaceAssertion_venueId_state_idx" ON "PlaceAssertion"("venueId", "state");
CREATE INDEX "PlaceAssertion_kind_state_idx" ON "PlaceAssertion"("kind", "state");

CREATE UNIQUE INDEX "AssertionObservation_observationHash_key" ON "AssertionObservation"("observationHash");
CREATE UNIQUE INDEX "AssertionObservation_proofAttemptId_assertionId_key" ON "AssertionObservation"("proofAttemptId", "assertionId");
CREATE UNIQUE INDEX "AssertionObservation_proofAttemptId_targetId_key" ON "AssertionObservation"("proofAttemptId", "targetId");
CREATE INDEX "AssertionObservation_assertionId_observedAt_idx" ON "AssertionObservation"("assertionId", "observedAt");
CREATE INDEX "AssertionObservation_proofAttemptId_idx" ON "AssertionObservation"("proofAttemptId");
CREATE INDEX "AssertionObservation_targetId_idx" ON "AssertionObservation"("targetId");
CREATE INDEX "AssertionObservation_valueHash_idx" ON "AssertionObservation"("valueHash");

CREATE UNIQUE INDEX "AssertionVersion_assertionId_id_key" ON "AssertionVersion"("assertionId", "id");
CREATE INDEX "AssertionVersion_assertionId_observedAt_idx" ON "AssertionVersion"("assertionId", "observedAt");
CREATE INDEX "AssertionVersion_assertionId_supersededAt_idx" ON "AssertionVersion"("assertionId", "supersededAt");
CREATE INDEX "AssertionVersion_assertionId_valueHash_idx" ON "AssertionVersion"("assertionId", "valueHash");
CREATE INDEX "AssertionVersionObservation_observationId_idx" ON "AssertionVersionObservation"("observationId");

CREATE INDEX "AssertionConflict_assertionId_status_openedAt_idx" ON "AssertionConflict"("assertionId", "status", "openedAt");
CREATE INDEX "AssertionConflict_previousVersionId_idx" ON "AssertionConflict"("previousVersionId");
CREATE INDEX "AssertionConflict_resolvedVersionId_idx" ON "AssertionConflict"("resolvedVersionId");
CREATE UNIQUE INDEX "AssertionConflict_one_active_per_assertion_key"
  ON "AssertionConflict"("assertionId")
  WHERE "status" IN ('OPEN', 'NEEDS_CORROBORATION');
CREATE INDEX "AssertionConflictObservation_observationId_idx" ON "AssertionConflictObservation"("observationId");

CREATE UNIQUE INDEX "RefreshSchedule_assertionId_key" ON "RefreshSchedule"("assertionId");
CREATE INDEX "RefreshSchedule_status_dueAt_priority_idx" ON "RefreshSchedule"("status", "dueAt", "priority");
CREATE INDEX "RefreshSchedule_futureDareId_idx" ON "RefreshSchedule"("futureDareId");

CREATE UNIQUE INDEX "PlaceReceipt_dareId_key" ON "PlaceReceipt"("dareId");
CREATE UNIQUE INDEX "PlaceReceipt_proofAttemptId_key" ON "PlaceReceipt"("proofAttemptId");
CREATE UNIQUE INDEX "PlaceReceipt_serialNumber_key" ON "PlaceReceipt"("serialNumber");
CREATE UNIQUE INDEX "PlaceReceipt_contentHash_key" ON "PlaceReceipt"("contentHash");
CREATE INDEX "PlaceReceipt_venueId_issuedAt_idx" ON "PlaceReceipt"("venueId", "issuedAt");
CREATE INDEX "PlaceReceipt_outcome_issuedAt_idx" ON "PlaceReceipt"("outcome", "issuedAt");
CREATE INDEX "PlaceReceiptObservation_observationId_idx" ON "PlaceReceiptObservation"("observationId");
CREATE INDEX "PlaceReceiptAssertionVersion_versionId_idx" ON "PlaceReceiptAssertionVersion"("versionId");

CREATE UNIQUE INDEX "Dare_approvedProofAttemptId_key" ON "Dare"("approvedProofAttemptId");
CREATE UNIQUE INDEX "DareProofAttempt_dareId_id_key" ON "DareProofAttempt"("dareId", "id");
CREATE UNIQUE INDEX "PlaceTag_placeReceiptId_key" ON "PlaceTag"("placeReceiptId");

ALTER TABLE "DareAssertionTarget"
  ADD CONSTRAINT "DareAssertionTarget_dareId_fkey"
  FOREIGN KEY ("dareId") REFERENCES "Dare"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DareAssertionTarget_proofPolicyVersionId_fkey"
  FOREIGN KEY ("proofPolicyVersionId") REFERENCES "ProofPolicyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FieldStationProfile"
  ADD CONSTRAINT "FieldStationProfile_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlaceAssertion"
  ADD CONSTRAINT "PlaceAssertion_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssertionObservation"
  ADD CONSTRAINT "AssertionObservation_assertionId_fkey"
  FOREIGN KEY ("assertionId") REFERENCES "PlaceAssertion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AssertionObservation_proofAttemptId_fkey"
  FOREIGN KEY ("proofAttemptId") REFERENCES "DareProofAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AssertionObservation_targetId_fkey"
  FOREIGN KEY ("targetId") REFERENCES "DareAssertionTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssertionVersion"
  ADD CONSTRAINT "AssertionVersion_assertionId_fkey"
  FOREIGN KEY ("assertionId") REFERENCES "PlaceAssertion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlaceAssertion"
  ADD CONSTRAINT "PlaceAssertion_currentVersionId_fkey"
  FOREIGN KEY ("currentVersionId") REFERENCES "AssertionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PlaceAssertion_currentVersion_identity_fkey"
  FOREIGN KEY ("id", "currentVersionId") REFERENCES "AssertionVersion"("assertionId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssertionVersionObservation"
  ADD CONSTRAINT "AssertionVersionObservation_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "AssertionVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AssertionVersionObservation_observationId_fkey"
  FOREIGN KEY ("observationId") REFERENCES "AssertionObservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssertionConflict"
  ADD CONSTRAINT "AssertionConflict_assertionId_fkey"
  FOREIGN KEY ("assertionId") REFERENCES "PlaceAssertion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AssertionConflict_previousVersionId_fkey"
  FOREIGN KEY ("previousVersionId") REFERENCES "AssertionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AssertionConflict_previousVersion_identity_fkey"
  FOREIGN KEY ("assertionId", "previousVersionId") REFERENCES "AssertionVersion"("assertionId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AssertionConflict_resolvedVersionId_fkey"
  FOREIGN KEY ("resolvedVersionId") REFERENCES "AssertionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AssertionConflict_resolvedVersion_identity_fkey"
  FOREIGN KEY ("assertionId", "resolvedVersionId") REFERENCES "AssertionVersion"("assertionId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssertionConflictObservation"
  ADD CONSTRAINT "AssertionConflictObservation_conflictId_fkey"
  FOREIGN KEY ("conflictId") REFERENCES "AssertionConflict"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AssertionConflictObservation_observationId_fkey"
  FOREIGN KEY ("observationId") REFERENCES "AssertionObservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RefreshSchedule"
  ADD CONSTRAINT "RefreshSchedule_assertionId_fkey"
  FOREIGN KEY ("assertionId") REFERENCES "PlaceAssertion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RefreshSchedule_futureDareId_fkey"
  FOREIGN KEY ("futureDareId") REFERENCES "Dare"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlaceReceipt"
  ADD CONSTRAINT "PlaceReceipt_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PlaceReceipt_dareId_fkey"
  FOREIGN KEY ("dareId") REFERENCES "Dare"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PlaceReceipt_proofAttemptId_fkey"
  FOREIGN KEY ("proofAttemptId") REFERENCES "DareProofAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PlaceReceipt_proofAttempt_identity_fkey"
  FOREIGN KEY ("dareId", "proofAttemptId") REFERENCES "DareProofAttempt"("dareId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlaceReceiptObservation"
  ADD CONSTRAINT "PlaceReceiptObservation_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "PlaceReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PlaceReceiptObservation_observationId_fkey"
  FOREIGN KEY ("observationId") REFERENCES "AssertionObservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlaceReceiptAssertionVersion"
  ADD CONSTRAINT "PlaceReceiptAssertionVersion_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "PlaceReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PlaceReceiptAssertionVersion_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "AssertionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Dare"
  ADD CONSTRAINT "Dare_approvedProofAttemptId_fkey"
  FOREIGN KEY ("approvedProofAttemptId") REFERENCES "DareProofAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Dare_approvedProofAttempt_identity_fkey"
  FOREIGN KEY ("id", "approvedProofAttemptId") REFERENCES "DareProofAttempt"("dareId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlaceTag"
  ADD CONSTRAINT "PlaceTag_placeReceiptId_fkey"
  FOREIGN KEY ("placeReceiptId") REFERENCES "PlaceReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One allocator for every future Spark and Place Receipt. The first nextval()
-- is strictly above every historical PlaceTag serial; historical rows remain
-- untouched.
CREATE SEQUENCE "PlaceReceipt_global_serial_seq" AS INTEGER;
SELECT setval(
  '"PlaceReceipt_global_serial_seq"',
  GREATEST(COALESCE((SELECT MAX("serialNumber") FROM "PlaceTag"), 0) + 1, 1),
  false
);

-- Immutable server-owned policy templates. Hashes are SHA-256 over the
-- domain `basedare:proof-policy:v1\0` plus canonical JSON.
INSERT INTO "ProofPolicyVersion" (
  "id", "identifier", "version", "canonicalPolicyJson", "policyHash", "activatedAt", "createdAt"
) VALUES
  (
    'policy-opening-window-v1',
    'place.opening_window',
    1,
    '{"assertionKind":"OPENING_WINDOW","mediaRequired":true,"proximity":{"mode":"REUSE_DARE_POLICY"},"structuredAnswer":{"schemaVersion":1},"trustedObservationTime":"PROOF_CAPTURE_OR_RECEIVE"}'::jsonb,
    'efc50773d1e0cae75d7659c22cdf6f68fdad2d7b6198761e2b943a3ce3039fdd',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'policy-item-price-v1',
    'place.item_price',
    1,
    '{"assertionKind":"ITEM_PRICE","mediaRequired":true,"proximity":{"mode":"REUSE_DARE_POLICY"},"structuredAnswer":{"schemaVersion":1},"trustedObservationTime":"PROOF_CAPTURE_OR_RECEIVE"}'::jsonb,
    '675b79910d2079b1e1b8a3011e5c867687c0d884d4aa1bc06fb099384a3099cb',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'policy-payment-method-v1',
    'place.payment_method',
    1,
    '{"assertionKind":"PAYMENT_METHOD","mediaRequired":true,"proximity":{"mode":"REUSE_DARE_POLICY"},"structuredAnswer":{"schemaVersion":1},"trustedObservationTime":"PROOF_CAPTURE_OR_RECEIVE"}'::jsonb,
    'f649ffc88e9095e09e755984c95516adf2541cf0e3cf681f643a170c780e0c31',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- Guard immutable facts at the database boundary. Policy retirement and
-- assertion system-interval closure remain the only sanctioned body updates.
CREATE FUNCTION "guard_proof_policy_immutable"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ProofPolicyVersion rows are immutable';
  END IF;
  IF OLD."identifier" IS DISTINCT FROM NEW."identifier"
     OR OLD."version" IS DISTINCT FROM NEW."version"
     OR OLD."canonicalPolicyJson" IS DISTINCT FROM NEW."canonicalPolicyJson"
     OR OLD."policyHash" IS DISTINCT FROM NEW."policyHash"
     OR OLD."activatedAt" IS DISTINCT FROM NEW."activatedAt"
     OR OLD."createdAt" IS DISTINCT FROM NEW."createdAt" THEN
    RAISE EXCEPTION 'ProofPolicyVersion bodies are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ProofPolicyVersion_immutable_body"
BEFORE UPDATE OR DELETE ON "ProofPolicyVersion"
FOR EACH ROW EXECUTE FUNCTION "guard_proof_policy_immutable"();

CREATE FUNCTION "guard_proof_attempt_place_snapshot_immutable"() RETURNS trigger AS $$
BEGIN
  IF OLD."structuredAnswersJson" IS DISTINCT FROM NEW."structuredAnswersJson"
     OR OLD."structuredAnswersHash" IS DISTINCT FROM NEW."structuredAnswersHash"
     OR OLD."proofPolicySnapshotJson" IS DISTINCT FROM NEW."proofPolicySnapshotJson"
     OR OLD."proofPolicySnapshotHash" IS DISTINCT FROM NEW."proofPolicySnapshotHash" THEN
    RAISE EXCEPTION 'DareProofAttempt structured snapshots are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DareProofAttempt_place_snapshot_immutable"
BEFORE UPDATE ON "DareProofAttempt"
FOR EACH ROW EXECUTE FUNCTION "guard_proof_attempt_place_snapshot_immutable"();

-- Question configuration is server-owned and may change only while the Dare is
-- still PENDING and no evidence attempt exists. Locking the parent Dare row
-- serializes this trigger with the proof-intake transaction's identical lock.
CREATE FUNCTION "guard_assertion_target_configuration"() RETURNS trigger AS $$
DECLARE
  target_dare_id TEXT;
  target_dare_status TEXT;
  target_venue_id TEXT;
BEGIN
  target_dare_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."dareId" ELSE NEW."dareId" END;

  IF TG_OP = 'UPDATE' AND OLD."dareId" IS DISTINCT FROM NEW."dareId" THEN
    RAISE EXCEPTION 'DareAssertionTarget cannot move between Dares';
  END IF;

  SELECT "status", "venueId"
    INTO target_dare_status, target_venue_id
    FROM "Dare"
    WHERE "id" = target_dare_id
    FOR UPDATE;

  IF target_dare_status IS NULL THEN
    RAISE EXCEPTION 'DareAssertionTarget requires an existing Dare';
  END IF;
  IF target_venue_id IS NULL THEN
    RAISE EXCEPTION 'Structured Place Memory requires a canonical Venue';
  END IF;
  IF target_dare_status <> 'PENDING' THEN
    RAISE EXCEPTION 'DareAssertionTarget is locked after proof processing starts';
  END IF;
  IF EXISTS (SELECT 1 FROM "DareProofAttempt" WHERE "dareId" = target_dare_id LIMIT 1) THEN
    RAISE EXCEPTION 'DareAssertionTarget is locked after the first proof attempt';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DareAssertionTarget_configuration_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "DareAssertionTarget"
FOR EACH ROW EXECUTE FUNCTION "guard_assertion_target_configuration"();

CREATE FUNCTION "reject_immutable_row_change"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AssertionObservation_immutable"
BEFORE UPDATE OR DELETE ON "AssertionObservation"
FOR EACH ROW EXECUTE FUNCTION "reject_immutable_row_change"();

CREATE TRIGGER "PlaceReceipt_immutable"
BEFORE UPDATE OR DELETE ON "PlaceReceipt"
FOR EACH ROW EXECUTE FUNCTION "reject_immutable_row_change"();

CREATE TRIGGER "PlaceReceiptObservation_immutable"
BEFORE UPDATE OR DELETE ON "PlaceReceiptObservation"
FOR EACH ROW EXECUTE FUNCTION "reject_immutable_row_change"();

CREATE TRIGGER "PlaceReceiptAssertionVersion_immutable"
BEFORE UPDATE OR DELETE ON "PlaceReceiptAssertionVersion"
FOR EACH ROW EXECUTE FUNCTION "reject_immutable_row_change"();

CREATE FUNCTION "guard_assertion_version_immutable"() RETURNS trigger AS $$
BEGIN
  IF OLD."assertionId" IS DISTINCT FROM NEW."assertionId"
     OR OLD."valueJson" IS DISTINCT FROM NEW."valueJson"
     OR OLD."valueSchemaVersion" IS DISTINCT FROM NEW."valueSchemaVersion"
     OR OLD."valueHash" IS DISTINCT FROM NEW."valueHash"
     OR OLD."effectiveFrom" IS DISTINCT FROM NEW."effectiveFrom"
     OR OLD."observedAt" IS DISTINCT FROM NEW."observedAt"
     OR OLD."validTimeBasis" IS DISTINCT FROM NEW."validTimeBasis"
     OR OLD."recordedAt" IS DISTINCT FROM NEW."recordedAt" THEN
    RAISE EXCEPTION 'AssertionVersion bodies are immutable';
  END IF;
  IF OLD."supersededAt" IS NOT NULL AND OLD."supersededAt" IS DISTINCT FROM NEW."supersededAt" THEN
    RAISE EXCEPTION 'AssertionVersion supersededAt cannot be changed after closure';
  END IF;
  IF OLD."effectiveTo" IS NOT NULL AND OLD."effectiveTo" IS DISTINCT FROM NEW."effectiveTo" THEN
    RAISE EXCEPTION 'AssertionVersion effectiveTo cannot be changed after closure';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AssertionVersion_immutable_body"
BEFORE UPDATE ON "AssertionVersion"
FOR EACH ROW EXECUTE FUNCTION "guard_assertion_version_immutable"();

-- Match BaseDare's server-only Supabase posture.
ALTER TABLE "ProofPolicyVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DareAssertionTarget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FieldStationProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlaceAssertion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssertionObservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssertionVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssertionVersionObservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssertionConflict" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssertionConflictObservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlaceReceipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlaceReceiptObservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlaceReceiptAssertionVersion" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_ProofPolicyVersion" ON "ProofPolicyVersion" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_DareAssertionTarget" ON "DareAssertionTarget" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_FieldStationProfile" ON "FieldStationProfile" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_PlaceAssertion" ON "PlaceAssertion" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_AssertionObservation" ON "AssertionObservation" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_AssertionVersion" ON "AssertionVersion" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_AssertionVersionObservation" ON "AssertionVersionObservation" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_AssertionConflict" ON "AssertionConflict" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_AssertionConflictObservation" ON "AssertionConflictObservation" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_RefreshSchedule" ON "RefreshSchedule" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_PlaceReceipt" ON "PlaceReceipt" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_PlaceReceiptObservation" ON "PlaceReceiptObservation" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_PlaceReceiptAssertionVersion" ON "PlaceReceiptAssertionVersion" FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE "ProofPolicyVersion" FROM anon, authenticated;
REVOKE ALL ON TABLE "DareAssertionTarget" FROM anon, authenticated;
REVOKE ALL ON TABLE "FieldStationProfile" FROM anon, authenticated;
REVOKE ALL ON TABLE "PlaceAssertion" FROM anon, authenticated;
REVOKE ALL ON TABLE "AssertionObservation" FROM anon, authenticated;
REVOKE ALL ON TABLE "AssertionVersion" FROM anon, authenticated;
REVOKE ALL ON TABLE "AssertionVersionObservation" FROM anon, authenticated;
REVOKE ALL ON TABLE "AssertionConflict" FROM anon, authenticated;
REVOKE ALL ON TABLE "AssertionConflictObservation" FROM anon, authenticated;
REVOKE ALL ON TABLE "RefreshSchedule" FROM anon, authenticated;
REVOKE ALL ON TABLE "PlaceReceipt" FROM anon, authenticated;
REVOKE ALL ON TABLE "PlaceReceiptObservation" FROM anon, authenticated;
REVOKE ALL ON TABLE "PlaceReceiptAssertionVersion" FROM anon, authenticated;
