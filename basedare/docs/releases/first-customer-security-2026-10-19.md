# First-customer operation and dependency hardening — 19 October

## Result

The founder asked for active onboarding, business launch and millions in revenue within a year. This change removes the previously reported high production dependency chain, strengthens the CI gate, and prepares a deduplicated first outreach batch with exact messages. It does not claim a customer, recruited participant, funded campaign or launched mainnet payment rail.

## Dependency repair

`@prisma/config` resolves `deepmerge-ts` 8.0.0 through a scoped override. The lockfile changes one installed package; Prisma/client remain 6.19.3. The [upstream advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) describes recursion/stack exhaustion on cyclic inputs, fixed in 8.0.0. [Release notes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0) also change Map and mutation behavior, so this is a tested compatibility override, not an assertion that all future Prisma configs are compatible.

The actual current config uses plain records/strings for schema and migration seed. `test:prisma-config` resolves Prisma's own transitive merger, exercises the recursive-input regression and nested record merge, and loads the checked-in configuration to verify schema/seed preservation. It does not connect to a database. The real CLI validates/generates, and disposable database integration exercises the resulting client/config.

Local `npm audit --omit=dev`: **0 critical, 0 high, 32 moderate**. The three earlier high entries (`deepmerge-ts`, `@prisma/config`, `prisma`) disappear from the production audit; no major Prisma migration or database schema change. Moderate findings still require their own triage; this is not a clean audit or independent penetration test.

CI now fails on `--audit-level=high` rather than only critical, and runs the config regression before database integration. No safety gate is weakened.

## Commercial operation

- [Revenue operating plan](../gtm/first-revenue-operating-plan-2026-10-19.md) distinguishes service sales, reward pass-through, fees and financing. A $2m service-line scenario needs 1,000 full-price Sprints and exposes fulfilment capacity; it is not a forecast or approved spend.
- [Exact first email batch](../../brain-vault/02-outreach/drafts/siargao-first-customer-batch-2026-10-19.md) contains four personalized business invitations. [Queue CSV](../../brain-vault/02-outreach/drafts/siargao-first-customer-queue-2026-10-19.csv) has six deduplicated prospects: four draft emails, two needing appropriate contact routes. Existing Harana lead updated rather than duplicated.
- Brain control notes now reflect the founder's Siargao-first instruction and mark older readiness snapshots as historical. Existing product canon, prices, financial split and consent rules remain.
- Gmail/Outlook connections were surfaced, but no sending account was confirmed at preparation. Before sending, check actual sent mail/opt-outs; save provider IDs after success. No email, DM, form submission, public post or follow-up was sent by this change. No enrolment or actual reply is inferred from a list or draft.

## Verification

Production app build, Prisma schema validation, client generation, config regression, targeted lint, 55 discovery checks, 22 revenue checks, disposable buyer/creator/claim/upload/review/appeal/simulated settlement and Passport migration/RLS integration pass locally. Tests use isolated databases and outbound notification credentials are disabled. Fixture receipts remain simulated evidence.

Dependency files were tested in a separate installation, leaving the earlier shared installation untouched. No public-interface/material redesign or new application feature. Standard CI and preview must pass before merge; production is complete only after the matching deployment is READY and public reads succeed.

## Launch gates and rollback

The configured Base mainnet bounty remains undeployed as established in the [previous readiness record](launch-funding-pilot-2026-10-19.md). Human-signed guarded deployment, token/role/fee validation, runtime cutover and real payout/refund remain required. Budget, legal operator/support owners, reviewed rights where applicable and physical-device recovery/push/QR checks remain unresolved. No configuration, contract, customer, treasury or production-admin mutation here.

If config loading, migration/client generation or runtime reads regress, roll back this app release, preserve all database records and deployment receipts, and restore the previous dependency lock only through an explicit reviewed security response. A return to the vulnerable dependency is not a clean rollback. Keep paid funding blocked until the underlying launch gates are satisfied.
