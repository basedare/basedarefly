-- Enable RLS on tables added after the original Supabase lock-down script.
-- Safe to re-run.

ALTER TABLE "CreatorReview"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VenueReportEvent"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VenueReportLead"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppSettings"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebPushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebPushDelivery"     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_CreatorReview" ON "CreatorReview";
CREATE POLICY "service_role_all_CreatorReview" ON "CreatorReview"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_VenueReportEvent" ON "VenueReportEvent";
CREATE POLICY "service_role_all_VenueReportEvent" ON "VenueReportEvent"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_VenueReportLead" ON "VenueReportLead";
CREATE POLICY "service_role_all_VenueReportLead" ON "VenueReportLead"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_AppSettings" ON "AppSettings";
CREATE POLICY "service_role_all_AppSettings" ON "AppSettings"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_WebPushSubscription" ON "WebPushSubscription";
CREATE POLICY "service_role_all_WebPushSubscription" ON "WebPushSubscription"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_WebPushDelivery" ON "WebPushDelivery";
CREATE POLICY "service_role_all_WebPushDelivery" ON "WebPushDelivery"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE "CreatorReview"       FROM anon;
REVOKE ALL ON TABLE "CreatorReview"       FROM authenticated;
REVOKE ALL ON TABLE "VenueReportEvent"    FROM anon;
REVOKE ALL ON TABLE "VenueReportEvent"    FROM authenticated;
REVOKE ALL ON TABLE "VenueReportLead"     FROM anon;
REVOKE ALL ON TABLE "VenueReportLead"     FROM authenticated;
REVOKE ALL ON TABLE "AppSettings"         FROM anon;
REVOKE ALL ON TABLE "AppSettings"         FROM authenticated;
REVOKE ALL ON TABLE "WebPushSubscription" FROM anon;
REVOKE ALL ON TABLE "WebPushSubscription" FROM authenticated;
REVOKE ALL ON TABLE "WebPushDelivery"     FROM anon;
REVOKE ALL ON TABLE "WebPushDelivery"     FROM authenticated;
