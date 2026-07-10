-- Self-expiring per-row lease for the retry-payouts cron so two concurrent
-- invocations cannot both process (and double-broadcast) the same PENDING_PAYOUT
-- row. Nullable; set atomically via a guarded updateMany, ignored once stale.
ALTER TABLE "public"."Dare" ADD COLUMN "payoutLeaseAt" TIMESTAMP(3);
