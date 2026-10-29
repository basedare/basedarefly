# Playable social Moments — 29 October 2026

## Result

Free adventures retain guest play, saved steps and personal completion cards. Optional contributions accept a canonical full TikTok/Instagram/X post URL or a supported original file. A venue is optional. New original files use private Pinata storage and revocable app delivery; the existing paid-proof uploader is unchanged. Pending, flagged, rejected and withdrawn contributions have no public Moment or preview card.

Approved display-consented contributions get `/moments/{id}` and a genuine original-challenge action, optional place, authorized Baretag credit, separate spotlight selection, native/copy/platform share kit, report and independent relay. A Reality Receipt says **Reviewed creation**, never location/task/outcome verified from a URL. No scraped embeds or invented previews, participants or venues. New active sources deduplicate across wallets under a database lock/partial index; canonical tracking parameters/author-handle variations cannot create another active copy.

Reporting is authenticated, rate/durably capped and idempotent per reporter/Moment. Review resolves the existing report record; repeating a cleared report cannot repeatedly hide an approved item. Withdrawal is owner-only and cannot be reversed by a reviewer. Private media checks publication both before and after provider I/O. Owner lists ignore another creator filter and immediately suppress prior-wallet records on an account switch. Admin previews use the existing admin session instead of asking for many wallet signatures.

Community reuses PeoplePanel, published plans, existing Crew Rooms and optional Moments. Genuine venue and creator pages link approved contributions. Business entry offers Bring people in / Get creator content / Get more visibility through existing enquiries. Sponsor proposals remain private records in the existing FounderEvent/intake ledger, optionally referencing an existing DRAFT Campaign: no Campaign/slot/public link/license/payment is created. Future performance compensation is documented only.

Participation recording reuses existing Journey/Touch/ActionIntent/AttributionEvent. Self-reported start/finish never completes a paid intent. First approval preserves the original submission acquisition reference; re-review cannot add another first approval. Copy/open/delivery/unique-human/impression/revenue claims remain distinct. The founder scoreboard exposes actual records and explicitly unavailable measurements.

## Data and compatibility

Additive migration `20261029100000_adventure_moments`: nullable place/media URL, optional canonical social source, private-media reference, granular credit/spotlight consent and one self-relation for lineage. Original mandatory consent/review fields and wallet/run uniqueness remain. RLS stays service-only, browser roles retain no table access. Source/MIME/status constraints and an active-source unique index enforce the new state. Legacy v1 records remain supported, including their public-storage limitation.

No production migration or deploy is included. A previous app cannot safely display new nullable/social rows; use the explicit compatibility/rollback plan in the handoff rather than blindly rolling back readers. The production build’s existing database compatibility gate remains unchanged.

## Verification

- Focused URL allowlist/canonical identity, body-stream cap, media signature, receipt semantics and non-executable sponsor proposal tests.
- Real disposable PostgreSQL forward migration over an actual legacy row; RLS denial; actual submission/review/media/report routes with explicit auth/storage fixtures; duplicate/concurrent-source, daily cap, private pending, cross-wallet reads, independent parent, credit/spotlight revocation, report resolution, media withdrawal race and existing friend/block regressions.
- Actual optimized localhost HTTP server with real EOA action signatures and the existing admin-session route: pending/public/withdrawn page and 1200×630 card, signed owner reads, sponsor draft read/write, growth read, existing RSVP and Crew Room authorization. These are isolated local accounts/records, not production participants or device recovery proof.
- Discovery policy (69), business enquiry/delivery (22), Passport database and buyer/payment-state database regressions. No real financial transaction or external outreach.
- Browser guest start → refresh → completion, optional contribution sign-in, correct source links, phone fit at 320/390px and desktop. Final screenshots and exact checks are in the task outputs.
- Typecheck, Prisma validation/generation, lint, optimized production build, static safety and Graphify are required; final results/CI status are recorded with the PR.

Private provider upload/playback, actual phone/passkey recovery, installed-app sharing, hosted migrated-preview runtime and real mainnet payout/refund are not certified by fixtures. See [FOUNDER_LAUNCH_HANDOFF](../launch/FOUNDER_LAUNCH_HANDOFF.md) for exact links, unsent pitches, first-week pilot, metrics, top five blockers and separate free/paid go/no-go decisions.
