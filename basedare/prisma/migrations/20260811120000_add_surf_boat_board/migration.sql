-- A free, place-bound coordination rail for shared surf boats.
CREATE TABLE "SurfBoatCrew" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "creatorBaretagId" TEXT NOT NULL,
  "departureDay" TEXT NOT NULL,
  "timeWindow" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "abilityLane" TEXT NOT NULL,
  "minimumCrew" INTEGER NOT NULL DEFAULT 4,
  "indicativeTotalPhp" INTEGER NOT NULL DEFAULT 1200,
  "status" TEXT NOT NULL DEFAULT 'FORMING',
  "operatorTokenHash" TEXT,
  "operatorTokenExpiresAt" TIMESTAMP(3),
  "operatorName" TEXT,
  "operatorConfirmedDestination" TEXT,
  "operatorConfirmedTotalPhp" INTEGER,
  "operatorConfirmedCapacity" INTEGER,
  "operatorConfirmedDepartureAt" TIMESTAMP(3),
  "operatorNote" TEXT,
  "operatorConfirmedAt" TIMESTAMP(3),
  "termsVersion" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SurfBoatCrew_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SurfBoatCrewMember" (
  "id" TEXT NOT NULL,
  "crewId" TEXT NOT NULL,
  "baretagId" TEXT NOT NULL,
  "commitment" TEXT NOT NULL,
  "abilityLane" TEXT NOT NULL,
  "needsBoard" BOOLEAN NOT NULL DEFAULT false,
  "acceptedTermsVersion" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SurfBoatCrewMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SurfBoatCrew_venueId_status_expiresAt_idx" ON "SurfBoatCrew"("venueId", "status", "expiresAt");
CREATE INDEX "SurfBoatCrew_departureDay_status_idx" ON "SurfBoatCrew"("departureDay", "status");
CREATE INDEX "SurfBoatCrew_creatorBaretagId_idx" ON "SurfBoatCrew"("creatorBaretagId");
CREATE UNIQUE INDEX "SurfBoatCrewMember_crewId_baretagId_key" ON "SurfBoatCrewMember"("crewId", "baretagId");
CREATE INDEX "SurfBoatCrewMember_baretagId_idx" ON "SurfBoatCrewMember"("baretagId");

ALTER TABLE "SurfBoatCrew"
  ADD CONSTRAINT "SurfBoatCrew_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SurfBoatCrewMember"
  ADD CONSTRAINT "SurfBoatCrewMember_crewId_fkey"
  FOREIGN KEY ("crewId") REFERENCES "SurfBoatCrew"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- These tables are server-owned; application routes remain the authorization boundary.
ALTER TABLE "SurfBoatCrew" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SurfBoatCrewMember" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "SurfBoatCrew", "SurfBoatCrewMember" FROM anon, authenticated;

CREATE POLICY "service_role_all_SurfBoatCrew"
  ON "SurfBoatCrew" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_SurfBoatCrewMember"
  ON "SurfBoatCrewMember" FOR ALL TO service_role
  USING (true) WITH CHECK (true);
