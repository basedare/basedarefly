ALTER TABLE "Dare" ADD COLUMN "contentSubmittedAt" TIMESTAMP(3);

CREATE TABLE "ContentRightsAcceptance" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "dareId" TEXT NOT NULL REFERENCES "Dare"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "wallet" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "termsVersion" TEXT NOT NULL,
  "termsSnapshot" JSONB NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ContentRightsAcceptance_dareId_wallet_fingerprint_key" ON "ContentRightsAcceptance"("dareId", "wallet", "fingerprint");
CREATE INDEX "ContentRightsAcceptance_wallet_acceptedAt_idx" ON "ContentRightsAcceptance"("wallet", "acceptedAt");
ALTER TABLE "ContentRightsAcceptance" ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION prevent_content_rights_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Content rights acceptances are immutable'; END;
$$;
CREATE TRIGGER content_rights_immutable BEFORE UPDATE OR DELETE ON "ContentRightsAcceptance"
FOR EACH ROW EXECUTE FUNCTION prevent_content_rights_mutation();

REVOKE ALL ON TABLE "ContentRightsAcceptance" FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE "ContentRightsAcceptance" TO service_role;
CREATE POLICY "service_role_content_rights_read" ON "ContentRightsAcceptance" FOR SELECT TO service_role USING (true);
CREATE POLICY "service_role_content_rights_insert" ON "ContentRightsAcceptance" FOR INSERT TO service_role WITH CHECK (true);
