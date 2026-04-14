CREATE TABLE "CreatorReview" (
  "id" TEXT NOT NULL,
  "dareId" TEXT NOT NULL,
  "creatorTag" TEXT NOT NULL,
  "reviewerWallet" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "review" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CreatorReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorReview_dareId_key" ON "CreatorReview"("dareId");
CREATE INDEX "CreatorReview_creatorTag_createdAt_idx" ON "CreatorReview"("creatorTag", "createdAt");
CREATE INDEX "CreatorReview_reviewerWallet_createdAt_idx" ON "CreatorReview"("reviewerWallet", "createdAt");

ALTER TABLE "CreatorReview"
ADD CONSTRAINT "CreatorReview_dareId_fkey" FOREIGN KEY ("dareId") REFERENCES "Dare"("id") ON DELETE CASCADE ON UPDATE CASCADE;
