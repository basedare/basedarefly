-- Close the inherited RLS gap on legacy BaseDare tables.
--
-- These tables are server-owned. Public clients must not receive direct table
-- privileges; application routes remain the authorization boundary. The
-- service role keeps the same unrestricted server access used by newer models.

ALTER TABLE "BaseCashVenueCredit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Brand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignSlot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dare" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaderboardEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LivePot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlaceTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PotTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Referral" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Scout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScoutCreator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StreamerTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Venue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VenueCheckIn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VenueMemory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VenueQrSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeeklyRewardDistribution" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  "BaseCashVenueCredit",
  "Brand",
  "Campaign",
  "CampaignSlot",
  "Dare",
  "LeaderboardEntry",
  "LivePot",
  "PlaceTag",
  "PotTransaction",
  "Referral",
  "Scout",
  "ScoutCreator",
  "StreamerTag",
  "User",
  "Venue",
  "VenueCheckIn",
  "VenueMemory",
  "VenueQrSession",
  "WeeklyRewardDistribution"
FROM anon, authenticated;

DROP POLICY IF EXISTS "service_role_all_BaseCashVenueCredit" ON "BaseCashVenueCredit";
CREATE POLICY "service_role_all_BaseCashVenueCredit"
  ON "BaseCashVenueCredit" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_Brand" ON "Brand";
CREATE POLICY "service_role_all_Brand"
  ON "Brand" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_Campaign" ON "Campaign";
CREATE POLICY "service_role_all_Campaign"
  ON "Campaign" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_CampaignSlot" ON "CampaignSlot";
CREATE POLICY "service_role_all_CampaignSlot"
  ON "CampaignSlot" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_Dare" ON "Dare";
CREATE POLICY "service_role_all_Dare"
  ON "Dare" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_LeaderboardEntry" ON "LeaderboardEntry";
CREATE POLICY "service_role_all_LeaderboardEntry"
  ON "LeaderboardEntry" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_LivePot" ON "LivePot";
CREATE POLICY "service_role_all_LivePot"
  ON "LivePot" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_PlaceTag" ON "PlaceTag";
CREATE POLICY "service_role_all_PlaceTag"
  ON "PlaceTag" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_PotTransaction" ON "PotTransaction";
CREATE POLICY "service_role_all_PotTransaction"
  ON "PotTransaction" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_Referral" ON "Referral";
CREATE POLICY "service_role_all_Referral"
  ON "Referral" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_Scout" ON "Scout";
CREATE POLICY "service_role_all_Scout"
  ON "Scout" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_ScoutCreator" ON "ScoutCreator";
CREATE POLICY "service_role_all_ScoutCreator"
  ON "ScoutCreator" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_StreamerTag" ON "StreamerTag";
CREATE POLICY "service_role_all_StreamerTag"
  ON "StreamerTag" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_User" ON "User";
CREATE POLICY "service_role_all_User"
  ON "User" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_Venue" ON "Venue";
CREATE POLICY "service_role_all_Venue"
  ON "Venue" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_VenueCheckIn" ON "VenueCheckIn";
CREATE POLICY "service_role_all_VenueCheckIn"
  ON "VenueCheckIn" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_VenueMemory" ON "VenueMemory";
CREATE POLICY "service_role_all_VenueMemory"
  ON "VenueMemory" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_VenueQrSession" ON "VenueQrSession";
CREATE POLICY "service_role_all_VenueQrSession"
  ON "VenueQrSession" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_WeeklyRewardDistribution" ON "WeeklyRewardDistribution";
CREATE POLICY "service_role_all_WeeklyRewardDistribution"
  ON "WeeklyRewardDistribution" FOR ALL TO service_role
  USING (true) WITH CHECK (true);
