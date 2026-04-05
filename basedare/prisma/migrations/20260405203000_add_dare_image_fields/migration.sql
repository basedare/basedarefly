-- Add optional custom image support for dares
ALTER TABLE "Dare"
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "imageCid" TEXT;
