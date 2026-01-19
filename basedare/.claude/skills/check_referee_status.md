---
name: check_referee_status
description: Verifies that the REFEREE_PRIVATE_KEY exists in .env.local, has a Base Sepolia ETH balance for gas, and has a USDC allowance for the Bounty contract. Use this BEFORE attempting to stake a bounty.
parameters:
  - network: string (default: "base-sepolia")
---

# Skill: check_referee_status

**Command:**
```bash
npx ts-node scripts/check-referee.ts
```

**When to use:**
- Before calling `stakeBounty()` from the backend
- When debugging failed payout transactions
- To verify the Referee wallet is properly funded after deployment

**Checks performed:**
1. `REFEREE_PRIVATE_KEY` exists in `.env.local`
2. ETH balance sufficient for gas
3. USDC balance available
4. USDC allowance set for Bounty contract
