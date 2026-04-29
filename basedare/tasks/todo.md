# BaseDare Todo

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
