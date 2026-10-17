CREATE TABLE "AdventureJournal" (
  "walletAddress" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "progressJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdventureJournal_pkey" PRIMARY KEY ("walletAddress"),
  CONSTRAINT "AdventureJournal_wallet_lowercase" CHECK ("walletAddress" = lower("walletAddress"))
);
ALTER TABLE "AdventureJournal" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE "AdventureJournal" TO service_role;
REVOKE ALL ON TABLE "AdventureJournal" FROM anon, authenticated;
CREATE POLICY "service_role_all_AdventureJournal" ON "AdventureJournal" FOR ALL TO service_role USING (true) WITH CHECK (true);
