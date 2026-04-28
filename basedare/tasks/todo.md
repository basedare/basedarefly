# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Turn the Venue Scout Command Center into a safe internal operator workflow.

### Plan
- [x] Reuse the existing admin venue lead update endpoint instead of adding another mutation route.
- [x] Add assign, schedule, won, and archive controls to command-center lead cards.
- [x] Keep external outreach as copy/mailto only; no automated sending.
- [x] Verify with targeted lint/build checks and rebuild graphify.

### Verification
- [x] Targeted lint/type check for touched files
- [x] `npm run build`
- [x] `npm run safety:static`
- [x] `npm run safety:rls`
- [x] Graphify rebuild

### Review
- Outcome: Venue Scout Command now supports safe internal lead workflow actions: assign, schedule, mark won, and archive.
- Follow-ups: Decide whether the next step is admin-approved lead creation from seed venues.

## High Priority (MVP Completion)
- [x] **Complete Dare Creation Flow**: Connected `app/create/page.tsx` directly to Wagmi, added `/api/bounties/register` for verification, and saved to Prisma.
- [ ] **Money Rails Hardening**: Productionize scheduled payout retry + expired refund runs, alert on failures, and add a short operator runbook for simulation mode vs real mode.
- [ ] **Sentinel Phase 1**: Add the creator toggle, manual review flagging, Telegram ping, and Sentinel badges without expanding into full zkML yet.
- [ ] **Founder Scoreboard**: Instrument creation, funding, verification, payout, refund, and venue check-in events so we can track settled GMV, realized revenue, and venue utility.
- [ ] **Map Productization**: Add clustering, stronger pin hierarchy, and tighter mobile UX polish to the venue map.

## Medium Priority
- [ ] PWA installability after money rails are stable.
- [ ] End-to-end testing using Hyperbrowser scripts.
- [ ] Refine error handling and loading states across all API routes.

## Completed
- [x] Proof Upload & IPFS Storage Flow.
- [x] Testnet Contract Deployment (Priority #1.5).
