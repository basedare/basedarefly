-- Reconcile historical Prisma schema changes that reached long-lived databases
-- through `prisma db push` but never received durable migrations.
--
-- This migration is deliberately additive and idempotent:
-- - clean databases receive the missing schema;
-- - databases that already received the old db-push changes keep their data;
-- - no existing indexes, columns, or tables are dropped.

ALTER TABLE "Dare"
  ADD COLUMN IF NOT EXISTS "claimExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "claimRequestStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "claimRequestTag" TEXT,
  ADD COLUMN IF NOT EXISTS "claimRequestWallet" TEXT,
  ADD COLUMN IF NOT EXISTS "claimRequestedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "claimedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "moderatorAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "moderatorDecision" TEXT,
  ADD COLUMN IF NOT EXISTS "moderatorNote" TEXT,
  ADD COLUMN IF NOT EXISTS "onChainDareId" TEXT,
  ADD COLUMN IF NOT EXISTS "proofCid" TEXT,
  ADD COLUMN IF NOT EXISTS "voteThreshold" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "PlaceTag"
  ADD COLUMN IF NOT EXISTS "serialNumber" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "Dare_onChainDareId_key"
  ON "Dare"("onChainDareId");
CREATE INDEX IF NOT EXISTS "Dare_claimedBy_idx"
  ON "Dare"("claimedBy");
CREATE INDEX IF NOT EXISTS "Dare_status_videoUrl_idx"
  ON "Dare"("status", "videoUrl");
CREATE INDEX IF NOT EXISTS "Dare_claimRequestStatus_idx"
  ON "Dare"("claimRequestStatus");
CREATE UNIQUE INDEX IF NOT EXISTS "PlaceTag_serialNumber_key"
  ON "PlaceTag"("serialNumber");

CREATE TABLE IF NOT EXISTS "VenueReview" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "tag" TEXT,
  "checkInId" TEXT,
  "verdict" TEXT NOT NULL,
  "note" TEXT,
  "confirmations" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VenueReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Comment" (
  "id" TEXT NOT NULL,
  "dareId" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "displayName" TEXT NOT NULL DEFAULT 'Anonymous',
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Vote" (
  "id" TEXT NOT NULL,
  "dareId" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "voteType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VoterPoints" (
  "id" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "totalPoints" INTEGER NOT NULL DEFAULT 0,
  "correctVotes" INTEGER NOT NULL DEFAULT 0,
  "totalVotes" INTEGER NOT NULL DEFAULT 0,
  "streak" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VoterPoints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CreatorPassport" (
  "id" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "homeZone" TEXT,
  "vibeLine" TEXT,
  "missionStyles" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "availability" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "radiusKm" INTEGER,
  "signalPoints" INTEGER NOT NULL DEFAULT 0,
  "completedMissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "pingsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "routeReady" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreatorPassport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PointsEvent" (
  "id" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointsEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "wallet" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "link" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DropRsvp" (
  "id" TEXT NOT NULL,
  "dropSlug" TEXT NOT NULL DEFAULT 'hideaway-games-night',
  "handle" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "gamePref" TEXT NOT NULL DEFAULT 'either',
  "source" TEXT,
  "status" TEXT NOT NULL DEFAULT 'joined',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DropRsvp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Pack" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Pack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Mark" (
  "id" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "wordHash" TEXT NOT NULL,
  "artUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Mark_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PackMember" (
  "id" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "securedVia" TEXT,
  "securedContact" TEXT,
  "walletAddress" TEXT,
  "streamerTagId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PackMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PackClaim" (
  "id" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "packMemberId" TEXT NOT NULL,
  "markId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'claimed',
  "points" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PackClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Meetup" (
  "id" TEXT NOT NULL,
  "creatorBaretagId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "venueId" TEXT,
  "placeLabel" TEXT NOT NULL,
  "approxLat" DOUBLE PRECISION NOT NULL,
  "approxLng" DOUBLE PRECISION NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Meetup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MeetupRsvp" (
  "id" TEXT NOT NULL,
  "meetupId" TEXT NOT NULL,
  "baretagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeetupRsvp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MeetupReport" (
  "id" TEXT NOT NULL,
  "meetupId" TEXT,
  "reportedBaretagId" TEXT,
  "reporterBaretagId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeetupReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MeetupBlock" (
  "id" TEXT NOT NULL,
  "blockerBaretagId" TEXT NOT NULL,
  "blockedBaretagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeetupBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VenueReview_venueId_createdAt_idx"
  ON "VenueReview"("venueId", "createdAt");
CREATE INDEX IF NOT EXISTS "VenueReview_walletAddress_createdAt_idx"
  ON "VenueReview"("walletAddress", "createdAt");
CREATE INDEX IF NOT EXISTS "VenueReview_checkInId_idx"
  ON "VenueReview"("checkInId");
CREATE INDEX IF NOT EXISTS "VenueReview_status_idx"
  ON "VenueReview"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "VenueReview_venueId_walletAddress_key"
  ON "VenueReview"("venueId", "walletAddress");

CREATE INDEX IF NOT EXISTS "Comment_dareId_createdAt_idx"
  ON "Comment"("dareId", "createdAt");

CREATE INDEX IF NOT EXISTS "Vote_dareId_idx"
  ON "Vote"("dareId");
CREATE INDEX IF NOT EXISTS "Vote_walletAddress_idx"
  ON "Vote"("walletAddress");
CREATE UNIQUE INDEX IF NOT EXISTS "Vote_dareId_walletAddress_key"
  ON "Vote"("dareId", "walletAddress");

CREATE UNIQUE INDEX IF NOT EXISTS "VoterPoints_walletAddress_key"
  ON "VoterPoints"("walletAddress");
CREATE INDEX IF NOT EXISTS "VoterPoints_totalPoints_idx"
  ON "VoterPoints"("totalPoints");

CREATE UNIQUE INDEX IF NOT EXISTS "CreatorPassport_walletAddress_key"
  ON "CreatorPassport"("walletAddress");
CREATE INDEX IF NOT EXISTS "CreatorPassport_signalPoints_idx"
  ON "CreatorPassport"("signalPoints");

CREATE INDEX IF NOT EXISTS "PointsEvent_walletAddress_idx"
  ON "PointsEvent"("walletAddress");
CREATE UNIQUE INDEX IF NOT EXISTS "PointsEvent_walletAddress_type_sourceId_key"
  ON "PointsEvent"("walletAddress", "type", "sourceId");

CREATE INDEX IF NOT EXISTS "Notification_wallet_isRead_idx"
  ON "Notification"("wallet", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx"
  ON "Notification"("createdAt");

CREATE INDEX IF NOT EXISTS "DropRsvp_dropSlug_status_createdAt_idx"
  ON "DropRsvp"("dropSlug", "status", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "DropRsvp_dropSlug_contact_key"
  ON "DropRsvp"("dropSlug", "contact");

CREATE UNIQUE INDEX IF NOT EXISTS "Pack_slug_key"
  ON "Pack"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Mark_packId_slug_key"
  ON "Mark"("packId", "slug");
CREATE INDEX IF NOT EXISTS "PackMember_packId_idx"
  ON "PackMember"("packId");
CREATE UNIQUE INDEX IF NOT EXISTS "PackMember_packId_handle_key"
  ON "PackMember"("packId", "handle");
CREATE INDEX IF NOT EXISTS "PackClaim_packId_type_idx"
  ON "PackClaim"("packId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "PackClaim_packMemberId_markId_type_key"
  ON "PackClaim"("packMemberId", "markId", "type");

CREATE INDEX IF NOT EXISTS "Meetup_status_startTime_idx"
  ON "Meetup"("status", "startTime");
CREATE INDEX IF NOT EXISTS "Meetup_creatorBaretagId_idx"
  ON "Meetup"("creatorBaretagId");
CREATE INDEX IF NOT EXISTS "Meetup_venueId_idx"
  ON "Meetup"("venueId");
CREATE INDEX IF NOT EXISTS "MeetupRsvp_baretagId_idx"
  ON "MeetupRsvp"("baretagId");
CREATE UNIQUE INDEX IF NOT EXISTS "MeetupRsvp_meetupId_baretagId_key"
  ON "MeetupRsvp"("meetupId", "baretagId");
CREATE INDEX IF NOT EXISTS "MeetupReport_meetupId_idx"
  ON "MeetupReport"("meetupId");
CREATE INDEX IF NOT EXISTS "MeetupReport_reportedBaretagId_idx"
  ON "MeetupReport"("reportedBaretagId");
CREATE INDEX IF NOT EXISTS "MeetupBlock_blockerBaretagId_idx"
  ON "MeetupBlock"("blockerBaretagId");
CREATE UNIQUE INDEX IF NOT EXISTS "MeetupBlock_blockerBaretagId_blockedBaretagId_key"
  ON "MeetupBlock"("blockerBaretagId", "blockedBaretagId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'VenueReview_venueId_fkey'
  ) THEN
    ALTER TABLE "VenueReview"
      ADD CONSTRAINT "VenueReview_venueId_fkey"
      FOREIGN KEY ("venueId") REFERENCES "Venue"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'VenueReview_checkInId_fkey'
  ) THEN
    ALTER TABLE "VenueReview"
      ADD CONSTRAINT "VenueReview_checkInId_fkey"
      FOREIGN KEY ("checkInId") REFERENCES "VenueCheckIn"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Comment_dareId_fkey'
  ) THEN
    ALTER TABLE "Comment"
      ADD CONSTRAINT "Comment_dareId_fkey"
      FOREIGN KEY ("dareId") REFERENCES "Dare"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Vote_dareId_fkey'
  ) THEN
    ALTER TABLE "Vote"
      ADD CONSTRAINT "Vote_dareId_fkey"
      FOREIGN KEY ("dareId") REFERENCES "Dare"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Mark_packId_fkey'
  ) THEN
    ALTER TABLE "Mark"
      ADD CONSTRAINT "Mark_packId_fkey"
      FOREIGN KEY ("packId") REFERENCES "Pack"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PackMember_packId_fkey'
  ) THEN
    ALTER TABLE "PackMember"
      ADD CONSTRAINT "PackMember_packId_fkey"
      FOREIGN KEY ("packId") REFERENCES "Pack"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PackClaim_packId_fkey'
  ) THEN
    ALTER TABLE "PackClaim"
      ADD CONSTRAINT "PackClaim_packId_fkey"
      FOREIGN KEY ("packId") REFERENCES "Pack"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PackClaim_packMemberId_fkey'
  ) THEN
    ALTER TABLE "PackClaim"
      ADD CONSTRAINT "PackClaim_packMemberId_fkey"
      FOREIGN KEY ("packMemberId") REFERENCES "PackMember"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PackClaim_markId_fkey'
  ) THEN
    ALTER TABLE "PackClaim"
      ADD CONSTRAINT "PackClaim_markId_fkey"
      FOREIGN KEY ("markId") REFERENCES "Mark"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'MeetupRsvp_meetupId_fkey'
  ) THEN
    ALTER TABLE "MeetupRsvp"
      ADD CONSTRAINT "MeetupRsvp_meetupId_fkey"
      FOREIGN KEY ("meetupId") REFERENCES "Meetup"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'MeetupReport_meetupId_fkey'
  ) THEN
    ALTER TABLE "MeetupReport"
      ADD CONSTRAINT "MeetupReport_meetupId_fkey"
      FOREIGN KEY ("meetupId") REFERENCES "Meetup"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'VenueReview',
    'Comment',
    'Vote',
    'VoterPoints',
    'CreatorPassport',
    'PointsEvent',
    'Notification',
    'DropRsvp',
    'Pack',
    'Mark',
    'PackMember',
    'PackClaim',
    'Meetup',
    'MeetupRsvp',
    'MeetupReport',
    'MeetupBlock'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I',
      'service_role_all_' || lower(table_name),
      table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      'service_role_all_' || lower(table_name),
      table_name
    );
    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated', table_name);
  END LOOP;
END
$$;
