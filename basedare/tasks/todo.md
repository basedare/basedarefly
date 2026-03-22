# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Ship the first PlaceTag foundation: schema + API + basic place-memory signals, without breaking pages before the DB migration is applied.

### Plan
- [x] Inspect current schema, auth, upload, and venue/place data flow for the cleanest PlaceTag insertion point.
- [x] Add PlaceTag to Prisma schema and create a targeted migration.
- [x] Implement the first place-tag submission API with auth, validation, and pending-review behavior.
- [x] Expose basic approved-tag signals on place data surfaces for future UI use.
- [x] Verify the new schema/API foundation and summarize what is ready.

### Verification
- [x] `npx prisma generate`
- [x] Targeted `eslint` on the touched schema/API/UI files
- [x] `npm run build`

### Review
- Outcome: Added the first PlaceTag foundation with a migration, a real `/api/places/:id/tags` submission route, shared media upload helper, and visible marks/heat signals on place surfaces.
- Follow-ups: Apply the DB migration, build the first review queue for pending tags, then add a real `Tag this place` UI flow on place pages.

## High Priority (MVP Completion)
- [x] **Complete Dare Creation Flow**: Connected `app/create/page.tsx` directly to Wagmi, added `/api/bounties/register` for verification, and saved to Prisma.
- [ ] **Escrow & Payout Logic**: Implement TruthOracle voting trigger to call `releaseBounty` or `refundBounty` on the smart contract.

## Medium Priority
- [ ] End-to-end testing using Hyperbrowser scripts.
- [ ] Refine error handling and loading states across all API routes.

## Completed
- [x] Proof Upload & IPFS Storage Flow.
- [x] Testnet Contract Deployment (Priority #1.5).
