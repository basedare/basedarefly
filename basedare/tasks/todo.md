# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Harden the money rails so payout retries and expired refunds are scheduled, alerting, and release-safe.

### Plan
- [x] Inspect the current payout retry and expired refund routes plus deploy config gaps.
- [x] Add a schedulable cron path for expired refunds and enable GET-trigger support for payout retries.
- [x] Add Telegram alerts for cron failures and partial-failure runs.
- [x] Add deploy-facing config/docs for cron scheduling and required env.
- [x] Verify with targeted lint and full build.

### Verification
- [x] Targeted `eslint` on the touched cron and alert files
- [x] `npm run build`

### Review
- Outcome: Added deployable cron scheduling via `vercel.json`, a dedicated `/api/cron/refund-expired` route, failure alerts for payout/refund cron runs, and a money-rails runbook.
- Follow-ups: Smoke-test the cron endpoints in the deployed environment, then move directly into Sentinel Phase 1.

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
