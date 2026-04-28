# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Add a read-only Founder Scoreboard + Outcome Ledger and feed it into the Daily Command Loop.

### Plan
- [x] Inspect Brain docs, founder memo, admin auth, dare lifecycle, campaign, and place-memory surfaces.
- [x] Add a protected read-only founder scoreboard API backed by existing Prisma models.
- [x] Add an admin page with money funnel, outcome ledger, insights, and watchouts.
- [x] Feed founder outcome signals into the Daily Command Loop.
- [x] Verify with targeted lint/build checks and rebuild graphify.

### Verification
- [x] Targeted lint/type check for the scoreboard and command-loop files
- [x] `npm run build`
- [x] Read-only DB smoke for Founder Scoreboard and Daily Command Loop aggregations
- [x] Graphify rebuild

### Review
- Outcome: Added a protected read-only Founder Scoreboard with money funnel, synthetic outcome ledger, command signal, insights/watchouts, and Daily Command Loop integration.
- Follow-ups: Decide whether founder scorecard snapshots should later persist daily instead of staying generated-on-read.

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
