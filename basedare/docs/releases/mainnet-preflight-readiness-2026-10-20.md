# Reliable mainnet preparation — 20 October 2026

## Result

The highest remaining launch blocker is the undeployed production escrow. This release repairs the read-only preparation path and closes false-green checks; it does not deploy a contract or enable paid participation.

Both operator scripts now use a bounded, read-only RPC provider. It supports explicit IPv4/IPv6 selection, validates response IDs, rejects non-read methods and redirects, redacts provider failures and closes connections on exit. The application and human signing transport are unchanged.

Preflight now requires explicit owner, treasury and referee addresses, checks referee separation from both other roles, verifies the deployed owner as well as USDC/roles/4–0–4 fees, and blocks critical RPC failures and missing/invalid simulation flags. It no longer presents a referee key as evidence of deployer readiness. `--post-deploy` blocks a missing deployed address. Shell/local configuration checks do not establish Vercel's runtime settings or secret configuration.

Unsigned plans record a timestamp, observed block and shortfall against the existing 0.005 ETH deployer reserve. A generated plan is not permission to deploy. The reserve is an operational guard, not a deployment fee quote. A predicted contract address is not deployed bytecode.

## Verification

- Standard compilation succeeds. All 19 existing contract tests pass, including 96/4 settlement, original-backer refunds, unauthorized access and double-processing checks.
- Coverage succeeds: V2 line coverage 93.18%, branches 60.87%; aggregate lines 66.39% includes the uncovered legacy Protocol. This is not an independent audit or complete coverage.
- All 19 new operator checks pass using actual local HTTP fixtures and CLI subprocesses. Negative cases cover wrong owner/token/roles/fees/chain, absent escrow/address, invalid simulation flags, stalled connections, mismatched RPC IDs, malformed results, secret-echoing failures, redirects and attempted signing/transaction methods. The unsigned-plan fixture uses the compiled V2 artifact and records only reads.
- Standard artifacts were recompiled after coverage; their V2 creation-bytecode hash matches the unsigned candidate plan. Generated build/coverage side effects were removed from the proposed change.
- On the audited Mac, explicit IPv4 restored read-only preparation against Base's public RPC. A separate keyless Hardhat `eth_chainId` read succeeded with the documented Node network flags. Neither check loaded a signer or broadcast a transaction.
- Live post-deploy preflight correctly exits 1 at the configured escrow's missing mainnet bytecode. The public payment-readiness endpoint remains false. No approval, deposit, proof, payout or refund was attempted.

Contracts CI runs the new regression command after compilation and before coverage. No Solidity, schema, runtime environment, funding split or application UI change is included.

## Remaining gate

Follow the [cutover runbook](../runbooks/mainnet-cutover.md). The founder confirmed the owner/deployer, fee treasury and dedicated referee on 20 October. Under the founder's delegated budget decision, the rehearsal is capped at 10 USDC funding (one 5 USDC payout case and one 5 USDC refund case) and 0.001 ETH total gas across deployment, referee setup and both cases. Stop if refreshed estimates exceed that cap. No funds have been allocated or moved; role confirmation and the budget decision do not authorize a transaction.

The deployer must satisfy the unchanged 0.005 ETH reserve, which is a balance requirement separate from the gas-spend cap. Refresh the plan immediately before signing because nonce and fees can change. A refund case must use the supported expiry conditions; proof rejection alone does not create refund eligibility. The expiry endpoint processes a batch, so do not call it as a targeted rehearsal if any unrelated record would be processed.

Only the human operator signs deployment and referee setup. Verify the deployed code, owner, USDC, treasury, referee and fee metadata before changing runtime/CI configuration. Then prove a real payout and supported refund, reconcile the receipts, and complete device recovery, email/push/QR and operating-owner checks before full paid launch. Do not reinterpret this tooling release as launch approval.

## Rollback

No contract or database rollback is necessary for these operator-only changes. If a transport/provider regression appears, keep funding gated, stop the operator command and inspect its bounded error; do not restore a fail-open preflight or change production configuration to make it pass.
