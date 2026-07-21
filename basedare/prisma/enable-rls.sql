-- ============================================================================
-- BaseDare: Enable RLS on all public application tables
-- ============================================================================
--
-- WHY: Supabase exposes a PostgREST API at your project URL. Any table in the
-- public schema with RLS disabled can be reachable through that Data API when
-- grants exist for anon/authenticated roles.
--
-- This script locks application tables so that:
--
--   1. RLS is enabled on every known Prisma-backed public table.
--   2. Supabase's service_role keeps explicit full-access policies for trusted
--      server-side use only.
--   3. anon/authenticated table privileges are revoked. With RLS enabled and no
--      client policies, direct Data API reads/writes are denied by default.
--
-- HOW TO RUN:
--   Option A: Supabase Dashboard -> SQL Editor -> paste & run
--   Option B: psql -h db.<ref>.supabase.co -U postgres -d postgres -f prisma/enable-rls.sql
--
-- SAFE TO RE-RUN: All statements are idempotent. Tables missing from an older
-- database are skipped with a NOTICE.
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
  policy_name TEXT;
  app_tables TEXT[] := ARRAY[
    'User',
    'Dare',
    'DareProofAttempt',
    'CreatorReview',
    'Venue',
    'VenueContactRoute',
    'BaseCashVenueCredit',
    'FounderEvent',
    'VenueReportEvent',
    'VenueReportLead',
    'PlaceTag',
    'VenueCheckIn',
    'VenueReview',
    'VenueMemory',
    'VerifiedFieldSprint',
    'VerifiedFieldSprintMission',
    'VerifiedFieldSprintMissionLink',
    'VerifiedFieldSprintBuyerDecision',
    'VerifiedFieldSprintStation',
    'PlaceMemoryObservation',
    'VenueQrSession',
    'VenueRoomMessage',
    'VenueRoomPresence',
    'AppSettings',
    'Comment',
    'Referral',
    'StreamerTag',
    'Brand',
    'Campaign',
    'CampaignSlot',
    'Scout',
    'ScoutRakeEvent',
    'ScoutCreator',
    'LivePot',
    'PotTransaction',
    'LeaderboardEntry',
    'WeeklyRewardDistribution',
    'Vote',
    'VoterPoints',
    'CreatorPassport',
    'PointsEvent',
    'Notification',
    'InboxThread',
    'InboxMessage',
    'WebPushSubscription',
    'WebPushDelivery',
    'DropRsvp',
    'Pack',
    'Mark',
    'PackMember',
    'PackClaim',
    'Meetup',
    'MeetupRsvp',
    'MeetupReport',
    'MeetupBlock',
    '_prisma_migrations'
  ];
BEGIN
  FOREACH tbl IN ARRAY app_tables
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      RAISE NOTICE 'Skipping public.%, table does not exist in this database', tbl;
      CONTINUE;
    END IF;

    policy_name := 'service_role_all_' || replace(tbl, '_', '');

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      policy_name,
      tbl
    );

    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', tbl);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', tbl);
  END LOOP;
END $$;

-- ============================================================================
-- Verify after running
-- ============================================================================
-- Supabase Dashboard -> Database -> Security Advisor should clear
-- rls_disabled_in_public after its next scan.
--
-- Or run:
--
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
--
-- All application tables should show rowsecurity = true.
-- ============================================================================
