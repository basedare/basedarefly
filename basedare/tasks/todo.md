# BaseDare Todo

### Task — Field Station acquisition alpha (2026-07-15)
- Owner: Codex
- Goal: Turn permissioned physical QR placements into localized, answer-first discovery entrances with honest station and destination receipts.

### Plan
- [x] Extend tracked links with station, attention, density, host, and print serial metadata.
- [x] Resolve each scan against live local density and fall back to a neutral nearby entry when the promise is under-stocked.
- [x] Carry immutable station context through intents, Mission Passes, verified completions, and venue check-ins.
- [x] Add station/creative reporting with separate host and destination receipts.
- [x] Add H-level, four-module-quiet-zone, vector QR generation around the existing short `/go/` URL.
- [x] Add localized answer-first Board/map entry and focused funnel instrumentation.

### Verification
- [x] Prisma validate/generate and migration review
- [x] Focused policy and station tests
- [x] App/test TypeScript checks
- [x] Touched-source ESLint
- [x] Production safety and production build
- [x] Graphify rebuild

### Review
- Outcome: Field Station acquisition alpha is implemented locally: immutable station QRs resolve live density, preserve answer-first consent, carry attribution through Mission Pass and verified action, and report host acquisition separately from destination outcomes.
- Follow-ups: Real printed-QR scan tests and station placement permission remain physical pilot gates.

## Working Template

Use this section for active non-trivial tasks.

### Task
- Owner: Codex
- Goal: Double down on monetization with a public paid-activation buyer path.

### Plan
- [x] Add a public `/activations` page that packages BaseDare as verified creator activations.
- [x] Add pilot pricing tiers and the proof/reporting loop buyers are paying for.
- [x] Add a qualified activation intake form and route it into internal founder events plus Telegram alerts.
- [x] Route serious buyers from nav, sitemap, and Control Mode homepage into the monetization page.
- [x] Verify production build, static safety, and Graphify rebuild.

### Verification
- [x] `npm run build`
- [x] `npm run safety:static`
- [x] Graphify rebuild

### Review
- Outcome: Added a public paid-activation offer page, qualified intake endpoint, internal founder-event capture, and Telegram alerting for buyer leads.
- Follow-ups: Add conversion tracking once analytics is wired so we can measure activation page views, form starts, and qualified submissions.

### Task — V2 financial canon lock (2026-07-13)
- Owner: Codex
- Goal: Make the personal-dare settlement rail and managed commercial rail economically consistent before V2 release.

### Plan
- [x] Lock 96% completer / 4% BaseDare / 0% referral / 0% Live Pot entitlement in one executable and written canon.
- [x] Lock the $2,500 Verified Field Sprint: $2,000 managed service + $500 gross contributor pool across four $125 escrows.
- [x] Remove public direct campaign funding and automatic scout commission from the managed-service path.
- [x] Require a paid intake, separately confirmed payment lines, one real escrow per mission, and a four-mission cap.
- [x] Align buyer/admin copy, founder revenue reporting, release runbooks, tests, and static safety.

### Verification
- [x] App and test TypeScript checks
- [x] Financial canon unit tests
- [x] V2 Hardhat contract tests
- [x] Touched-source ESLint
- [x] Static production safety
- [x] Production Next build
- [x] Graphify rebuild

### Review
- Outcome: Financial canon is code-backed and managed delivery can no longer be confused with the 4% settlement fee or launched from an unfunded database fallback.
- Follow-ups: No V2 deployment. Production migration, bytecode/environment checks, proof smoke tests, and sponsor commercial-reuse legal review remain release gates.

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
