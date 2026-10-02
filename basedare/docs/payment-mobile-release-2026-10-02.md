# Payment guard and mobile stability — 2026-10-02

## Changes

Fresh payment readiness checks verify the RPC chain, canonical USDC, deployed escrow/token code, token precision, platform/referee identities, 96/4 fees and referee gas before initialization or approval. Browser writes specify the expected chain and approve only the requested amount. Live generic paid creation cannot silently create simulated work or spend the referee wallet. Open content funding remains unavailable through this targeted escrow path.

Registration verifies receipt success, escrow event ID/backer/amount and active escrow recipient. Compare-and-set and idempotent retries preserve later mission states. A broadcast hash survives registration failure; return/focus recovery retries registration only, never a second payment. Reconciliation requires exact identities/amount and transaction evidence. V2 source prevents funded IDs from being reused after payout or refund.

The mission tray excludes simulated and stale requests, refreshes on return, ignores stale responses and shows USDC rather than an unrelated fixed BaseCash peso estimate. Only approved public adventure submissions receive PeeBear head map pins.

The mobile orb uses the existing calm/burst artwork with circular clipping, opacity and transform; there is no video decoder. Hidden desktop hero effects do not mount on mobile. Orb/conveyor pause offscreen, hidden and under reduced motion. Node background cleans up its animation loop. Lightning retains its original shader in short bursts, caps mobile rendering at 160,000 pixels/24 fps (desktop 600,000/30), and stops further strikes after repeated slow frames. No canvas is mounted between strikes.

## Evidence

- Payment readiness: 11 tests covering valid configuration and wrong chain/token/fees/roles, unavailable RPC, absent code and missing referee gas.
- Wallet-flow harness: unavailable/drifted/wrong-chain configuration causes no writes; approval/funding reverts stop; exact allowance; timeout preserves hash and retries registration without paying twice.
- Contract suite: 19 passing tests, including permanent ID use, failed funding rollback, authorization and escrow isolation. V2 coverage: 93.18% lines, 60.87% branches; this is not a complete independent audit.
- Disposable PostgreSQL + local EVM integration exercises the actual registration route, concurrent registration, single notification, exact 96/4 payout, wrong evidence rejection, full refund and post-settlement retry without reopening work. No production funds used.
- Typechecks, targeted lint (zero errors), static safety and production build. Graph regenerated.
- Local production build inspected in actual desktop Brave with a 390×844 mobile viewport and 4× CPU throttling: round orb, no video/hidden canvas, no horizontal overflow, offscreen/reduced-motion pause. Emulation is not a physical-phone performance guarantee. Local database/auth data is unavailable in the visual preview; this is not a complete authenticated production journey.

## Production blockers and next operation

Read-only production inspection still finds no bytecode on Base mainnet at configured escrow 0xF176ec205e5E5777F6B5964bfeD6DE5a57a911E3. Paid launch remains blocked. There are 33 unresolved non-simulated FUNDING rows with no stored funding hash. Their IDs are empty at the known Sepolia V2 address; this does not prove there were never historical settlements or transactions elsewhere. No rows were relabelled or deleted.

The human operator must follow docs/runbooks/mainnet-cutover.md to deploy the corrected V2 source with confirmed treasury/referee roles, update production configuration and rerun preflight. Then prove one real low-value funding → acceptance → proof → review → payout transaction and a separate failure/refund recovery. Phone notifications and commercial content-rights legal approval remain separate gates. This app release does not certify those steps.

## Release and rollback

No database schema migration or production data mutation. Push the combined app/source changes to main, verify CI/deployment and confirm the public readiness endpoint remains safely unavailable until cutover. Never bypass the guard merely to make it green.

If visual regressions occur, revert only the visual component changes while keeping payment guards. If a payment regression is observed after future cutover, disable paid creation immediately and investigate stored hashes/escrow evidence; do not erase pending records or ask users to pay again. Solidity source rollback cannot change a deployed contract; no contract is deployed in this release.
