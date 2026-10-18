# A simpler Adventures journey — 18 October 2026

## Change

Discovery presents one locally eligible free adventure. An unfinished run takes priority; other suggestions, time/mood preferences and alternatives remain behind explicit disclosures. The cosmetic Solo/With friends selector is removed; real invitations remain inside the chosen adventure. Shared adventures keep their existing public/mine/hashtag/post URLs and moderation, but load only when selected rather than on every discovery visit.

The full Passport remains at /adventures/passport with all account-save, evidence, export and privacy behavior intact. Discovery shows a compact memory entry. Completion leads with the personal memory, invitation and Passport, with finished steps and optional public media sharing disclosed underneath. Starting still requires an explicit action, and switching still warns that it replaces the unfinished run. No sign-in is added to free participation.

Adventure links now carry the browsing city's label and optional timezone. Direct entry restores the shared discovery area; explicit invitation coordinates take precedence without inheriting a different city's timezone. Venue-linked activities still use the venue's own details and cannot start while that lookup is unavailable. Venue reads have a deadline and retry. Known timezones also survive shared discovery navigation and session restoration; unknown personal weekly-challenge timezones use a labelled UTC week instead of assuming Manila. The existing server community-goal week is unchanged. Browsing destinations are never physical-presence evidence.

A shared route policy suppresses optional installation on participation-tray routes and focused adventure/creation flows. This prevents the install card covering the active adventure, plan or paid-work tray. Installation remains available on home/help pages. Adventure controls use larger labels, body copy and touch targets with existing satin/gold/violet materials.

## Verification

- 55 discovery/progression/privacy tests pass, including nine new regressions for city continuity, destination precedence/daylight, round-trip links and install/tray separation. Application and test typechecks pass. Full lint has zero errors; existing warnings remain.
- Static production safety, wallet/venue usability and Community identity checks pass. Optimized build and Graphify rebuild pass.
- Browser guest journey at 390px starts in two taps: See adventure → Start this adventure. No wallet or sign-in is required.
- At 320px the resume action stays visible above the fold, one checked step survives navigation and refresh, and direct /adventures restores Sydney. Completion retains its personal/nonfinancial wording and creates an invitation with rounded coordinates and the original city. Keyboard disclosures, 10-minute/unwind filtering, alternative access and the explicit shared-adventure view work without horizontal overflow at 320px and desktop. The full Passport retains its memory and account-save/evidence panels, and Sydney’s weekly timezone survives the round trip. Public media sharing remains optional and still requests sign-in before submission. Deployment checks are recorded in the task handoff.

## Release and rollback

Ship through clean PR checks and a tested deployment, then merge and verify main. Revert the application commit if resume loses steps, the selected area changes unexpectedly, disclosures become inaccessible, sharing breaks or a mobile surface blocks participation. Preserve the journal and all server records on rollback.

No migration, dependency, production configuration, payment, contract, QR or verified-evidence rule changes. No new XP, cash entitlement, public upload or external message. Physical-phone/native share and account-save checks are separate from viewport/guest tests. Keep the existing five navigation destinations, homepage artwork, map renderer, paid-work guards and manual Passport account saving.
