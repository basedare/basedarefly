# Living local economy and BaseDare Sessions

Prepared from main `ed36292e`, on `codex/living-economy-sessions`. This is a code increment for review; production migration, deployment, real profiles, real events and activation are separate decisions. See the [audit and phased plan](../design/living-economy-sessions-2026-11-23.md).

## Delivered phases

| Phase | Implementation | Preserved authority |
| --- | --- | --- |
| 0 — audit | Current main, code graph, canon, meetup/event, venue, social, media and financial boundaries inspected | Existing architecture and source eligibility |
| 1 — Nodes | Draft/public/withdrawn creator projects and collectives; unique slug; owner invitations; explicit recipient acceptance; private/public membership; revocation; public `/n/[slug]` | People remain StreamerTag identities; venues remain Venue records; no person location tracking |
| 2 — local economy | `/local`, area-preserving map entry, existing venue-page activity, category and name search; offers, needs, gigs, collaborations and experiences | Current public venue anchors; existing SocialFollow/SavedItem and Following projection |
| 2 — requests/bookings | Free, barter and stated paid terms; venue-to-Node private direct offer; public applications; confirm/decline/cancel; immutable terms fingerprint; bounded capacity; schedule conflicts; durable create retry dedupe | Existing account/session/signature checks, real venue authority for venue/direct offers; no financial rail |
| 3 — Sessions | One-to-one format on Meetup; canonical meetup map pin and audience RSVP; separate guest roles, applications, host approval/decline/removal; cancellation; participant/host attestations | Existing Meetup/Rsvp and place sources; application/RSVP is not attendance or secure check-in |
| 4 — recordings | Existing bounded private Moment upload; exact Session reference, original MP4, source hash; explicit music/featured-person/venue rights; processing/publication scopes; host approval; expiry; terminal withdrawal | Existing upload switches, private storage, moderation, v1 BaseClips local contract; no automatic media processing or publication |
| 5 — operation | Reports in FounderEvent, protected `/admin/local-economy`, audit history, integration tests and release/phone checklist | Existing administrator authority, RLS, no external messages or new provider accounts |

Public Nodes show only source-derived mutually confirmed booking counts, labelled as participant reports. They do not receive Signal Points, secure visit credit, payment status or verified reputation from these records. Raw applications, wallets, consent documents and private originals never enter public discovery.

A Node owner manages membership; accepted current administrators can host/manage that Node's opportunities and Sessions. Revoked, transferred or inactive identities cannot acquire those permissions. Original private requests remain private to their account and the current organizer. Ownership transfer is intentionally not provided in V1. A replacement offer is a new immutable record requiring new acceptance, not an edit to agreed terms.

## Migration and compatibility

`20261123090000_living_economy_sessions` adds seven server-only product tables, the nullable `AdventureSubmission.sessionId` foreign key and the existing social-reference constraint extensions. Existing venue/person/meetup/event/media records are retained. New tables enable RLS and revoke browser database roles. Migration testing replays actual history, preserves a legacy meetup/RSVP, injects a late transactional error, verifies no partial new tables survive, then deploys/redeploys normally.

Generate the Prisma client with this source. Apply the migration explicitly before deploying the new application; the existing production database compatibility gate remains enabled. Do not use a production database for tests or silently replace migration deployment with `db push`.

Rollback the application to the prior reviewed source while retaining the additive schema and records. Do not drop the new tables, remove the Session foreign key, or narrow social constraints after new data exists. Stop new submissions/exports during an incident, preserve the audit trail, and use terminal source withdrawal to remove affected projections. Media already exported to the local BaseClips operator needs its explicit signed revoke command applied there too.

## BaseClips boundary

The reference is the actual separate BaseClips `baseclips.basedare.media.v1` contract, reproduced in `docs/contracts/baseclips-media-v1.json` and checked against the original. Export uses its existing `moment` target, original SHA256, immutable grant/request ID, tenant, expiry, credit and supported destination list. Evaluation and training are always false. Only the contributor exports the owned original; host approval is required first. The server refuses changed, withdrawn, rejected, expired, disabled or no-longer-authorized sources and respects current original-media acceptance switches.

This MVP prepares a private local-review packet, not a hosted integration. The trusted local operator transfers the contributor-owned original into BaseClips' content-addressed incoming directory and uses its existing signing client. Signed receiver ingest, idempotency and revoke have been exercised with an original synthetic MP4 in an isolated BaseClips store. No real footage, production provider, rendering success, edit approval or public publication is implied.

A recording grant is not approval of a particular edit. Candidate review, exact output/hash approval, and any public attachment/publication stay in the existing BaseClips review process and require separate current permissions. The app does not ingest arbitrary candidate URLs or expose Session originals through ordinary Moment display, even if a generic display reviewer marks one approved. Full-length recording ingestion, automatic transport, recurring Sessions, private/ticketed Sessions, custody, commission, escrow, auctions and token incentives are outside V1.

## Siargao / Bhabie Waves pilot

All automated profiles/events/recordings are explicitly labelled local fixtures. No real Bhabie Waves profile, membership, award, venue relationship, schedule, booking, income or consent is asserted.

First real sequence:

1. Name the real organizer, moderator and support contact. Confirm Bhabie Waves' profile authority and each invited person's consent; invite them to accept their own role and credit preference.
2. Select one existing canonical Siargao venue. Have the verified venue operator create a direct band offer, or have a permitted host schedule one public jam/story Session within 72 hours. Agree exact date, safe access, capacity, cancellation and any direct paid/barter terms.
3. Request/approve two guest roles. Separately test an audience RSVP; neither is proof of attendance. After the event, participants and host can independently attest to participation. Existing rotating QR/GPS check-in, if genuinely available, remains a separate evidence source.
4. Obtain permission for featured people, music and venue recording. Open only the existing controlled media trial for explicitly consented accounts; upload one original MP4 under 4 MB during the event or within seven days after it. Link it to that exact Session.
5. Grant only the uses actually agreed, obtain host review, export privately to the local BaseClips operator, review the exact candidate with affected rights holders, and publish only through separately authorized channels. Rehearse withdrawal in both products.
6. Record genuine requests, approvals, mutual attestations, accepted recordings and withdrawals separately. Paid value, payment receipt and platform revenue remain absent until independently evidenced through an authorized financial process.

## Release checklist

### Code and migration review

- [ ] Independent review of Node permission matrix, direct-offer recipient privacy, immutable terms, capacity/schedule races, report moderation, media consent and terminal withdrawal.
- [ ] Run `test:local-economy`, `test:local-economy:db`, existing social/media/discovery/business/safety suites and change-aware harness against the exact proposed revision.
- [ ] App and test typechecks, touched-source lint, Prisma generation/validation, optimized build and Graphify rebuild pass.
- [ ] Back up the target database; rehearse migration on an isolated restored copy with existing records. Verify server role/RLS and production compatibility gate. Apply the approved migration before application deployment.
- [ ] Deploy a preview against an isolated database; do not copy production credentials or create hosted synthetic participants.
- [ ] Verify signed-out discovery, exact area/map links, Node follow/save, direct/public requests, member revocation, guest approval/cancellation, account switching and failure recovery on the exact preview.

### Real phones and pilot acceptance

- [ ] Physical iPhone Safari: sign-in/recovery, narrow portrait/landscape, keyboard, datetime inputs, backdrop/scroll, map → place → opportunity/Session → return.
- [ ] Physical Android Chrome: same paths, host/guest account switch, explicit refresh, interrupted submission/retry, capacity conflict and clear cancellation.
- [ ] Confirm the venue timezone with the host. Composer inputs use device time; public cards use the venue timezone. Check the actual Siargao schedule with both parties.
- [ ] Named genuine host/venue authority, member/guest consent, support/opt-out route and moderator response process are recorded.
- [ ] Actual permitted file upload/storage and account recovery succeed with the real configured providers. Browser emulation and a fixture JWT are not provider or physical-device acceptance.
- [ ] Real footage/music/featured-person rights and exact candidate approval are reviewed; withdraw one grant and apply the local BaseClips revoke instruction. No automatic propagation is claimed.
- [ ] Production media/account/payment flags remain unchanged until their separate acceptance/approval. No payments are collected by this feature.

### Rollout and watch

- [ ] Founder approves the reviewed code release, migration and deployment separately as applicable. Verify the exact deployed revision; do not report main/production from a local build.
- [ ] Watch failed loads, stale-account errors, approval conflicts, duplicate/rejected requests, reports and consent withdrawals. The global short DB advisory lock is a deliberate small-pilot throughput limit; measure contention before broader rollout.
- [ ] Stop the affected intake/projection on a privacy leak, unauthorized booking, over-capacity approval, missing migration or consent failure. Preserve evidence and keep unsupported paid/media operations closed.

No physical phone acceptance, live payment, public profile consent or production release is established by this document.

## Verification recorded locally

- Change-aware harness: 18/18 selected scripts passed; zero uncovered runtime paths; source fingerprint unchanged during execution; code graph current. `releaseReady=false` correctly retains manual release/real-world gates.
- Living-economy PostgreSQL integration: 70 assertions, complete migration replay and idempotent redeploy, transactional fault injection and preserved legacy participation, real ECDSA request authorization, privacy and capacity races. Four focused policy checks also pass.
- Existing discovery (80 tests), media policy (10 tests), harness regression (18 tests), social/media forward migration and DB privacy/credit/contribution/accounting suites pass through the registered checks.
- App and test TypeScript checks pass; new/touched feature lint has zero errors or warnings. The wider touched venue page retains its existing image warning.
- Optimized `npm run build` passed with Node22.21.1 / Next16.4.6 after moving stale generated development route types aside. Existing middleware-deprecation/viem dynamic-import warnings and missing optional local OnchainKit key remain warnings. No check was weakened or suppressed.
- Responsive Chromium: 320/390/1280px local network and Session, 390px Node profile, actual authenticated fixture guest request and host approval; nine checks, no horizontal overflow or uncaught page errors. Real provider authentication and physical phones remain untested.
- Exact BaseClips contract matches the separate reference schema. Its real signed receiver ingested a synthetic MP4 idempotently with processing-only permissions and cancelled the queued job after explicit revoke. No edit rendering or publication is claimed.

Evidence is local and fixture-based. Independent review, exact hosted CI/preview acceptance, production schema/role checks, physical phones, real participant/host consent and applicable provider/financial activation are still open.
