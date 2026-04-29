# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Let users leave verified place marks directly from public venue pages instead of forcing the action through the map sheet.

### Plan
- [x] Reuse the existing `TagPlaceButton` composer with a configurable label.
- [x] Add a primary `Leave mark` CTA to the venue hero next-move card.
- [x] Add a `Leave first mark` CTA to the empty venue logbook state.
- [x] Verify production build, static safety, and Graphify rebuild.

### Verification
- [x] `npm run build`
- [x] `npm run safety:static`
- [x] Graphify rebuild

### Review
- Outcome: Production build and static safety pass. Venue pages now expose the core place-memory action directly.
- Follow-ups: Next venue ROI is making successful mark submissions refresh the public venue timeline without a full page reload.

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
