# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# IMPORTANT: Keep concise (under 200 lines). For deep logic, use `.claude/rules/`.

## Project Overview
BaseDare: A decentralized bounty platform on Base L2. Verified human performance (challenges/dares) meets community funding via ZKML/Livepeer verification and on-chain USDC payouts. NOT gambling - backers fund specific challenges, creators earn rewards for completion.

## Commands
```bash
# Agentic Workflow (2026 Standard)
# Logic: Iterates on TASK*.md. Cap at 20 turns + sleep to prevent runaway token burn.
# Note: Add to package.json or run manually as shell alias
npm run ralph        # while true; do claude -p "Execute next unchecked step in TASK*.md, run tests, fix errors. Cap at 20 iterations max."; sleep 10; done

# Development & Build
npm run dev          # Start dev server (webpack)
npm run dev:turbo    # Start dev server (turbo)
npm run build        # Production build
npm run lint         # ESLint

# Smart Contracts (Hardhat)
npx hardhat compile                      # Compile contracts
npx hardhat test                         # Run contract tests
npx hardhat run scripts/deploy.js --network base-sepolia

# Prisma & Database
npx prisma generate && npx prisma db push   # Sync schema to SQLite
npx prisma studio                            # Visual DB editor
```

## Key Files
- `contracts/BaseDareBounty.sol` - Main escrow (fund/payout/refund)
- `lib/contracts.ts` - Viem clients (NEVER import in client components)
- `hooks/useBountyFund.ts` - Client-side bounty funding flow
- `app/api/verify-proof/route.ts` - AI Referee endpoint
- `components/Providers.tsx` - Wagmi/OnchainKit/TanStack Query setup

## Rules
- **Architecture**: See `.claude/rules/architecture.md` - frontend patterns, contract interaction, component organization, state management, API conventions
- **Security**: See `.claude/rules/security.md` - mandatory Zod validation, nonReentrant guards, private key handling, address validation
