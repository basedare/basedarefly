-- AlterTable
ALTER TABLE "Dare"
ADD COLUMN     "requireSentinel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sentinelVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualReviewNeeded" BOOLEAN NOT NULL DEFAULT false;
