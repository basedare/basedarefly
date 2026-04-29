# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Replace repeated raw admin-secret fetches with a short-lived HttpOnly admin session.

### Plan
- [x] Add a signed admin session cookie accepted by shared admin authorization.
- [x] Add `/api/admin/session` to create and clear the HttpOnly admin session after validating `ADMIN_SECRET`.
- [x] Update admin ops pages to use the secret once, then rely on the cookie instead of sending `x-admin-secret` on every request.
- [x] Keep a visible manual forget action and update static safety allowlisting for the intentionally different session route.
- [x] Verify production build, static safety, and Graphify rebuild.

### Verification
- [x] `npm run build`
- [x] `npm run safety:static`
- [x] Graphify rebuild

### Review
- Outcome: Production build and static safety pass. Admin-secret fallback now creates a signed HttpOnly session cookie and stops sending the raw secret on admin API calls.
- Follow-ups: Add a visible expiry/refresh indicator if the 4-hour session timeout becomes confusing during longer ops sessions.

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
