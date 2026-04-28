# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Wire Venue Scout output into the Daily Command Loop so operators see the top route, lead, and seed candidate from one daily surface.

### Plan
- [x] Add a venue scout brief to the daily command report.
- [x] Route venue follow-up commands to the Venue Scout Command Center.
- [x] Surface the top route, active lead, and seed candidate in the daily admin UI.
- [x] Verify with targeted lint/build checks and rebuild graphify.

### Verification
- [x] Targeted lint/type check for touched files
- [x] `npm run build`
- [x] `npm run safety:static`
- [x] `npm run safety:rls`
- [x] Graphify rebuild

### Review
- Outcome: Daily Command Loop now includes a venue scout brief, sends venue follow-up work to the scout cockpit, and shows the top route, lead, and seed candidate from the same daily surface.
- Follow-ups: Consider route-level bulk lead capture/import after the daily loop can direct operators to the right venue route.

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
