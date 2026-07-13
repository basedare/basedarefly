# BaseDare Bounty V2 Rollout

Prepared contract:
- `contracts/BaseDareBountyV2.sol`

Current deployment state:
- Base Sepolia V2: `0xF176ec205e5E5777F6B5964bfeD6DE5a57a911E3`
- Base mainnet V2: not deployed yet

Mainnet cutover runbook:
- `docs/runbooks/mainnet-cutover.md`

Intended fee split:
- `96%` creator/completer
- `4%` platform
- `0%` referral for now
- `0%` promised to a Live Pot

Financial authority:
- `docs/FINANCIAL_CANON.md`
- `lib/financial-canon.ts`

V2 is the self-serve settlement rail. It must not collect the `$2,000`
Verified Field Sprint managed-service fee. A managed Sprint separately invoices
`$2,000` for service and funds a `$500` creator pool through V2.

Why a new contract instead of mutating the old one:
- keeps the current `89 / 10 / 1` contract available for fallback
- avoids changing live payout math for any already-created dares
- lets rollout happen by env/config switch instead of risky in-place behavior change

## Contract Compatibility

`BaseDareBountyV2` preserves the operational shape of the current bounty contract:
- `fundBounty(uint256,address,address,uint256)`
- `verifyAndPayout(uint256)`
- `refundBacker(uint256)`
- `setAIRefereeAddress(address)`

The `_referrer` argument is still accepted for compatibility, but referral payout is paused.

## Rollout Order

1. Deploy `BaseDareBountyV2`
2. Set `AI_REFEREE_ADDRESS` on the new contract
3. Verify contract on BaseScan
4. Update `NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS` in Vercel
5. Smoke test a tiny `$5` live bounty from create -> proof -> payout
6. Leave the old contract deployed for historical settlement and fallback

## Financial and App Gates Before Cutover

Before switching runtime to V2:

- contract and app tests must prove `96 / 4 / 0` and no Live Pot entitlement;
- every public creator/fee surface must match that split;
- the public buyer portal must be invoice-first and must not pretend to collect a campaign rake;
- new managed campaigns must use `0%` additional campaign rake because the service fee is collected separately;
- creator reward pools must not be counted as company revenue;
- proof-ledger and payout-lease migrations must deploy before the code that requires them;
- cold-wallet claim, proximity, trusted-media, review, payout, refund, appeal, and idempotency paths must pass production-like smoke tests;
- sponsor commercial-reuse consent requires human legal review before it is sold.

Locking these economics does **not** switch the live runtime or authorize a mainnet deployment.
