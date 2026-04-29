# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Add durable Founder Scoreboard event instrumentation so growth/money decisions are based on real transition history, not only current-row snapshots.

### Plan
- [x] Add a locked-down `FounderEvent` ledger table with dedupe keys and venue linkage.
- [x] Persist dare creation, funding, proof submission, settlement, payout queue, refund, failure, and venue check-in events.
- [x] Make the admin Founder Scoreboard prefer durable events while falling back to synthesized events if the migration is not applied yet.
- [x] Verify Prisma generation, static safety, production build, RLS coverage, production dependency audit, and Graphify rebuild.

### Verification
- [x] `npx prisma generate`
- [x] `npm run safety:static`
- [x] `npm run build`
- [x] `npm run safety:rls` (passes, warns `FounderEvent` table is not present until the migration is applied)
- [x] `npm audit --omit=dev --audit-level=high`
- [x] Graphify rebuild

### Review
- Outcome: Founder Scoreboard now has a durable event ledger for the core money/proof/place loop, and the pending Prisma migrations have been applied to the configured Supabase database.
- Follow-ups: Keep the full security-audit and repo-wide lint follow-ups from the previous money-rails hardening pass; both are unrelated to this instrumentation slice.

## High Priority (MVP Completion)
- [x] **Complete Dare Creation Flow**: Connected `app/create/page.tsx` directly to Wagmi, added `/api/bounties/register` for verification, and saved to Prisma.
- [x] **Money Rails Hardening**: Productionize scheduled payout retry + expired refund runs, alert on failures, and add a short operator runbook for simulation mode vs real mode.
- [x] **Sentinel Phase 1**: Creator toggle, manual review flagging, Telegram ping, Sentinel queue controls, and badges are present without expanding into full zkML yet.
- [x] **Founder Scoreboard**: Instrument creation, funding, verification, payout, refund, and venue check-in events so we can track settled GMV, realized revenue, and venue utility.
- [ ] **Map Productization**: Add clustering, stronger pin hierarchy, and tighter mobile UX polish to the venue map.

## Medium Priority
- [ ] PWA installability after money rails are stable.
- [ ] End-to-end testing using Hyperbrowser scripts.
- [ ] Refine error handling and loading states across all API routes.

## Completed
- [x] Proof Upload & IPFS Storage Flow.
- [x] Testnet Contract Deployment (Priority #1.5).
