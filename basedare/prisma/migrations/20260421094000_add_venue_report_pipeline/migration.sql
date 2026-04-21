-- CreateTable
CREATE TABLE "public"."VenueReportLead" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'venue',
    "source" TEXT NOT NULL DEFAULT 'REPORT',
    "intent" TEXT,
    "sessionKey" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "organization" TEXT,
    "notes" TEXT,
    "contactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueReportLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VenueReportEvent" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "leadId" TEXT,
    "audience" TEXT NOT NULL DEFAULT 'venue',
    "eventType" TEXT NOT NULL,
    "sessionKey" TEXT,
    "channel" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueReportEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."VenueReportLead"
ADD CONSTRAINT "VenueReportLead_venueId_fkey"
FOREIGN KEY ("venueId") REFERENCES "public"."Venue"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VenueReportEvent"
ADD CONSTRAINT "VenueReportEvent_venueId_fkey"
FOREIGN KEY ("venueId") REFERENCES "public"."Venue"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VenueReportEvent"
ADD CONSTRAINT "VenueReportEvent_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "public"."VenueReportLead"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "VenueReportLead_venueId_createdAt_idx" ON "public"."VenueReportLead"("venueId", "createdAt");

-- CreateIndex
CREATE INDEX "VenueReportLead_venueId_audience_createdAt_idx" ON "public"."VenueReportLead"("venueId", "audience", "createdAt");

-- CreateIndex
CREATE INDEX "VenueReportLead_email_createdAt_idx" ON "public"."VenueReportLead"("email", "createdAt");

-- CreateIndex
CREATE INDEX "VenueReportLead_sessionKey_createdAt_idx" ON "public"."VenueReportLead"("sessionKey", "createdAt");

-- CreateIndex
CREATE INDEX "VenueReportEvent_venueId_createdAt_idx" ON "public"."VenueReportEvent"("venueId", "createdAt");

-- CreateIndex
CREATE INDEX "VenueReportEvent_venueId_eventType_createdAt_idx" ON "public"."VenueReportEvent"("venueId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "VenueReportEvent_sessionKey_createdAt_idx" ON "public"."VenueReportEvent"("sessionKey", "createdAt");
