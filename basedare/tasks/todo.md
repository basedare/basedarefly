# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Upgrade public venue pages so map traffic lands on a live place-memory destination with clear proof, lift, creator routing, and Secure Handshake context.

### Plan
- [x] Add a mobile-visible place-memory command band near the top of venue pages.
- [x] Surface current pulse, seven-day lift, repeat-activation insight, and memory sparkline from existing venue data.
- [x] Surface best creator route and Secure Handshake readiness without adding new backend dependencies.
- [x] Verify production build, static safety, and Graphify rebuild.

### Verification
- [x] `npm run build`
- [x] `npm run safety:static`
- [x] Graphify rebuild

### Review
- Outcome: Venue pages now expose the venue memory and creator-routing story much earlier in the page.
- Follow-ups: Next venue ROI is turning the logbook into a richer proof/reward timeline with completed-dare moments, not just approved marks.

## High Priority (MVP Completion)
- [x] **Complete Dare Creation Flow**: Connected `app/create/page.tsx` directly to Wagmi, added `/api/bounties/register` for verification, and saved to Prisma.
- [x] **Money Rails Hardening**: Productionize scheduled payout retry + expired refund runs, alert on failures, and add a short operator runbook for simulation mode vs real mode.
- [x] **Sentinel Phase 1**: Creator toggle, manual review flagging, Telegram ping, Sentinel queue controls, and badges are present without expanding into full zkML yet.
- [x] **Founder Scoreboard**: Instrument creation, funding, verification, payout, refund, and venue check-in events so we can track settled GMV, realized revenue, and venue utility.
- [x] **Map Productization**: Add clustering, stronger pin hierarchy, a signal rail, verified/open/matched filters, and tighter mobile UX polish to the venue map.

## Medium Priority
- [ ] PWA installability after money rails are stable.
- [ ] End-to-end testing using Hyperbrowser scripts.
- [ ] Refine error handling and loading states across all API routes.

## Completed
- [x] Proof Upload & IPFS Storage Flow.
- [x] Testnet Contract Deployment (Priority #1.5).
