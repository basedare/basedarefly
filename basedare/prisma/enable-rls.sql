-- ============================================================================
-- BaseDare: Enable RLS on all tables
-- ============================================================================
--
-- WHY: Supabase exposes a PostgREST API at your project URL. Anyone with the
-- anon key (which is public by design) can query tables that lack RLS. This
-- script locks every table so that:
--
--   1. The `postgres` role (used by Prisma via DATABASE_URL) BYPASSES RLS
--      entirely — it's a superuser. No policy needed, no code changes.
--
--   2. The `service_role` (used by Supabase admin SDK if ever added) gets
--      explicit full-access policies as a safety net.
--
--   3. The `anon` and `authenticated` roles get ZERO access — no policies
--      granted, so every PostgREST query returns empty/denied.
--
-- HOW TO RUN:
--   Option A: Supabase Dashboard → SQL Editor → paste & run
--   Option B: psql -h db.<ref>.supabase.co -U postgres -d postgres -f prisma/enable-rls.sql
--
-- SAFE TO RE-RUN: All statements are idempotent.
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable RLS on every application table
-- ============================================================================
-- Prisma models (14 tables created by Prisma)
ALTER TABLE "User"                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dare"                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Referral"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StreamerTag"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Brand"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignSlot"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Scout"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScoutCreator"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LivePot"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PotTransaction"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaderboardEntry"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeeklyRewardDistribution" ENABLE ROW LEVEL SECURITY;

-- Prisma internal table
ALTER TABLE "_prisma_migrations"       ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Service-role bypass policies (full CRUD)
-- ============================================================================
-- The `service_role` is Supabase's privileged role for server-side SDKs.
-- These policies grant unrestricted access if you ever use @supabase/supabase-js
-- with the service_role key.
--
-- DROP IF EXISTS ensures idempotency on re-runs.
-- ============================================================================

-- User
DROP POLICY IF EXISTS "service_role_all_User" ON "User";
CREATE POLICY "service_role_all_User" ON "User"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Dare
DROP POLICY IF EXISTS "service_role_all_Dare" ON "Dare";
CREATE POLICY "service_role_all_Dare" ON "Dare"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Referral
DROP POLICY IF EXISTS "service_role_all_Referral" ON "Referral";
CREATE POLICY "service_role_all_Referral" ON "Referral"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- StreamerTag
DROP POLICY IF EXISTS "service_role_all_StreamerTag" ON "StreamerTag";
CREATE POLICY "service_role_all_StreamerTag" ON "StreamerTag"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Brand
DROP POLICY IF EXISTS "service_role_all_Brand" ON "Brand";
CREATE POLICY "service_role_all_Brand" ON "Brand"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Campaign
DROP POLICY IF EXISTS "service_role_all_Campaign" ON "Campaign";
CREATE POLICY "service_role_all_Campaign" ON "Campaign"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- CampaignSlot
DROP POLICY IF EXISTS "service_role_all_CampaignSlot" ON "CampaignSlot";
CREATE POLICY "service_role_all_CampaignSlot" ON "CampaignSlot"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Scout
DROP POLICY IF EXISTS "service_role_all_Scout" ON "Scout";
CREATE POLICY "service_role_all_Scout" ON "Scout"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ScoutCreator
DROP POLICY IF EXISTS "service_role_all_ScoutCreator" ON "ScoutCreator";
CREATE POLICY "service_role_all_ScoutCreator" ON "ScoutCreator"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- LivePot
DROP POLICY IF EXISTS "service_role_all_LivePot" ON "LivePot";
CREATE POLICY "service_role_all_LivePot" ON "LivePot"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- PotTransaction
DROP POLICY IF EXISTS "service_role_all_PotTransaction" ON "PotTransaction";
CREATE POLICY "service_role_all_PotTransaction" ON "PotTransaction"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- LeaderboardEntry
DROP POLICY IF EXISTS "service_role_all_LeaderboardEntry" ON "LeaderboardEntry";
CREATE POLICY "service_role_all_LeaderboardEntry" ON "LeaderboardEntry"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- WeeklyRewardDistribution
DROP POLICY IF EXISTS "service_role_all_WeeklyRewardDistribution" ON "WeeklyRewardDistribution";
CREATE POLICY "service_role_all_WeeklyRewardDistribution" ON "WeeklyRewardDistribution"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- _prisma_migrations (internal — only service_role should touch this)
DROP POLICY IF EXISTS "service_role_all_prisma_migrations" ON "_prisma_migrations";
CREATE POLICY "service_role_all_prisma_migrations" ON "_prisma_migrations"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 3: Explicitly deny anon and authenticated (belt-and-suspenders)
-- ============================================================================
-- With RLS enabled and NO policies for anon/authenticated, they already get
-- zero rows. But we revoke table-level privileges too, so PostgREST can't
-- even attempt a query.
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'User', 'Dare', 'Referral', 'StreamerTag', 'Brand', 'Campaign',
    'CampaignSlot', 'Scout', 'ScoutCreator', 'LivePot', 'PotTransaction',
    'LeaderboardEntry', 'WeeklyRewardDistribution', '_prisma_migrations'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon', tbl);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM authenticated', tbl);
  END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Verify
-- ============================================================================
-- After running, confirm in Supabase Dashboard → Table Editor that each table
-- shows the RLS shield icon as enabled.
--
-- Or run this query:
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
--
-- All should show rowsecurity = true.
-- ============================================================================
