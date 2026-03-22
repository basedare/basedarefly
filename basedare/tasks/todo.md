# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Ship the first PlaceTag review queue so pending marks can actually become approved place memory.

### Plan
- [x] Inspect existing admin auth/routes/page patterns and the current PlaceTag schema.
- [x] Add admin API routes to list pending tags and approve/reject/flag them.
- [x] Add a minimal admin review UI for pending place tags with proof preview and actions.
- [x] Verify the queue flow locally with lint/build.

### Verification
- [x] Targeted `eslint` on the new admin API + admin page + place tag route
- [x] `npm run build`

### Review
- Outcome: Added the first PlaceTag review queue under `/api/admin/place-tags` and the admin dashboard "Chaos Inbox" tab so pending marks can be approved, rejected, or flagged.
- Follow-ups: Dogfood with a few pending tags, then add the public `Tag this place` submission UI and derive `Crossed Paths`, `Last Spark`, and `Pulse` from approved tags.

## High Priority (MVP Completion)
- [x] **Complete Dare Creation Flow**: Connected `app/create/page.tsx` directly to Wagmi, added `/api/bounties/register` for verification, and saved to Prisma.
- [ ] **Escrow & Payout Logic**: Implement TruthOracle voting trigger to call `releaseBounty` or `refundBounty` on the smart contract.

## Medium Priority
- [ ] End-to-end testing using Hyperbrowser scripts.
- [ ] Refine error handling and loading states across all API routes.

## Completed
- [x] Proof Upload & IPFS Storage Flow.
- [x] Testnet Contract Deployment (Priority #1.5).
