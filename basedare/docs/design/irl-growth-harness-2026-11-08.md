# IRL discovery, growth and harness audit — November 8, 2026

## Phase status and plan

The original master brief's **P2 — Commercial Validation is NOT complete**. It requires a real authorized operator, legitimate offer, tracked handoff, independently confirmed fulfilled booking, reconciled commission and separately contracted campaign. Prepared software, enquiries and link clicks do not establish those outcomes. PR45/P0 and PR46/P1 are merged and live at main `0f5a9b6e`; they do not close P2.

The new IRL brief uses different numbering: **Phase 2** means instant local discovery; **P2** means later optimization. Do not mark either whole roadmap done because the social P1 shipped.

Implementation sequence: audit and reuse current primitives; complete one direct physical-QR-to-free-participation slice; add a small deterministic harness around that slice and existing evaluations; validate locally and in CI; open a draft PR. The initial brief requested a draft PR; the founder subsequently authorized shipping the tested QR/harness increment to main on November 9. Production flags, outreach, real test records and financial actions remain outside that authorization. Koobo's asserted campaign results were not independently verified; its homepage was unavailable to research tools. The implementation is justified by BaseDare's own journey, not a claimed competitor result.

| New sprint area | Existing implementation | Current increment / remaining work |
| --- | --- | --- |
| QR network | CreatorAttributionLink, `/go`, Field Stations, rotating venue check-in QR, creator drops | Add direct canonical discovery QR, pause/permission/expiry controls, current-source revalidation, two self-contained branded sticker SVG designs in the existing attribution admin. Discovery is separate from presence proof. |
| Instant local discovery | Anonymous Map/Pulse, GPS/selected city, free adventures, Nearby/Following/Happening, separate historical stories and current plans, genuine empty/error states | Reuse. QR opens the actual experience with placement context; no new map or required signup for free play. Real-device and local inventory acceptance remain. |
| Graphify / network | Graphify code index; canonical Venue, identities, events, stories, follows/saves and attribution relations in PostgreSQL | Rebuild/validate actual code graph; reuse runtime source resolvers and existing FK host relation. No claim of a live Graphify social database. No new graph store. |
| Creators / ambassadors | Current Baretags, creator drops/assignments, `/go`, independent invitations and acquisition cohorts | QR uses an existing consenting ambassador's current identity, or founder-owned BaseDare code. No follower minimum, new roster, invitation sending or prize. Transfer/revocation stops subsequent redirects. |
| Destination SEO | Existing venue/event/creator canonical pages and map deep links | Dedicated high-quality Siargao destination pages remain later work; no thin generated city pages or fictitious inventory in this slice. |
| Business acquisition | Three-goal public enquiry, authorized venue workspace, admin follow-up and attribution receipts | Preserve. QR links host/destination, creator and campaign; no booking system, traffic guarantee, price or commission invented. |
| Analytics / learning | AttributionJourney/Touch/Event, frozen intents, self-reported adventure stages, separate verified completions, permissioned PostHog | Add bounded QR cohort report/export and deterministic harness planner. Repeat requests, browser journeys, renders, self-reports, verified evidence and money remain distinct. No new analytics provider/collection. |
| Siargao pilot | Existing launch packs, free trials and business/creator intake | Operational target remains 3 approved experiences / 5 consenting ambassadors / 10 venues / 20 permitted placements. None is seeded as real. Field activation checklist below. |

## Technical slice and security

Reuse `CreatorAttributionLink.metadataJson` with `discovery_qr_v1`; its existing host Venue FK records placement independently of destination. Links are immutable destinations with explicit expiry, born paused. No schema/dependency or financial change. Existing generic links, creator drops and Field Station verified-outcome preflights remain available. New wizard covers places, authored free adventures, published current events, upcoming public meetups and active public creator profiles. Paid Dare links continue through their existing rails; this does not add a paid-QR launch shortcut.

Admin reads/writes retain the real existing admin authorization, origin checks and bounded bodies. Permission is operator-attested and revocable; activation/printing require it. Compare-and-set status writes prevent a stale activation overwriting a concurrent permission revocation. Canonical destinations, current host, recorded revocation, identity ownership, event expiry and source status are rechecked before redirects. Stored URLs cannot become external redirect authority. Paused/expired/unavailable links cannot record a fresh attributed entry and lead to a useful public fallback. No redirect is cached across a pause. A printed code is not a rotating check-in credential or evidence of presence.

The report shows the latest 50 links explicitly, and safe source limits produce unavailable metrics. Raw entries include repeats/bots; browser journeys do not prove distinct humans. Aggregate harness exports cover authored free-adventure QR cohorts only; event/place/profile/meetup participation stages are N/A, not zero. Exports group by browser journey and target, omit all identities/rosters/locations, and set counts null if the complete scope is unavailable. Existing frozen intent attribution can leave later entries without a new conversion; stage events are not independent verified attendance or sales. No new rewards, public media or automatic email.

## Graphify and harness report

`requirements-graphify.txt` pins graphifyy 0.4.2; `scripts/rebuild-graphify.sh` extracts source files/imports/functions into `graphify-out/graph.json`. Before this sprint it recorded 4,457 code nodes and 5,361 edges. This is repository intelligence, not synchronization of traveller actions. Runtime product relationships remain in existing Prisma models and current-source projections.

The harness checks required code sources, duplicate IDs and dangling edges, and reuses actual local DB tests for product-source relationships. It does not call orphaned historical references a data leak, erase withdrawn records, fabricate missing edges, or rewrite Graphify. The existing canonical resolvers decide public visibility. The bounded QR report surfaces broken/expired runtime references as unavailable and blocks printing; test fixtures exercise these failures. Automatic remote data auditing remains out of scope.

The harness's observe → propose → isolated fix → evaluate → independent review → founder release → measured learning loop is documented in `harness/README.md`. It is one offline runner, a scenario registry, strict aggregate evaluator, negative-control tests, example experiment and learning journal. It is not a multi-agent platform, scheduled watcher or automatic production operator. Existing Brain/product documents remain authoritative. Default observations are unavailable; sample data is explicitly a fixture.

## Siargao activation checklist

1. Obtain each actual host's permission for the exact placement, and confirm the named ambassador wants to participate. Record identities through existing authorized records; do not invent assignments.
2. Choose the three real approved experiences. For free adventures preserve stable templates/guest progress. Check event times, public host/source and actual paid readiness before any separate paid campaign.
3. Create one paused QR per physical placement with real host, destination, campaign, placement and optional existing ambassador codes. The 3/5/10/20 figures are targets, not launch statistics.
4. Preview destination as a stranger. Confirm no forced wallet/account for browsing or free play, correct place/timezone, usable current content and honest unavailable state.
5. Attest permission and activate only after review. Download either 100 × 140 mm SVG design, print at 100%, and scan the physical output on iPhone/Safari and Android/Chrome, including an Instagram/TikTok webview and weak mobile network. Do not infer physical scan quality from browser screenshots.
6. Exercise start/resume, optional sharing, existing sign-in only where necessary, authentic submission/review/withdrawal where provider gates permit, and one consenting recipient's independent start. A scan/share/self-report never qualifies for cash.
7. Test pause, permission revocation and expiry against a printed code. Remove/reprint obsolete material. Use the bounded report/export to inspect qualified stages; no conversion or partner claims before real evidence.
8. Keep media intake/original media, retention sending and payments at their existing gates. Record phone/provider acceptance and founder decision before enabling them. No live fixture, outbound message, funds movement or provider activation is part of this PR.

## Rollback and deferred work

Pause affected QR links; preserve their attribution and consent history. A forward fix is preferred. Keep no-store and current-source resolution; do not re-enable unsafe snapshot redirects or reinterpret scans as presence. No database rollback is needed.

Still deferred: verified P2 commercial outcome, standalone destination SEO, expanded ambassador tooling, richer recommendations/distribution, autonomous fixing/merging/deploying, new graph infrastructure and generalized bookings. The next smallest milestone is one consenting physical host/ambassador using one approved QR and a real traveller reaching a useful guest action, then voluntarily bringing another person.
