# Focused home discovery and buyer entry

19 October 2026. A presentation and entry-routing release.

The homepage hero now has one primary action: Find something nearby. It uses the shared discovery link to retain the browsing city. The duplicated first-adventure card is removed, preserving the approved PeeBear, orbit, radar and funding controls.

Adventures has a clear entry in Live Around You. Suggestions open the adventure page directly, followed by its explicit Start action. Time/mood preferences are an optional native disclosure. Saved progress comes before discovery tools; both the resume card and matching suggestion retain the run's original place and city even when browsing another area. Public plans, personal memories and paid work keep their existing semantics.

The next conversion improvement connects homepage buyers to the existing public content/activity enquiry forms. No account or funding is required to describe a brief. Self-service paid-dare creation remains secondary. The `home-business` source distinguishes this entry in the existing funnel/intake; it is not evidence of demand, payment or higher conversion. Price, availability, rights and reward funding still require agreement. Existing workspace links retain their default attribution.

## Verification

- Production build including TypeScript passes. Targeted lint has zero errors and three existing effect warnings. `git diff --check` passes; Graphify rebuilt.
- Discovery: 55 passing tests. Revenue: 22 passing tests, including both enquiry intents and entry sources without fixed pricing, identity or funding assumptions.
- Disposable PostgreSQL integration exercises the actual homepage-source intake: separate intents, retry, stored scope/source and review. Existing consent/RLS, claims, media, rejection/appeal, simulated settlement and cost checks pass. External fetch is disabled; no customer/operator message or chain transaction was sent.
- Browser checks at 1440×1000, 390×844 and 320×740: one hero action, no old adventure card, no document overflow, direct adventure entry with Sydney/time preference retained, guest Start, and Sydney resume retained after switching the browsing area to Siargao. Preference disclosure opens/closes, and buyer links are keyboard accessible.
- Both homepage buyer links open the correct public short form with neutral budget and source; visible phone form fields use 16px text. No live enquiry was submitted. Local auth/provider/inventory configuration is incomplete and does not prove those unrelated production journeys.

## Release

Merge after CI/preview checks pass, verify the exact main deployment is ready, then check the live hero, adventure entry and both buyer destinations. No schema, dependency, environment, account, contract or money movement changes. Existing paid-launch and commercial-rights gates remain.

Revert this application release if the main CTA loses city context, saved adventures become inaccessible, buyer intent is lost or controls clip. Existing personal journals and enquiry records need no rollback migration.
