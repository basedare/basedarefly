# BaseDare architecture

Current engineering map — November 11, 2026. Product authority is the [Product Constitution](../brain-vault/00-control/product-constitution.md); money follows the [Financial Canon](FINANCIAL_CANON.md). The [legacy bounty-era sketch](archive/architecture-legacy-bounty.md) is historical, not current release evidence.

BaseDare is a real-world social discovery application on Base, not a separate chain. The Next.js/React application uses Prisma/PostgreSQL for canonical product records, MapLibre for the real-world map, existing passkey/wallet/session identity and protected action authorization. Free discovery and authored adventures do not require payment or an upfront wallet.

| Layer | Existing authority / entry points | Boundary |
| --- | --- | --- |
| Discovery | Map/Pulse, `lib/discovery-context.ts`, current plans and place sources | Explicit/remembered/GPS browsing context is not evidence of physical presence. Failed sources remain unavailable. |
| Places and plans | Canonical Venue, VenueEvent, Meetup, community Sparks and existing public inventory policies | Current place/author/source status, publication and time rules determine public availability. Independent stories are not official venue updates. |
| Stories and media | LOCAL_SIGNAL / FounderEvent and shared community-story serializers; existing AdventureSubmission/Moments | Review, display consent, current identity, reporting and terminal withdrawal remain authoritative. Media switches/provider acceptance are separate from text publishing. |
| Social retention | SocialFollow/SavedItem references and `lib/social-targets-server.ts` | Current sources are re-resolved; blocks, revocation, ownership transfer and expiry constrain private lists/Following. Saves are not attendance. |
| Identity and authorization | Existing StreamerTag/Baretag, session and signed-wallet action infrastructure | No parallel user/provider system. Protected publishing/follow/save uses real authorization; guest free progress remains local where already supported. |
| Acquisition | CreatorAttributionLink, AttributionJourney/Touch/Event, frozen intents, existing invitations/drops/assignments | Raw entries, browser cohorts, client renders/self-reports, verified completion and cash are different evidence. No scan creates a reward entitlement. |
| Physical QR | Existing Field Stations/rotating venue check-in, plus direct discovery QR in the existing attribution admin | Direct invitation QR is marketing discovery. Rotating QR/GPS use the existing trusted check-in rail; neither is automatically paid-task proof. New direct links start paused and recheck canonical sources. |
| Commercial | Guest business enquiry, existing private operator review, venue workspace/campaign/service delivery | A proposal is not a live funded campaign, accepted rights, booked revenue or a successful referral. No generalized booking marketplace. |
| Paid Dares | Existing Dare state machine, funding/review/settlement/refund APIs and contracts | Use current readiness gates, source state, real receipts and financial canon. Verification and settlement are separate. This architecture document does not prove mainnet deployment or a successful payout. |
| Engineering/growth learning | Existing CI and test suites, Brain vault, Graphify and `harness/` | Graphify indexes code, not live travellers. The bounded harness consumes explicit aggregates and prepares hypotheses/PR briefs; it cannot merge, deploy, send or move funds. |

The Discovery2.0 pipeline (`lib/discovery-intelligence-server.ts`) is a read-only bounded projection over existing public records, with deterministic intent/price/time policy. Optional `lib/discovery-relations-server.ts` connects canonical place/creator/post/activity records and rechecks current credit and ownership. It is not a second feed or graph database. The offline harness now guards these sources as well as the code index.

The default-off contribution pilot stores immutable policy/draft/audit records in existing FounderEvent and append-only non-cash XP/reversals in existing PointsEvent. The `xp:` namespace is excluded from creator Signal Points. Current evidence, explicit public opt-in, identity/revocation and consent withdrawal govern public standings; historical ledger sums are not current eligibility, cash or presence. Existing commercial Campaign/Dare, media and settlement rails remain separate. See [release scope](releases/discovery-contribution-2026-11-11.md).

## Core data flow

Guest discovery → canonical source eligibility → existing place/activity → appropriate participation action. Authenticated text publishing → private NEW review record → approved current-source projection → Pulse/Map/detail. Report/withdraw/revocation removes subsequent eligible reads; already rendered public content and printed artwork are not instant global erasure promises.

A discovery short link → current host/subject/permission/expiry check → safe same-origin canonical destination → existing attribution where configured → guest adventure start/self-reported finish → optional independent invitation. Attribution failure does not fabricate a participant or prevent safe discovery. The private bounded export is a source for reviewed harness hypotheses, never verified growth on its own.

## Release and operation

Production migrations remain explicit operator actions, independent of the read-only build compatibility gate. No preview receives production credentials or synthetic hosted records. Local PostgreSQL fixtures and CI exercise real handlers, authorization and privacy; physical phones, private media providers, sending and mainnet acceptance remain separate gates. See [comprehensive status](launch/comprehensive-build-status-2026-11-09.md), [QR/harness release](releases/irl-qr-harness-2026-11-09.md), [harness operation](../harness/README.md) and the existing launch runbooks.
