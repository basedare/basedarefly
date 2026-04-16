-- AlterTable
ALTER TABLE "public"."WebPushSubscription"
ADD COLUMN "topics" TEXT[] NOT NULL DEFAULT ARRAY['wallet','nearby']::TEXT[];
