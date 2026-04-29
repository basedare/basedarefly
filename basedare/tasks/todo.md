# BaseDare Todo

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Replace the boring Leaflet map surface with a MapLibre-powered dark 3D city grid.

### Plan
- [x] Swap the map canvas from Leaflet/react-leaflet to MapLibre GL JS.
- [x] Use OpenFreeMap vector styling as the base map source.
- [x] Add BaseDare-owned layers for chaos zones, heat, live dare signals, proof nodes, selected venue pulse, footprint trail, and user aura.
- [x] Preserve existing venue selection, dropped pins, nearby scanning, filters, panels, and jelly actions.
- [x] Remove unused direct Leaflet packages and CSS import.
- [x] Verify with targeted lint/type checks, production build, and graphify rebuild.

### Verification
- [x] Targeted lint/type check for touched files
- [x] `npm run build`
- [x] Graphify rebuild

### Review
- Outcome: `/map` now runs on a MapLibre 3D grid with dark BaseDare styling, live signal overlays, and existing BaseDare marker interactions.
- Follow-ups: Browser-smoke `/map` against live tile loading and tune the final dark style once real production venue density is visible.

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
