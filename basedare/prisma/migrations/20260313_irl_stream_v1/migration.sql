ALTER TABLE "Dare"
ADD COLUMN "missionMode" TEXT DEFAULT 'IRL',
ADD COLUMN "tag" TEXT,
ADD COLUMN "venue_key" TEXT,
ADD COLUMN "dare_text" TEXT,
ADD COLUMN "proof_media" TEXT,
ADD COLUMN "completed_at" TIMESTAMP(3),
ADD COLUMN "reaction_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "geo_bucket" TEXT;

CREATE INDEX "Dare_tag_idx" ON "Dare"("tag");
CREATE INDEX "Dare_geo_bucket_idx" ON "Dare"("geo_bucket");
