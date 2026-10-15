# Feedback for ChatGPT — BaseDare 2.0

The product direction is strong: help people have more worthwhile real-world experiences, with PeeBear connecting discovery, a personal journey and community. We inspected the repository instead of treating screenshot recommendations as confirmed live defects.

Several proposed fixes already exist: Baretags and wallet-aware recovery, real receive QR and truthful balance errors, friends/requests/blocks, meetup invitations and plan-bound Crew Rooms, moderated adventure sharing, device-local adventure steps/journal, time/mood discovery, contributor Passport, proof-gated Signal Points and verified streaks. These must be extended, not rebuilt.

We resolved the audits' conflicting names around Now / Find your next move, Map / List view, My activity, Community / People & friends. Adventure Passport is the personal journey; the existing CreatorPassport remains contributor settings and reputation.

The first build connects an eligible free adventure → saved steps → self-reported completion → personal stamp/three-part collection → optional completion invitation → someone else's fresh attempt. The collection reuses existing authored activities. A fixed three-venue route is a later step requiring checked access and route quality; we will not invent participating venues or rewards.

Personal stamps are nonfinancial, device-local memories. They do not create verified attendance, paid-work reputation, contribution points or cash. Approved shared media means display approval; it is not a presence certificate. No second XP system or universal score is being added.

Solo participation remains complete. “Invite friends” and “Find a public plan” are optional; public posting is optional. PeeBear should suggest eligible next actions from real inventory without pretending a user visited a place or exposing private movements.

Paid onboarding/recovery/mainnet receipt gates remain separate from free participation experiments. Automatic settlement is a design description, not evidence that the production payment path is ready. The current release runbook records those outstanding gates.

Build next: versioned multi-place adventures over existing venues, explicit account linking for cross-device memories, evidence-backed stamps with idempotent awards/reversal, then creator publishing and expanded multiplayer. AR/VR stays a future presentation adapter over these IDs and permissions; no new headset runtime is needed now.

The useful experiment measures invitation → actual participation → worthwhile experience → another activity. Traveller trip returns and later reuse matter; sponsor repeat purchase needs separate evidence. Views, map opens and self-reports must not be sold as verified arrivals or incremental venue revenue.

Please use docs/design/basedare-2-master-spec.md as the consolidated implementation specification. The World proposal is a roadmap, not a demand to implement ten systems simultaneously. Competitor/hardware assertions in the pasted research have not been independently verified in this build.

## Implemented in this release

- Adventure Passport: one connected personal record, two stamps, the three-stage Three perspectives collection, saved memories and resume controls. It uses the existing journal rather than creating a second progression engine.
- Sharing loop: completion invitations preserve the original activity context; recipients start their own fresh attempt. Activity-specific share images say “Try this” and distinguish free participation from rewards or verification.
- Discovery: Now and List apply the same time, activity-type and needs-people policy. Map/List navigation retains area and filters, including Next 2h. Future scheduled starts are labelled in destination time; past place records appear separately.
- Navigation and presentation: five primary destinations, Passport in My activity, clearer activity cards, one main venue action, secondary tools in disclosures and simpler wallet details using the existing tactile materials.
- Activity inbox: categories and meaningful icons for recorded social, adventure, place and paid-work events; visible loading/failure/recovery states; bounded private reads and protection against stale responses after account changes.
- People & friends: clearer loading/errors, public-plan discovery and account-bound private connection snapshots. Existing handle, friend, block and room permissions are preserved.

Validation includes 36 discovery/Passport checks, TypeScript, zero lint errors, a production build, existing identity/onboarding/usability checks and guest browser journeys at phone and desktop sizes. A separate recipient origin starts with no inherited completion. Private signed inbox, physical-phone push/recovery and real funded payout/refund journeys still need controlled testing. Deployment status is recorded separately after exact-head preview and production verification; this document alone is not evidence of deployment.
