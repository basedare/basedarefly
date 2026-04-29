# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Turn venue logbooks into richer proof/reward timelines that show both approved marks and completed dare moments.

### Plan
- [x] Add typed venue timeline moments to the venue detail payload.
- [x] Query completed, paid, and payout-queued venue dares alongside approved marks.
- [x] Replace the venue logbook with a mixed proof/reward timeline that links completed dare moments back to their dare page.
- [x] Verify production build, static safety, and Graphify rebuild.

### Verification
- [x] `npm run build`
- [x] `npm run safety:static`
- [x] Graphify rebuild

### Review
- Outcome: Venue logbooks now read more like place history: marks, rewards, proof media, and completed challenge links in one feed.
- Follow-ups: Next venue ROI is adding lightweight timeline filters once enough proof/reward density exists.

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
