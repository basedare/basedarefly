-- Add provenance-backed official contact routes for venue profiles.

CREATE TABLE "VenueContactRoute" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "purpose" TEXT,
  "url" TEXT NOT NULL,
  "responseHours" TEXT,
  "source" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "consentBasis" TEXT NOT NULL,
  "isPersonal" BOOLEAN NOT NULL DEFAULT false,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "verifiedAt" TIMESTAMP(3),
  "verifiedBy" TEXT,
  "lastConfirmedAt" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VenueContactRoute_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VenueContactRoute_venueId_active_isPublic_verificationStatus_sortOrder_idx"
  ON "VenueContactRoute"("venueId", "active", "isPublic", "verificationStatus", "sortOrder");

CREATE INDEX "VenueContactRoute_venueId_channel_idx"
  ON "VenueContactRoute"("venueId", "channel");

CREATE INDEX "VenueContactRoute_lastConfirmedAt_idx"
  ON "VenueContactRoute"("lastConfirmedAt");

ALTER TABLE "VenueContactRoute"
  ADD CONSTRAINT "VenueContactRoute_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BaseDare's server is the only direct database reader/writer. Public contact
-- visibility is enforced by the application route, while Supabase Data API
-- access remains closed to anon/authenticated roles.
ALTER TABLE "VenueContactRoute" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_VenueContactRoute"
  ON "VenueContactRoute"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE "VenueContactRoute" FROM anon;
REVOKE ALL ON TABLE "VenueContactRoute" FROM authenticated;

-- Seed only a publicly listed business contact. This is not a BaseDare
-- partnership claim and does not grant venue-management authority.
INSERT INTO "VenueContactRoute" (
  "id",
  "venueId",
  "channel",
  "label",
  "purpose",
  "url",
  "responseHours",
  "source",
  "sourceUrl",
  "consentBasis",
  "isPersonal",
  "isPublic",
  "active",
  "verificationStatus",
  "verifiedAt",
  "verifiedBy",
  "lastConfirmedAt",
  "sortOrder",
  "createdBy",
  "createdAt",
  "updatedAt"
)
SELECT
  'venue_contact_la_sola_instagram',
  "id",
  'INSTAGRAM',
  'Official Instagram',
  'Updates and general inquiries',
  'https://www.instagram.com/lasola.siargao/',
  NULL,
  'PUBLIC_OFFICIAL_PROFILE',
  'https://www.instagram.com/lasola.siargao/',
  'PUBLIC_BUSINESS_CONTACT',
  false,
  true,
  true,
  'VERIFIED',
  CURRENT_TIMESTAMP,
  'basedare-curation',
  CURRENT_TIMESTAMP,
  0,
  'basedare-curation',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Venue"
WHERE "slug" = 'la-sola-sunset-bar-and-lounge'
ON CONFLICT ("id") DO NOTHING;
