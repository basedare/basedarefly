# P1 — Follow, Save and Following

Base: PR45, head 7ba073eb. PR45 was still open when P1 began; this work branches from that exact head and initially targets its branch. The founder subsequently instructed **“and push to main”**. Release still requires clean checks, the additive migration and live verification. No payment, media or email switch is authorized by that instruction.

## P0 regression review

The real PostgreSQL suite re-exercises signed text submission, consent, private pending status, moderation, source eligibility, report/re-review, ownership and terminal withdrawal. P1 adds an explicit revokedAt check to publication/review/public story projection: an inconsistent legacy ACTIVE status must not override a recorded revocation. Existing public source, selected-city/timezone, deep-link and draft-preservation checks remain. Physical phones and genuine contributors are not replaced by fixture tests.

## Reuse and feature test

This completes discover → follow/save → return in the existing Pulse and My Activity. Existing StreamerTag, canonical Venue, Local Signals/FounderEvent, AdventureSubmission/Moments, VenueEvent, Meetup, Discovery context and session/signed-wallet authorization remain authoritative. There is no new feed store, identity provider, merchant dashboard, media backend, private-chat grant or financial rail.

Two missing relationship primitives justify the additive SocialFollow and SavedItem tables. Both contain private canonical references, not copies of content. Follows are directional and independent of friendships. Saving is private and does not join an activity or prove attendance. Guest adventure journals and explicit account saving remain unchanged.

## User journeys and routes

- Public creator/ordinary-person profiles offer Follow when the current Baretag is active, unrevoked, not self and not blocked. Verified claimed venues offer Follow; any eligible real place can be saved. External platform audience counts remain labelled external followers, separate from BaseDare relationships.
- Reviewed text-story cards/details, public Moments and upcoming event/meetup cards/details offer Save. Story detail reuses the existing sharing button. Other adventure/boat/paid-work continuation mechanisms remain intact; this slice does not add a second saved-run system.
- `/now` adds Nearby / Following / Happening using the same page and discovery area. Following projects approved stories, credited place-bound Moments and active upcoming meetups from followed people, plus source-checked published events from followed verified venues. It distinguishes community experiences from venue-posted/source-checked events. It does not turn a personal post about a venue into an official venue update. There is no new general official-post publication authority.
- Following stays within the selected radius and next-week plan horizon; posts are recent, plans upcoming. It does not relabel general recommendations as a followed account's content. Unsupported/unplaced media is not assigned a fictional location. Recent sampling is disclosed; an overflow is not a complete-total claim.
- `/dashboard#saved-social` contains private saved references and followed accounts, with current eligible counts. Unavailable sources show a generic removable row without old titles, text, media URLs or links. No public follower roster, popularity rank or fake audience is introduced.
- `/api/social` serves public target eligibility, authenticated relationship state, a private library and the Following projection. Writes set explicit Follow/Unfollow/Save/Unsave state. Bounded input, existing origin/auth checks, per-owner transaction lock, 100 active relationships of each kind and a durable 200 positive-action/day budget protect retries/concurrency. Idempotent retries do not consume extra budget. Removal remains available even after target withdrawal/revocation/deletion.

## Privacy, identity and recovery

Every projection re-resolves source approval, consent, identity and venue eligibility. Bilateral MeetupBlock relationships and associated wallets suppress private Following/saved projections. Publicly consented content remains public to signed-out visitors; a personal block is not a promise to erase globally public content.

Person follows snapshot the original target wallet so a transferred Baretag cannot inherit its previous owner's followers. Account switching remounts private UI state; late reads cannot populate the new account. Passive reads use existing authorization without opening a signature prompt. Missing authorization remains unknown with an explicit confirmation action, never a false empty/saved result. Writes display success only after confirmation; failure preserves the previous state and supports retry.

Private lists revalidate on return, explicit refresh and while open. Following revalidates every 60 seconds. Already rendered public text can persist until refresh; there is no claim of instant global deletion or unique-human measurement. Consented client events record action/kind only, no wallet, target ID, private text or precise location. Server relationship records are not verified participation, attendance, delivered invitations or revenue.

## Database and rollout

Migration `20261105100000_social_retention` creates only SocialFollow/SavedItem, indexes and constraints in a transaction, enables RLS, revokes anon/authenticated access and grants only the existing service_role. RLS inventory is updated. The expected schema becomes 62 migrations / 80 models. No existing content, identity, funded record or balance is transformed.

Before approved production cutover: verify the exact pending migration and current schema, take a private application backup, restore/rehearse the exact migration, preserve unaffected data and RLS, then apply only the reviewed migration with conservative lock/statement limits. Register its exact checksum using normal Prisma tooling. Never run db push, reset, seed or fixture scripts against production. The read-only production build gate remains unchanged.

Merge parent P0 before P1, retaining source/privacy protections. Ordinary Preview lacks DATABASE_URL and is not an isolated acceptance database; do not copy production credentials there. Local fixtures use disposable PostgreSQL. A protected hosted preview build is distinct from an accepted hosted data flow.

## Verification and remaining acceptance

Actual signed PostgreSQL and optimized localhost HTTP tests cover follows/saves, persisted reload/removal, unauthorized/forged ownership, city filtering, canonical sources, credit refusal, blocks both ways, revocation/tag transfer, withdrawal, event cancellation/expiry, concurrency caps and browser-role RLS denial. Existing migration/privacy, Dares, business and financial safety suites remain required. Browser checks cover 320/390px, desktop, guest sign-in/cancellation, selected city, empty/error states and direct links. Final CI/live receipts are recorded after release.

Existing original-media/link publishing is reused and remains gated by momentReleaseOptions. Private-provider playback, late orphan handling, actual photo/video upload, permissioned publication and revocation still need genuine provider/device acceptance. Neither provider configuration nor these signed text/social-reference fixtures enables production media. No additional upload backend or fake media-ready claim.

On real iPhone/Safari and Android/Chrome, use valid accounts to follow a consenting creator and verified venue, refresh/reconnect, open Following in the intended city, save a real place/story/event, reopen My Activity, remove both relationships, switch accounts and verify isolation. Then have the real author withdraw and confirm all subsequent reads; exercise block/review/expiry with actual consenting participants. Check cancelled authorization and weak-network retries. This remains necessary after browser emulation.

## Rollback and next milestone

Keep both additive private tables and their policies on rollback. Prefer a forward fix; retain P0's withdrawal/report/current-source serializer and P1's recorded-revocation protection. Never revert to the pre-P0 public Local Signals reader over new story records. Stop new writes on authorization/privacy failures; do not delete relationships or contributions to make a release pass.

Deferred: tipping, music-specific systems, public follower rosters, new login providers, general marketplace/bookings, paid ranking, AI recommendations and automatic outreach. The smallest field milestone is one willing person following a real creator/venue, saving a useful place, discovering an actual new post/plan and returning. Commercial milestone remains one authorized operator/offer/handoff, independently confirmed fulfilment and a reconciled commission; no sale or income is inferred from clicks.

## Pre-merge receipts — November 6, 2026 (Sydney)

The final optimized source passed typecheck, lint (zero errors; existing warnings), static safety, the full disposable PostgreSQL migration/privacy/social suite, 70 discovery tests, 25 business-policy tests, 27 refund-safety tests and Moment policy checks. The exact final optimized server passed real signed-wallet HTTP follow/save/library/Following/removal with disposable local fixtures. Browser checks at 320/390px preserve Sydney and its timezone, expose guest Follow/Save through the existing cancellable sign-in picker and keep My Activity links consistent; there is no horizontal overflow. Desktop checks retain the same navigation. These are browser and fixture receipts, not physical-phone or private-provider acceptance.

The read-only production preflight confirms 61 applied migrations, 78 compatible model tables with RLS, and this release as the only pending migration. The historical checksum difference for `20260722120000_add_sprint_buyer_wallet` is unchanged from approved main `af693156`; no applied file or ledger is rewritten. Final production application/deployment receipts are retained privately by the release operator and reported with the merged PR.
