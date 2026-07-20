CREATE TABLE "VerifiedFieldSprint" (
  "id" TEXT NOT NULL,
  "receiptCode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "buyerName" TEXT NOT NULL,
  "buyerOrganization" TEXT,
  "buyerEmail" TEXT,
  "buyerQuestion" TEXT NOT NULL,
  "areaLabel" TEXT NOT NULL,
  "freshnessWindowHours" INTEGER NOT NULL,
  "campaignCode" TEXT NOT NULL,
  "serviceFeeUsd" DOUBLE PRECISION NOT NULL DEFAULT 2000,
  "rewardPoolUsd" DOUBLE PRECISION NOT NULL DEFAULT 500,
  "missionCount" INTEGER NOT NULL DEFAULT 4,
  "rewardPerMissionUsd" DOUBLE PRECISION NOT NULL DEFAULT 125,
  "serviceFeeConfirmedUsd" DOUBLE PRECISION,
  "rewardPoolConfirmedUsd" DOUBLE PRECISION,
  "designPartnerException" BOOLEAN NOT NULL DEFAULT false,
  "fundingReference" TEXT,
  "fundingConfirmedBy" TEXT,
  "fundedAt" TIMESTAMP(3),
  "routingAt" TIMESTAMP(3),
  "collectingAt" TIMESTAMP(3),
  "reviewAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VerifiedFieldSprint_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VerifiedFieldSprint_status_check" CHECK ("status" IN ('DRAFT','FUNDED','ROUTING','COLLECTING','REVIEW','COMPLETE')),
  CONSTRAINT "VerifiedFieldSprint_economics_check" CHECK (
    "serviceFeeUsd" = 2000 AND "rewardPoolUsd" = 500 AND "missionCount" = 4 AND "rewardPerMissionUsd" = 125
  ),
  CONSTRAINT "VerifiedFieldSprint_freshness_check" CHECK ("freshnessWindowHours" BETWEEN 1 AND 168)
);

CREATE TABLE "VerifiedFieldSprintMission" (
  "id" TEXT NOT NULL,
  "sprintId" TEXT NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "buyerQuestion" TEXT NOT NULL,
  "areaLabel" TEXT NOT NULL,
  "locationLabel" TEXT,
  "venueId" TEXT,
  "grossRewardUsd" DOUBLE PRECISION NOT NULL DEFAULT 125,
  "outcomeContractFamily" TEXT NOT NULL DEFAULT 'FIELD_TRUTH',
  "outcomeContractVersion" INTEGER NOT NULL,
  "outcomeContractSnapshot" JSONB NOT NULL,
  "dareId" TEXT,
  "reportedOutcome" JSONB,
  "evidenceDecision" TEXT,
  "evidenceQuality" TEXT,
  "evidenceFreshnessHours" DOUBLE PRECISION,
  "contributorWallet" TEXT,
  "contributorPayoutUsd" DOUBLE PRECISION,
  "platformFeeUsd" DOUBLE PRECISION,
  "verificationStartedAt" TIMESTAMP(3),
  "verificationCompletedAt" TIMESTAMP(3),
  "verificationTimeMinutes" INTEGER,
  "reviewMinutes" INTEGER NOT NULL DEFAULT 0,
  "reviewCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "observedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VerifiedFieldSprintMission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VerifiedFieldSprintMission_ordinal_check" CHECK ("ordinal" BETWEEN 1 AND 4),
  CONSTRAINT "VerifiedFieldSprintMission_status_check" CHECK ("status" IN ('DRAFT','ROUTED','COLLECTING','REVIEW','ACCEPTED','REJECTED')),
  CONSTRAINT "VerifiedFieldSprintMission_economics_check" CHECK ("grossRewardUsd" = 125),
  CONSTRAINT "VerifiedFieldSprintMission_contract_check" CHECK ("outcomeContractFamily" = 'FIELD_TRUTH'),
  CONSTRAINT "VerifiedFieldSprintMission_evidence_check" CHECK ("evidenceDecision" IS NULL OR "evidenceDecision" IN ('PENDING_REVIEW','ACCEPTED','REJECTED')),
  CONSTRAINT "VerifiedFieldSprintMission_cost_check" CHECK ("reviewMinutes" >= 0 AND "reviewCostUsd" >= 0)
);

CREATE TABLE "VerifiedFieldSprintStation" (
  "id" TEXT NOT NULL,
  "sprintId" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerifiedFieldSprintStation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlaceMemoryObservation" (
  "id" TEXT NOT NULL,
  "sprintId" TEXT NOT NULL,
  "sprintMissionId" TEXT NOT NULL,
  "dareId" TEXT NOT NULL,
  "venueId" TEXT,
  "areaLabel" TEXT NOT NULL,
  "locationLabel" TEXT,
  "buyerQuestion" TEXT NOT NULL,
  "reportedOutcome" JSONB NOT NULL,
  "evidenceQuality" TEXT NOT NULL,
  "evidenceFreshnessHours" DOUBLE PRECISION,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL,
  "refreshAt" TIMESTAMP(3) NOT NULL,
  "outcomeContractSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlaceMemoryObservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlaceMemoryObservation_dates_check" CHECK ("refreshAt" > "observedAt")
);

CREATE UNIQUE INDEX "VerifiedFieldSprint_receiptCode_key" ON "VerifiedFieldSprint"("receiptCode");
CREATE UNIQUE INDEX "VerifiedFieldSprint_campaignCode_key" ON "VerifiedFieldSprint"("campaignCode");
CREATE INDEX "VerifiedFieldSprint_status_createdAt_idx" ON "VerifiedFieldSprint"("status", "createdAt");
CREATE INDEX "VerifiedFieldSprint_buyerOrganization_createdAt_idx" ON "VerifiedFieldSprint"("buyerOrganization", "createdAt");
CREATE UNIQUE INDEX "VerifiedFieldSprintMission_dareId_key" ON "VerifiedFieldSprintMission"("dareId");
CREATE UNIQUE INDEX "VerifiedFieldSprintMission_sprintId_ordinal_key" ON "VerifiedFieldSprintMission"("sprintId", "ordinal");
CREATE INDEX "VerifiedFieldSprintMission_sprintId_status_idx" ON "VerifiedFieldSprintMission"("sprintId", "status");
CREATE INDEX "VerifiedFieldSprintMission_venueId_acceptedAt_idx" ON "VerifiedFieldSprintMission"("venueId", "acceptedAt");
CREATE UNIQUE INDEX "VerifiedFieldSprintStation_sprintId_linkId_key" ON "VerifiedFieldSprintStation"("sprintId", "linkId");
CREATE INDEX "VerifiedFieldSprintStation_linkId_createdAt_idx" ON "VerifiedFieldSprintStation"("linkId", "createdAt");
CREATE UNIQUE INDEX "PlaceMemoryObservation_sprintMissionId_key" ON "PlaceMemoryObservation"("sprintMissionId");
CREATE UNIQUE INDEX "PlaceMemoryObservation_dareId_key" ON "PlaceMemoryObservation"("dareId");
CREATE INDEX "PlaceMemoryObservation_venueId_refreshAt_idx" ON "PlaceMemoryObservation"("venueId", "refreshAt");
CREATE INDEX "PlaceMemoryObservation_areaLabel_refreshAt_idx" ON "PlaceMemoryObservation"("areaLabel", "refreshAt");
CREATE INDEX "PlaceMemoryObservation_sprintId_createdAt_idx" ON "PlaceMemoryObservation"("sprintId", "createdAt");

ALTER TABLE "VerifiedFieldSprintMission" ADD CONSTRAINT "VerifiedFieldSprintMission_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "VerifiedFieldSprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerifiedFieldSprintMission" ADD CONSTRAINT "VerifiedFieldSprintMission_dareId_fkey" FOREIGN KEY ("dareId") REFERENCES "Dare"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VerifiedFieldSprintMission" ADD CONSTRAINT "VerifiedFieldSprintMission_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VerifiedFieldSprintStation" ADD CONSTRAINT "VerifiedFieldSprintStation_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "VerifiedFieldSprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerifiedFieldSprintStation" ADD CONSTRAINT "VerifiedFieldSprintStation_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "CreatorAttributionLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlaceMemoryObservation" ADD CONSTRAINT "PlaceMemoryObservation_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "VerifiedFieldSprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaceMemoryObservation" ADD CONSTRAINT "PlaceMemoryObservation_sprintMissionId_fkey" FOREIGN KEY ("sprintMissionId") REFERENCES "VerifiedFieldSprintMission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlaceMemoryObservation" ADD CONSTRAINT "PlaceMemoryObservation_dareId_fkey" FOREIGN KEY ("dareId") REFERENCES "Dare"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlaceMemoryObservation" ADD CONSTRAINT "PlaceMemoryObservation_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_verified_field_sprint_contract_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."buyerQuestion" IS DISTINCT FROM OLD."buyerQuestion"
    OR NEW."grossRewardUsd" IS DISTINCT FROM OLD."grossRewardUsd"
    OR NEW."outcomeContractFamily" IS DISTINCT FROM OLD."outcomeContractFamily"
    OR NEW."outcomeContractVersion" IS DISTINCT FROM OLD."outcomeContractVersion"
    OR NEW."outcomeContractSnapshot" IS DISTINCT FROM OLD."outcomeContractSnapshot" THEN
    RAISE EXCEPTION 'Verified Field Sprint mission contracts are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "VerifiedFieldSprintMission_contract_immutable"
BEFORE UPDATE ON "VerifiedFieldSprintMission"
FOR EACH ROW EXECUTE FUNCTION prevent_verified_field_sprint_contract_mutation();

CREATE OR REPLACE FUNCTION prevent_place_memory_observation_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Accepted place-memory observations are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PlaceMemoryObservation_append_only_update"
BEFORE UPDATE ON "PlaceMemoryObservation"
FOR EACH ROW EXECUTE FUNCTION prevent_place_memory_observation_mutation();
CREATE TRIGGER "PlaceMemoryObservation_append_only_delete"
BEFORE DELETE ON "PlaceMemoryObservation"
FOR EACH ROW EXECUTE FUNCTION prevent_place_memory_observation_mutation();

ALTER TABLE "VerifiedFieldSprint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerifiedFieldSprintMission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerifiedFieldSprintStation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlaceMemoryObservation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_VerifiedFieldSprint" ON "VerifiedFieldSprint" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_VerifiedFieldSprintMission" ON "VerifiedFieldSprintMission" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_VerifiedFieldSprintStation" ON "VerifiedFieldSprintStation" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_PlaceMemoryObservation" ON "PlaceMemoryObservation" FOR ALL TO service_role USING (true) WITH CHECK (true);
