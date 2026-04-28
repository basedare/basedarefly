# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Build the first read-only Venue Scout Command Center from the MapiLeads learning.

### Plan
- [x] Inspect existing scout, venue-report lead, venue memory, and admin auth surfaces.
- [x] Add a protected venue scout command report API backed by existing Prisma models.
- [x] Add an admin page with ranked venue leads, route clusters, outreach copy, and seed venues.
- [x] Verify with targeted lint/build checks and rebuild graphify.

### Verification
- [x] Targeted lint/type check for touched files
- [x] `npm run build`
- [x] `npm run safety:static`
- [x] `npm run safety:rls`
- [x] Graphify rebuild

### Review
- Outcome: Added a protected read-only Venue Scout Command Center with scored venue leads, route clusters, copy-ready outreach, starter dare suggestions, and seed venues.
- Follow-ups: Decide whether scout command should later gain admin-approved send/schedule actions or stay copy-ready only.

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
