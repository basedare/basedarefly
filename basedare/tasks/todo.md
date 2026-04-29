# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Show user-selected creator profile pictures in the Active Creators grid instead of falling back to initials.

### Plan
- [x] Include creator avatar URL and crop fields in `/api/creators`.
- [x] Render uploaded profile photos before static fallback images or initials.
- [x] Preserve saved avatar scale and offset on the grid card.
- [x] Verify with targeted lint/type checks, production build, and graphify rebuild.

### Verification
- [x] Targeted lint/type check for touched files
- [x] `npm run build`
- [x] Graphify rebuild

### Review
- Outcome: Active Creators now uses the selected creator profile photo when available, with the same crop framing used on creator profiles.
- Follow-ups: Browser-smoke `/creators` after deploy using `lizardlarry7` as the check case.

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
