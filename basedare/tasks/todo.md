# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Surface place-memory moderation pressure inside the Daily Command Loop so overdue venue marks become an operator priority.

### Plan
- [x] Add shared place-tag review SLA helpers used by venue pages, admin inbox, and the Daily Command Loop.
- [x] Extend the Daily Command Loop report with pending, overdue, due-soon, first-mark, and oldest place-mark pressure.
- [x] Add a place-memory review pressure card to the Daily Command Loop UI.
- [x] Promote overdue place marks into command stack, review queue, scorecard, learnings, and watchouts.
- [x] Verify production build, static safety, and Graphify rebuild.

### Verification
- [x] `npm run build`
- [x] `npm run safety:static`
- [x] Graphify rebuild

### Review
- Outcome: Production build and static safety pass. The Daily Command Loop now sees venue mark SLA pressure instead of only a raw pending count.
- Follow-ups: Next ROI is a direct deep link from Daily Command Loop into the Chaos Inbox tab once admin routing supports tab params.

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
