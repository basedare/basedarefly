# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Refresh the FAQ so it matches the current BaseDare MVP while keeping the Peebear voice.

### Plan
- [x] Review the current FAQ and identify outdated or missing product areas.
- [x] Rewrite the FAQ list with updated verify, IRL, venue, and QR answers.
- [x] Verify the updated FAQ page still builds cleanly.

### Verification
- [x] Build / lint / test
- [ ] Logs or API check
- [ ] UI or behavior check

### Review
- Outcome: FAQ now matches the current BaseDare MVP more closely while keeping Peebear's tone.
- Follow-ups: Visual review live, then commit and push with the waitlist copy tweak if approved.

## High Priority (MVP Completion)
- [x] **Complete Dare Creation Flow**: Connected `app/create/page.tsx` directly to Wagmi, added `/api/bounties/register` for verification, and saved to Prisma.
- [ ] **Escrow & Payout Logic**: Implement TruthOracle voting trigger to call `releaseBounty` or `refundBounty` on the smart contract.

## Medium Priority
- [ ] End-to-end testing using Hyperbrowser scripts.
- [ ] Refine error handling and loading states across all API routes.

## Completed
- [x] Proof Upload & IPFS Storage Flow.
- [x] Testnet Contract Deployment (Priority #1.5).
