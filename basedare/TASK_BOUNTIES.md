# TASK: Implement Live Bounties Creation Backend
**Status:** ✅ COMPLETE
**Context:** - Protect frontend design.
- Use `getWalletClient()` for server-side contract writes.
- **Pre-flight Check:** Run `check_referee_status` skill to verify `.env.local` keys (REFEREE_PRIVATE_KEY, LIVEPEER_API_KEY) and wallet balances (Base Sepolia ETH/USDC) before coding.
- **Architecture:** Keep logic in `app/api/bounties/create/route.ts`.

**Safety:** Max 15 iterations. Stop if verification fails twice.

## 🎯 Acceptance Criteria
- [x] **Validation:** Create API route with Zod schema for `{ title: string, amount: number, streamId: string }`.
- [x] **Livepeer Integration:** Use `Livepeer` SDK to verify `streamId` is active and healthy.
- [x] **Contract Execution:** Implement `stakeBounty()` call to `BaseDareBounty.sol` using the server-side `REFEREE_PRIVATE_KEY`.
- [x] **USDC Logic:** Verify/Handle USDC allowance for the Referee wallet to ensure the stake doesn't revert.
- [x] **Response:** Return JSON with `{ success: true, txHash: string }` and log the payout trail.
- [x] **Security Audit:** Confirm `REFEREE_PRIVATE_KEY` is not present in any client-bundle (check for "use client" leaks).

## 🧪 Success Command
# Using the Smart Ralph Alias
ralph