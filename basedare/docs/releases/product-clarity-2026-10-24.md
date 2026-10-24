# Product clarity and destination continuity — 24 October 2026

People arriving at BaseDare should understand the product and find their next step before learning its internal vocabulary. This release applies the useful patterns from Goosechase’s guest entry and Billo’s creator/business entrances to BaseDare’s existing routes.

## Result

- A visible “Find something worth doing” headline, shared plain-language promise and one discovery CTA above the approved PeeBear artwork. Creator work and business briefs are quieter secondary entries. The repeated large slogan and map CTA below the artwork are removed.
- Entry, help, example cards and discovery labels align around free adventures, meetups and paid missions. Published free challenges remain distinct. The homepage orbit still describes examples, not real inventory. Siargao is described as the founding pilot.
- About explains the real-world participation vision, optional filming, business-funded briefs and local availability. Join explains guest adventures separately from account saving and paid work. Earn prioritizes finding work over creating it, and distinguishes assignment, approval and settlement.
- Creator discovery/alert links carry the selected browsing city. Explicit market alert invitations and exact mission links keep their own destination. Paid inventory itself is not newly city-filtered.
- A browser check exposed Now’s canonical URL dropping the selected city label/timezone after rounding coordinates. Canonical and shared view URLs now preserve them; Map/List retain them too. Now waits for area restoration before exposing actions or fetching inventory.

## Verification

- Discovery regressions cover Sydney creator/alert links, exact mission and explicit market precedence, privacy rounding, timezone restoration, selected plan, needs-people, and onward Map/List navigation.
- Existing World Pulse/live-plan and creator authorization checks cover selection/sharing policy and reject unsigned, wrong-action and wrong-mission writes.
- Relevant revenue/return-path checks protect enquiry intent and separate consent. Auth, claim, payment, review, refund and rights implementations are unchanged.
- Browser checks at 320/390px and 1440px found no horizontal overflow. The headline and discovery CTA are visible before the artwork. Creator alerts prefilled Sydney, business entry opened the content brief without sign-in, and the guest Now → adventure → start → refresh/resume path retained Sydney and Australia/Sydney. The local test run was stopped afterward.
- Local checks: 57 discovery tests, 23 World Pulse/live-plan tests, 22 revenue/return-path tests, creator authorization checks and application type checking passed. Full lint reported zero errors and 221 existing warnings. Graphify was rebuilt. Production build, preview and deployment evidence are recorded in the release handoff outside Git.
- Local development has no production database or wallet credentials. Database failure states remain visible instead of becoming empty inventory. Real passkey recovery, external-wallet reconnect, physical-device participation and mainnet payout/refund are not established by this release.

## Boundaries and rollout

No migration, environment, dependency, price, reward, rights or contract changes. No sample users or jobs, enquiries, contact subscriptions, signed transactions or outbound messages are created by verification. Sharing and sign-in implementations are reused; portable-pass and authenticated task completion still require their existing operating checks.

Ship the reviewed branch through CI and preview, then verify the main revision, production deployment and public alias. Rollback is a code revert or promotion of the previous deployment; no data rollback is needed. This is a clarity release, not a claim that all paid-launch gates are cleared.

## Research references

- [Goosechase guest participation](https://goosechase.com/how-it-works/join-experience)
- [Goosechase experience creation](https://goosechase.com/how-it-works/create-experience)
- [Billo](https://billo.app/)

These are product patterns, not independently verified evidence of vendor performance or BaseDare conversion improvements. Confirm comprehension and completion with real travellers, creators and businesses in the Siargao pilot.
