# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Fix the desktop notifications bell dropdown and upgrade it to a slick liquid-glass summary surface.

### Plan
- [x] Portal the notifications dropdown out of the glass navbar so desktop clicks are not clipped.
- [x] Add a visible summary area for live actions, unread alerts, push state, and the next best item.
- [x] Preserve the mobile full-height scrollable panel.
- [x] Verify with targeted lint/type checks, production build, and graphify rebuild.

### Verification
- [x] Targeted lint/type check for touched files
- [x] `npm run build`
- [x] Graphify rebuild

### Review
- Outcome: Desktop bell now opens a body-portaled liquid-glass dropdown with a summary header instead of being hidden inside the navbar glass container.
- Follow-ups: Browser-smoke the bell on production after deploy with a connected wallet.

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
