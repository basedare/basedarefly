# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Turn BaseDare monetization brainstorming into a reusable revenue architecture, phased roadmap, and strategy memo.

### Plan
- [x] Define the main revenue surfaces across consumer, B2B, venue, and protocol layers.
- [x] Write a revenue architecture map that separates company revenue from incentives and treasury flows.
- [x] Write a phased top-10 monetization roadmap.
- [x] Write a billion-dollar strategy memo that explains the category expansion path.

### Verification
- [x] Build / lint / test
- [ ] Logs or API check
- [ ] UI or behavior check

### Review
- Outcome: Strategy pack now covers revenue architecture, monetization roadmap, financial model, and investor memo/deck framing.
- Follow-ups: Commit and push the docs, then optionally convert the financial model into a sheet and the memo into a pitch deck.

## High Priority (MVP Completion)
- [x] **Complete Dare Creation Flow**: Connected `app/create/page.tsx` directly to Wagmi, added `/api/bounties/register` for verification, and saved to Prisma.
- [ ] **Escrow & Payout Logic**: Implement TruthOracle voting trigger to call `releaseBounty` or `refundBounty` on the smart contract.

## Medium Priority
- [ ] End-to-end testing using Hyperbrowser scripts.
- [ ] Refine error handling and loading states across all API routes.

## Completed
- [x] Proof Upload & IPFS Storage Flow.
- [x] Testnet Contract Deployment (Priority #1.5).
