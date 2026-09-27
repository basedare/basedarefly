# Production database recovery — 27 September 2026

## Incident and recovery

The revenue-delivery application expected `Dare.contentSubmittedAt`, but production
had not applied `20260921100000_content_rights_acceptance`. Prisma full-row reads
failed before the retry-payouts and refund-expired jobs could process any items.
Successful application deployment did not establish database compatibility.

Production migration history showed exactly this one pending migration. The entire
reviewed additive migration was applied with Prisma migrate deploy. Full Dare reads
and ContentRightsAcceptance reads then succeeded. The new table has RLS enabled,
the immutability trigger exists, and anon/authenticated do not have the checked
read/write privileges. Content commissioning remains gated pending terms review.

Before recovery, the PENDING_PAYOUT, AWAITING_CLAIM and PENDING_REFUND queues were
empty. Following recovery, both production cron endpoints returned HTTP 200,
success true and processed 0. No payment, refund or new paid mission was initiated.
This does not reconcile every historical escrow or prove a complete paid delivery.

## Release prevention

Both production build commands run a read-only database gate before Next.js builds.
It requires every repository migration to have completed, rejects unresolved
migration failures, and checks that every generated Prisma model's scalar/enum
columns exist. It checks mapped database names and ignores relation pseudo-fields.
Local/preview builds skip the automatic production gate; `npm run safety:database`
checks an explicit target in any environment. Missing credentials, unavailable DB,
missing schema or a timeout block production builds. No migration runs automatically.

The check uses a read-only transaction and prints no database credentials. It checks
presence and migration completion, not historical migration checksums, every SQL
type/default/index/policy or functional payment behavior. One historical migration
(`20260722120000_add_sprint_buyer_wallet`) has a checksum different from the local
file; no history was rewritten or migration replayed during this recovery.

Cron fatal alerts classify Prisma missing-table/column errors as DATABASE_SCHEMA_ERROR.
Other fatal job errors use CRON_FAILED; specific transaction errors keep their
existing per-item labels. No settlement or financial policy changed.

## Deployment and next acceptance

Apply reviewed additive migrations to the intended DB, run the database gate, then
deploy. If the gate fails, keep the current production deployment and reconcile the
reported schema problem; do not bypass the check or reset production. After release,
verify job results and inspect queues before retrying paid work. Do not undo this
additive migration on an application rollback: later rights records must survive.

Remaining commercial acceptance: reviewed usage terms; a named buyer, contributor,
venue, deliverable and budget; one funded delivery with actual notification receipt
on physical phones; recorded cash, payouts, operator time and any revisions/refunds.
The existing poster intake also still needs ongoing sourced event coverage.

The production safety endpoint additionally reports one money-rail blocker:
production selects Base mainnet while the configured bounty is the documented
Sepolia V2 address `0xF176ec205e5E5777F6B5964bfeD6DE5a57a911E3`. Independent public
RPC reads confirmed mainnet chain ID 8453 with no code there and Sepolia chain ID
84532 with 3,877 bytes at that address. Production also has 33 records marked
FUNDING; these were not relabelled or deleted and require historical chain
reconciliation. `docs/runbooks/mainnet-cutover.md` requires a human-signed V2
deployment before runtime cutover. No contract, wallet or network setting was
changed here. The missing venue QR secret and physical-phone acceptance remain
separate readiness items.
