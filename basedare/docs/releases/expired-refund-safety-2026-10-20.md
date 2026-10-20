# Expired refund configuration safety — 20 October 2026

## Problem and change

An expired, non-simulated `AWAITING_CLAIM` dare could be marked `REFUNDED`
without a transfer when the bounty address was missing/invalid or runtime
simulation was enabled. That fallback could also sync a linked campaign and
record a simulated refund against real work.

Only a record explicitly stored as `isSimulated: true` now takes the simulated
path. Before each live refund, the route uses the existing fresh payment-readiness
checks: both simulation flags must be exactly false, and chain, deployed escrow,
canonical token, treasury, referee, fees and referee gas must pass. A failed check
returns a failed item, alerts operations and leaves the dare and linked campaign
unchanged. No refund wallet client is created for a blocked item.

The successful live path still waits for the transfer receipt before recording
`REFUNDED`. Existing confirmed-event reconciliation remains available after a
lost/failed response. The route does not claim an unavailable check is a refund.

## Verification

- 26 route scenarios pass (27 Node test entries including their parent), loading
  the actual route, cron authentication and payment-readiness helpers. External
  RPC, signing, database, campaign/event and alert boundaries are fixture-only.
- Cases include missing/invalid/mismatched simulation flags, absent/invalid
  escrow, wrong chain/token/treasury/referee/fees, missing gas/key, unavailable RPC,
  mixed live/simulated batches, missing chain mappings, successful receipt,
  reverted/unconfirmed transfer, confirmed-event recovery and a failed check on
  the next live row in the same batch.
- All 11 existing payment-readiness policy tests pass. App and test TypeScript
  checks, targeted lint and static production safety checks pass.
- Build CI now runs `test:refund-safety`. No live endpoint, key, transaction or
  production database was used for these tests.

## Operating boundary

This closes the configuration-to-simulation fallback; it is not a full audit of
the existing refund/reconciliation system. The expiry endpoint remains a cron-
authenticated batch of up to 50 expired `AWAITING_CLAIM` records. Do not invoke it
as a targeted rehearsal if unrelated records would be affected. Proof rejection
alone does not establish refund eligibility. Existing legacy funding records
still need separate receipt/chain reconciliation.

Mainnet code is still absent at the configured bounty address. Human deployment,
verified runtime cutover, an actual payout and supported refund, and the other
controlled-launch gates remain required. Confirmed roles and the rehearsal caps
are in the [cutover runbook](../runbooks/mainnet-cutover.md).

If configuration drifts after launch, keep funding and refund execution blocked
until corrected. Do not restore simulated settlement for live records as a
rollback. No migration, Solidity, fee policy or production configuration change
is included.
