# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Turn BaseDare strategy work into actual deck slide copy and a founder operating memo.

### Plan
- [x] Review the investor memo and financial model for the strongest narrative and economic truths.
- [ ] Write actual investor deck slide copy.
- [ ] Write a short founder operating memo focused on monetization discipline.
- [ ] Verify the new docs and summarize what is ready.

### Verification
- [ ] Build / lint / test
- [ ] Logs or API check
- [ ] UI or behavior check

### Review
- Outcome:
- Follow-ups:

## High Priority (MVP Completion)
- [x] **Complete Dare Creation Flow**: Connected `app/create/page.tsx` directly to Wagmi, added `/api/bounties/register` for verification, and saved to Prisma.
- [ ] **Escrow & Payout Logic**: Implement TruthOracle voting trigger to call `releaseBounty` or `refundBounty` on the smart contract.

## Medium Priority
- [ ] End-to-end testing using Hyperbrowser scripts.
- [ ] Refine error handling and loading states across all API routes.

## Completed
- [x] Proof Upload & IPFS Storage Flow.
- [x] Testnet Contract Deployment (Priority #1.5).
