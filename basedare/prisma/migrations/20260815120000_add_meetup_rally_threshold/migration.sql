ALTER TABLE "Meetup"
  ADD COLUMN IF NOT EXISTS "minimumPeople" INTEGER;

ALTER TABLE "Meetup"
  DROP CONSTRAINT IF EXISTS "Meetup_minimumPeople_check";

ALTER TABLE "Meetup"
  ADD CONSTRAINT "Meetup_minimumPeople_check"
  CHECK ("minimumPeople" IS NULL OR ("minimumPeople" >= 2 AND "minimumPeople" <= 50));
