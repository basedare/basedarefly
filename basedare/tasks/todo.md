# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Productize the MapLibre venue map so the map becomes an actionable command surface, not only a nice basemap.

### Plan
- [x] Add a compact signal rail for live dares, hot venues, verified places, open first-mark venues, and creator matches.
- [x] Add a verified venue filter so approved places are discoverable without scanning every pin manually.
- [x] Add a selected venue command strip that tells users the next best venue action.
- [x] Improve mobile sheet and nearby-dare tray scrolling for smoother bouncy interaction.
- [x] Verify production build, static safety, and Graphify rebuild.

### Verification
- [x] `npm run build`
- [x] `npm run safety:static`
- [x] Graphify rebuild

### Review
- Outcome: The map now exposes clearer venue signals and a more direct next-action layer from the selected place sheet.
- Follow-ups: Continue productizing venue memory after this slice by turning selected venues into richer activation cards with proof, reward, and creator context.

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
