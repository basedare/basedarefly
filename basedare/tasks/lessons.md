# BaseDare Lessons

Use this file for durable project lessons that prevent repeated mistakes.

## Template

### Date
- Context:
- What went wrong:
- Rule going forward:
- Files or systems affected:

## Active Lessons

### 2026-07-13
- Context: Separating V2 bounty settlement from the Verified Field Sprint service invoice.
- What went wrong: Stale pricing code allowed a managed-service amount to become an automatic scout-commission base, while a campaign could be registered from a database-only reward fallback.
- Rule going forward: Service revenue, creator reward liability, and settlement revenue are separate ledgers. Never infer commissions from an invoice, and never call a commercial mission funded until each reward is backed by real escrow.
- Files or systems affected: `docs/FINANCIAL_CANON.md`, `lib/financial-canon.ts`, activation-intake admin, campaign creation, founder scoreboard, release safety.

### 2026-04-29
- Context: Money-rail cron and Telegram admin surfaces.
- What went wrong: Live settlement jobs could treat missing on-chain IDs too softly, and the Telegram natural-language query route was not protected like the command route.
- Rule going forward: Money-moving automation must fail loud on live-chain identity gaps, and every Telegram/admin helper route must share an explicit secret or moderator-session guard.
- Files or systems affected: `app/api/cron/retry-payouts`, `app/api/refund/expired`, `app/api/telegram/*`, `scripts/static-production-safety.mjs`.

### 2026-04-29
- Context: Founder Scoreboard and Daily Command Loop prioritization.
- What went wrong: Current-row snapshots can hide the sequence of create, fund, proof, payout, refund, and venue utility events that operators need for high-ROI decisions.
- Rule going forward: Any metric that drives founder action should have a durable event ledger first, with synthesized row-state fallbacks only for migration/backfill safety.
- Files or systems affected: `lib/founder-events.ts`, `lib/founder-scoreboard.ts`, `app/api/bounties`, `app/api/verify-proof`, `app/api/refund/expired`, `app/api/venues/check-in`.
