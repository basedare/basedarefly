-- Additive, private references only. Apply explicitly before an approved release.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE "SocialFollow" (
  "id" TEXT PRIMARY KEY, "wallet" TEXT NOT NULL, "targetKind" TEXT NOT NULL,
  "targetKey" TEXT NOT NULL, "targetWallet" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialFollow_kind" CHECK ("targetKind" IN ('PERSON', 'VENUE')),
  CONSTRAINT "SocialFollow_owner" CHECK ("wallet" ~ '^0x[0-9a-f]{40}$'),
  CONSTRAINT "SocialFollow_person" CHECK (("targetKind" = 'PERSON' AND "targetWallet" IS NOT NULL AND "targetWallet" ~ '^0x[0-9a-f]{40}$' AND "wallet" <> "targetWallet") OR ("targetKind" = 'VENUE' AND "targetWallet" IS NULL))
);
CREATE UNIQUE INDEX "SocialFollow_wallet_targetKind_targetKey_key" ON "SocialFollow"("wallet", "targetKind", "targetKey");
CREATE INDEX "SocialFollow_wallet_active_updatedAt_idx" ON "SocialFollow"("wallet", "active", "updatedAt");
CREATE INDEX "SocialFollow_targetKind_targetKey_active_idx" ON "SocialFollow"("targetKind", "targetKey", "active");
CREATE TABLE "SavedItem" (
  "id" TEXT PRIMARY KEY, "wallet" TEXT NOT NULL, "targetKind" TEXT NOT NULL,
  "targetKey" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SavedItem_kind" CHECK ("targetKind" IN ('VENUE', 'STORY', 'MOMENT', 'ACTIVITY')),
  CONSTRAINT "SavedItem_owner" CHECK ("wallet" ~ '^0x[0-9a-f]{40}$')
);
CREATE UNIQUE INDEX "SavedItem_wallet_targetKind_targetKey_key" ON "SavedItem"("wallet", "targetKind", "targetKey");
CREATE INDEX "SavedItem_wallet_active_updatedAt_idx" ON "SavedItem"("wallet", "active", "updatedAt");
ALTER TABLE "SocialFollow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedItem" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "SocialFollow", "SavedItem" FROM anon, authenticated;
GRANT ALL ON "SocialFollow", "SavedItem" TO service_role;
CREATE POLICY "service_role_social_follow" ON "SocialFollow" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_saved_item" ON "SavedItem" FOR ALL TO service_role USING (true) WITH CHECK (true);
COMMIT;
