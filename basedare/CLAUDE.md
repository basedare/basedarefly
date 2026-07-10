# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# IMPORTANT: Keep concise (under 200 lines). For deep logic, use `.claude/rules/`.

## Project Overview
BaseDare is a remote, bounty-funded discovery network: safe dares pay contributors for verified place intelligence, which compounds into place memory and receipts. Base L2 and USDC provide settlement. Read `docs/PHILOSOPHY.md` and `brain-vault/00-control/vision.md` as one aligned canon before product work.

## Active User Assignment
Codex completed the remote-proof Phase 1–2 closure locally after Claude hit its usage limit. Read the closure entry in `AGENTS.md` before inspection; nothing is staged, committed, migrated, or deployed. Coordinate before editing the still-dirty handoff files. Phase 3 remains paused pending human legal review.

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

## RTK
Use `rtk` for broad codebase inspection to avoid flooding context:
`rtk rg`, `rtk grep`, `rtk find`, `rtk ls`, `rtk git diff`.
Use normal commands for builds, tests, deployments, migrations, commits, pushes, and exact targeted file ranges (sed/Read after locating code).

## Rules
- **Architecture**: See `.claude/rules/architecture.md` - frontend patterns, contract interaction, component organization, state management, API conventions
- **Security**: See `.claude/rules/security.md` - mandatory Zod validation, nonReentrant guards, private key handling, address validation
