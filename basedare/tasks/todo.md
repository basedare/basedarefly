# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Add a read-only Daily Command Loop for BaseDare Brain.

### Plan
- [x] Inspect Brain docs, admin auth, moderation, lead, claim, campaign, and place-memory surfaces.
- [x] Add a protected read-only command-loop API backed by existing Prisma models.
- [x] Add an admin page that ranks today’s actions by trust, money, growth, and market signal.
- [x] Verify with targeted lint/build checks and rebuild graphify.

### Verification
- [x] Targeted lint/type check for the new command-loop files
- [x] `npm run build`
- [x] Graphify rebuild

### Review
- Outcome: Added a protected read-only Daily Command Loop that ranks today’s trust, money, growth, and market actions from existing operational signals.
- Follow-ups: Decide whether the loop should later persist daily snapshots or stay generated-on-read.

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
