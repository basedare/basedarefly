# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Tighten the homepage, Creator Pool, notifications, dare detail, and map venue action UI polish.

### Plan
- [x] Stop the homepage `INITIATE` jelly button from expanding on hover.
- [x] Replace the Creator Pool popup top grey bar with a proper glass edge.
- [x] Keep desktop notification dropdown reads silent instead of prompting Coinbase signing.
- [x] Improve dare detail title contrast against creator-tag backgrounds.
- [x] Replace map venue action buttons with shared jelly buttons.
- [x] Verify with targeted lint/type checks, production build, and graphify rebuild.

### Verification
- [x] Targeted lint/type check for touched files
- [x] `npm run build`
- [x] Graphify rebuild

### Review
- Outcome: Shared UI primitives now support stable homepage hover, venue actions use the jelly system, and notification dropdown opens without forcing wallet signing.
- Follow-ups: Browser-smoke `/`, `/map`, and a live dare detail URL after deploy.

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
