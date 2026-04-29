# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Keep admin-secret fallback sessions alive across Admin ops pages without exposing secrets in URLs or permanent storage.

### Plan
- [x] Add a shared session-only admin secret hook backed by `sessionStorage`.
- [x] Wire the hook into Daily Command Loop, Admin Dashboard, Founder Scoreboard, Production Safety, Venue Scout Command, and Appeals.
- [x] Add visible session-only copy plus a manual forget action.
- [x] Verify production build, static safety, and Graphify rebuild.

### Verification
- [x] `npm run build`
- [x] `npm run safety:static`
- [x] Graphify rebuild

### Review
- Outcome: Production build and static safety pass. Admin-secret fallback now survives admin ops navigation in the same browser tab without leaking into URLs.
- Follow-ups: If this becomes a frequent solo-founder flow, consider replacing manual admin-secret fallback with a short-lived signed admin session cookie.

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
