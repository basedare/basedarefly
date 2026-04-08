# BaseDare Roadmap Refresh

Updated: 2026-04-09

## Why this refresh exists

The repo is further along than some of the brainstorming notes suggest.

Already present in the codebase:
- place memory map with pulse states and venue detail panels
- venue check-in APIs and a venue console surface
- brand portal and campaign-linked dare flows
- proof verification, payout retry cron route, and expired-refund route
- admin review surfaces for appeals and place tags

Still missing or not yet launch-safe:
- production scheduler wiring for payout retry and expired refunds
- unified product and revenue instrumentation
- Sentinel Phase 1 schema and UX
- PWA installability
- roadmap and architecture docs that match the current system

The goal is to prioritize what makes BaseDare trustworthy, sellable, and operationally real before chasing bigger mythology features.

## Priority Order

### Priority 0: Trust and Money Rails

This is the gating layer for everything else.

Ship next:
- productionize scheduled runs for [`/api/cron/retry-payouts`](/Users/mrrobot13/Desktop/basedarestar/basedare/app/api/cron/retry-payouts/route.ts) and [`/api/refund/expired`](/Users/mrrobot13/Desktop/basedarestar/basedare/app/api/refund/expired/route.ts)
- add an operator-facing settlement view for `PENDING_PAYOUT`, failed retries, and expired claim refunds
- add alerts for cron failures, stuck payouts, and refund failures
- write a short launch runbook for simulation mode vs real mode, hot wallet checks, cron secrets, and rollback steps
- update stale architecture notes so the docs stop underselling what is already built

Why this comes first:
- if payouts and refunds are not boringly reliable, every growth feature compounds risk instead of value
- brands and venues care more about trust and ops than future AR or zkML mythology

### Priority 1: Sentinel Phase 1

Sentinel is worth doing now, but as a bounded product feature, not a science project.

Ship:
- `requireSentinel`, `sentinelVerified`, and `manualReviewNeeded` on `Dare`
- creator-side opt-in during dare creation
- soft-routing in [`/api/verify-proof`](/Users/mrrobot13/Desktop/basedarestar/basedare/app/api/verify-proof/route.ts) that flags manual review and pings Telegram
- sentinel badges on dare cards, map surfaces, and detail pages
- a lightweight admin queue for pending Sentinel reviews

Guardrails:
- no hard fail path yet
- no zkML marketing beyond what is truly live
- do not let Sentinel create an expensive manual-review tax on low-value dares

### Priority 2: Instrumentation and the Founder Scoreboard

BaseDare needs operating truth, not just product surfaces.

Add:
- a thin event layer for creation, funding, claim request, proof submit, verify, payout, refund, venue check-in, and campaign completion
- a daily scoreboard for:
  - funded GMV
  - settled GMV
  - realized revenue
  - completion rate
  - payout success rate
  - refund volume
  - venue check-ins
  - repeat venue visits
  - paid campaign completions
- simple dashboards or admin views that expose these numbers without requiring database spelunking

Why this is necessary:
- the founder memo already defines the right metrics, but the product does not yet appear to instrument them as a coherent system

### Priority 3: Map and Mobile Productization

The map is already strong. The next step is not reinventing it, but making it easier to scan, faster to use, and better on phones.

Ship:
- marker clustering and better density handling for larger city loads
- pin hierarchy improvements: clearer glow tiers, stronger count labeling, and less tiny floating text
- tighter integration between the filter bar and map canvas
- a subtle vignette or container treatment so the map feels native to the rest of the UI
- sentinel and paid-activation visibility in marker states
- mobile-first pass on map controls, selection states, and nearby discovery

Important nuance:
- viewport-aware nearby loading already exists in [`RealWorldMap.tsx`](/Users/mrrobot13/Desktop/basedarestar/basedare/components/maps/RealWorldMap.tsx)
- this is a performance-and-polish phase, not a fresh map build

### Priority 4: PWA After Money Rails Are Stable

PWA is still a strong move, but it should land after settlement reliability is in place.

Ship:
- `app/manifest.ts`
- installable icons and install CTA
- standalone display mode
- service worker for shell caching and selected map/venue surfaces
- basic offline experience for non-transactional browsing

Delay until later:
- push notifications for growth loops should wait until the notification/event model is cleaner and measurable

### Priority 5: Venue Revenue Readiness

The venue system is not greenfield anymore. The repo already has real building blocks. The roadmap should focus on taking them to pilot-ready.

Ship:
- secure venue claim/onboarding flow
- pilot-ready venue console reliability and access control
- basic venue reporting:
  - scans
  - unique visitors
  - completed venue-linked dares
  - repeat visitors
- one clean sponsor or venue pilot package instead of a sprawling dashboard

Why this matters:
- venues are the moat layer, but they only become revenue when the system is easy to run and easy to explain

## Explicitly Deprioritized For Now

These are interesting, but they should not jump the queue:
- full zkML verification beyond Sentinel Phase 1
- AR overlay as a top roadmap item
- native apps before PWA learnings
- DeFi yield features
- NFT or token expansion
- heavyweight analytics suites before basic instrumentation exists
- fee experiments before settlement and refund flows are consistently reliable

## Near-Term Sequence

### Next 7 days
- money rails hardening
- Sentinel Phase 1
- roadmap/docs cleanup

### Next 2 to 3 weeks
- instrumentation and founder scoreboard
- map/mobile productization
- venue pilot tightening

### After that
- PWA installability
- venue pilot packaging
- selective brand-safe verification upsells

## One-Line Rule

Trust first.
Then measurement.
Then mobile distribution.
Then venue monetization.
Then bigger bets.
