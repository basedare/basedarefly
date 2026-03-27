ALTER TABLE "StreamerTag"
  ADD COLUMN "identityPlatform" TEXT,
  ADD COLUMN "identityHandle" TEXT,
  ADD COLUMN "identityVerificationCode" TEXT;

CREATE INDEX "StreamerTag_identityPlatform_identityHandle_idx"
  ON "StreamerTag"("identityPlatform", "identityHandle");

CREATE INDEX "StreamerTag_identityHandle_idx"
  ON "StreamerTag"("identityHandle");
