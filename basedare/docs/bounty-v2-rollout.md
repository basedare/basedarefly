# BaseDare Bounty V2 Rollout

Prepared contract:
- `contracts/BaseDareBountyV2.sol`

Intended fee split:
- `96%` creator/completer
- `4%` platform
- `0%` referral for now

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

## App Follow-Up Before Cutover

Before switching runtime to V2, update app-side payout messaging/constants to match the new split:
- `lib/dare-approval.ts`
- `app/api/verify-proof/route.ts`
- Telegram payout summaries
- any creator-facing fee copy

This prep pass does **not** switch the live runtime split yet.
