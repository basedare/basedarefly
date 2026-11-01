# Founder launch handoff — playable social loop

29 October 2026. Source: revised shared brief `t_6ae328e8e2d081918839970d5b35d2a2`. This release extends the shipped Chaos Quests and Island Trials. It does not replace the map, guest journal, identity, plan membership or paid settlement systems.

## Review links and implementation revisions

- Branch: `codex/social-moments-alpha-20261029`.
- PR40 is merged: https://github.com/basedare/basedarefly/pull/40. Main merge: `9ca1e6d4`.
- Product implementation: https://github.com/basedare/basedarefly/commit/dbccd6602d050127939fef4ff50925d5f87dc202.
- Linux disposable-database repair: https://github.com/basedare/basedarefly/commit/42a521bbdd83f3340bffb41bd7ac00849dfb80de.
- Optional sign-in handoff repair: https://github.com/basedare/basedarefly/commit/fe3516c4.
- Follow the PR for subsequent business-entry/security revisions and exact CI/preview state. A READY preview build is not a tested hosted Moment database.

## Status

- **Built and locally verified:** guest offer → optional contribution → private review → canonical approved Moment → another participant’s independent attempt. Social post URL and private original-file adapters, separate display/credit/spotlight permissions, reporting, withdrawal and editorial selection.
- **Built:** Community entry points, genuine place/creator Moment history, creator share kit, private sponsor brief drafts in the existing founder/intake ledger and a founder growth panel over existing attribution records.
- **Production database:** the required Moments migration was intentionally applied on 31 October after a verified backup restore and exact migration rehearsal. The release gate passes 61 migrations / 78 models; all 78 application tables retain RLS. Application rollout and the final deployment receipt are tracked in [the cutover report](../releases/moments-production-cutover-2026-10-31.md). Both new-contribution switches are explicitly off; free guest challenges remain available. A real public Moment still requires a genuine approved submission.
- **Unverified:** private Pinata account capability and actual uploaded-file playback; real phone/passkey recovery; native sharing into installed messaging/social apps; public social source availability/ownership; hosted runtime on an isolated migrated preview database; physical QR/perk redemption; paid mainnet end-to-end settlement. Fixture success does not prove these integrations.
- The 31 October production change is the authorized additive schema migration and its migration-ledger registration. No customer fixture records, creator/business outreach, social posting, contacts import, funds allocation or chain transaction were made.

## Partial and deliberately missing

- **Partial:** map discovery reuses the existing genuine place-story markers and View place handoff to a venue’s Moments. A new inline map-panel Moment gallery is not added to the renderer. Creator Spotlight and independent relay links are implemented; there is no separate contest/comparison engine or winner logic.
- **Partial:** recorded journey/attempt/approval attribution is available. Unique-human reproduction, verified social impressions, moderator hands-on minutes and causal sales need independent evidence; they are not inferred from these records. First-week founder review should record real review minutes manually.
- **Unverified integrations:** see Status and the top five blockers. A provider adapter, configured secret or fixture is not a live upload, recovery, delivery or payout receipt.
- **Design only:** automated view/action compensation, new fees, public bots, Privy migration, automatic social posting/scraping, universal XP/tokens and AR/VR. Existing funded work and evidence rules retain their own readiness gates.

## Exact entry points

| Use | URL | State |
| --- | --- | --- |
| Wave or Ex? | https://www.basedare.xyz/adventures/wave-or-ex | Existing live free challenge |
| Coconut CEO | https://www.basedare.xyz/adventures/coconut-ceo | Existing live free challenge |
| Island Trial 001 | https://www.basedare.xyz/island-trials/no-beaches-allowed | Existing live; choose Siargao, El Nido or Boracay |
| Join a genuine published plan | https://www.basedare.xyz/community | Existing plans; empty inventory stays empty |
| Submit Wave or Ex? creation | https://www.basedare.xyz/adventures/wave-or-ex/submit | New; available after this release |
| Community Moments | https://www.basedare.xyz/moments | New; initially can be empty |
| Your submissions | https://www.basedare.xyz/adventures?shared=mine | Existing entry, extended private status view |
| Review queue | https://www.basedare.xyz/admin/adventures | Existing authorized queue, extended by this release |
| Creator links / sponsor draft | https://www.basedare.xyz/admin/creator-drops | Existing operator workspace; new private draft disclosure |
| Founder metrics | https://www.basedare.xyz/admin/founder-scoreboard | Existing authorized scoreboard; new participation panel |
| Business content enquiry | https://www.basedare.xyz/activations?source=buyer-workspace&missionType=content-brief&goal=ugc&budgetRange=discuss&packageId=pilot-drop&buyerType=other | Existing enquiry; no charge or campaign launch |
| Business discovery enquiry | https://www.basedare.xyz/activations?source=buyer-workspace&missionType=visibility-brief&goal=launch&budgetRange=discuss&packageId=pilot-drop&buyerType=other | New enquiry intent; no promised reach/sales |

A real approved contribution receives `/moments/{actualSubmissionId}`. Its **Beat my dare** action routes through `/moments/{actualSubmissionId}/try` to the original challenge. Do not substitute a fixture ID in a creator pitch or claim that a Moment exists before approval. Creator acquisition links must be created through the existing authorized `/admin/creator-drops` workspace for a real consenting creator; none were fabricated or sent here.

## Founder operation

1. Play the free challenge as a guest. Keep the original authored rules, local-time suitability, safety guidance and personal progress. No account, wallet, purchase, filming or public post is required to finish.
2. A contributor can optionally open **Share your take**, which opens the exact dedicated `/submit` route. That page preserves the activity across sign-in without depending on the guest/account journal or automatically saving private guest history. Sign-in is required only to send/manage the contribution. Accept one full public TikTok video, Instagram post/Reel or X post URL, or one original JPG/PNG/GIF/MP4/MOV/WebM under 4 MB. Profiles, short links, embeds and arbitrary URLs are rejected. Place is optional and must be a genuine active Venue when supplied.
3. New original files go only to Pinata’s private API. There is no public-storage fallback. Failure leaves the contribution unpublished; the client tells the contributor to check My submissions before retrying. Orphaned private uploads after a provider/transaction failure may need provider-side cleanup; no automated deletion is claimed.
4. In `/admin/adventures`, establish the existing administrator session. Load **PENDING**. Open the actual source and inspect the exact challenge, appropriateness, permissions, private details and any claimed place. A social URL does not verify the social account or attendance. If the source cannot be reviewed, do not approve it.
5. Enter a review reason. **Publish Moment** records the authorized reviewer, reason and time, sends the existing in-app notification and exposes the canonical Moment. **Decline / remove** records the reason and keeps it off public surfaces. A previously withdrawn item cannot be republished. **FLAGGED** is the report queue; review before restoring.
6. For editorial spotlight, require an approved creation, an active authorized Baretag credit and the contributor’s separate spotlight permission. This is an editorial example, not a winner. Permission to display/spotlight never grants reposting, editing, advertising, paid usage or a commercial license. Agree those separately through existing rights/brief processes.
7. The public Reality Receipt says **Reviewed creation**, meaning accepted for display. Played is self-reported progress. QR+GPS presence, paid task review and independent commercial outcomes retain their separate existing evidence. No new points, payout eligibility, attendance or winners come from a social URL.
8. A recipient follows the canonical Moment and starts their own run. No sender steps, private notes, opinion, account or completion state transfer. Existing personal history stays theirs. An optional reply submission can reference an approved source by another wallet for the same challenge; only currently approved independent contributions appear in the relay. Distinct wallets are not proof of distinct humans.
9. Authenticated reports immediately hide approved Moments for review. The contributor can withdraw through My submissions. Page, gallery and private-file public reads recheck status; media rechecks after provider I/O to cover a concurrent report/withdrawal. Copies already downloaded/shared elsewhere remain outside this control. Legacy files previously stored publicly may remain accessible at their old provider URLs.
10. Review external-post removals manually or through reports. BaseDare neither scrapes nor continuously verifies platform availability. Link-only Moments show owned challenge art and a clear external-source fallback, not an invented preview or copied thumbnail.

## Private sponsor proposals

Open the disclosure in `/admin/creator-drops` after existing admin sign-in. Describe sponsor, objective, canonical challenge/genuine venue, eligible audience, deliverable, platforms, evidence, review and proposed rights/dates/budget/per-creator/post caps. Optionally reference an existing DRAFT Campaign. The proposal lives in **FounderEvent**, the existing operator/intake ledger, with `PRIVATE_DRAFT`, `NOT_FUNDED`, `PROPOSED_NOT_ACCEPTED`, `paymentEnabled: false` and no amount booked as revenue.

It creates no Campaign, slot, public creator link, participant promise, accepted license or payable balance. This avoids placing an unexecutable idea into Campaign’s existing funding state machine. A real buyer, agreed scope/rights, genuine funding, authorization and normal payment-readiness gates are still required for a separate real launch.

Fixed deliverable, future verified-view, future qualified-action and proposed venue-perk models can be described. None enables automatic performance payouts. The 96% completer / 4% platform settlement split and separate $2,500 Field Sprint ($2,000 service + $500 rewards) remain unchanged.

## Unsent creator pitch

“Want to help set the tone for BaseDare’s first Siargao challenges? Pick one you’d actually enjoy—Wave or Ex?, Coconut CEO or No Beaches Allowed. Try it free; posting is optional. If you make a clip, send the public post link for review and we can give it a page where friends can try the same challenge. There’s no guaranteed payment, views or partnership in this invitation. Any paid content or reuse would need a separate agreed brief. Here’s the challenge: https://www.basedare.xyz/adventures/wave-or-ex”

Personalize only after selecting a real consenting creator. Do not imply an existing relationship or send this draft without founder authorization.

## Unsent X draft

“Your next great travel story might start with a ridiculous question: Wave or Ex? Pick your verdict, play it your way, then dare a friend. Free to try. No account, filming or purchase needed. #BaseDare https://www.basedare.xyz/adventures/wave-or-ex”

## Unsent Reel / TikTok plan

- Hook: “You have five seconds: perfect wave or your ex texting ‘I’ve changed’?”
- Show your own quick verdict, then one safe scene from your day. Don’t film strangers without permission.
- End: “Your turn. Find Wave or Ex? on BaseDare.”
- Optional caption: “My answer might change with the forecast. Yours? #BaseDare”
- Put the exact challenge URL in a supported bio/link sticker. Captions are not universally clickable. Use the in-app share kit; no automatic posting is enabled.
- After this release, an approved actual Moment can replace the generic challenge link. A public handle should be added only after the founder confirms the intended platform account; no account ownership is inferred here.

## Unsent friend message

“I found this ridiculous little travel dare. I’m doing Wave or Ex?—your answer can be completely different. Try it free: https://www.basedare.xyz/adventures/wave-or-ex”

Use native share, WhatsApp, Telegram, Messenger via the phone share sheet, or copy. The person chooses their recipient and sends. A copied link/open draft is not a delivered invitation.

## First week — a small Siargao free pilot

- Day 1: founder verifies guest play/refresh/completion on actual iOS and Android; verifies one real consented social URL submission and review; checks rejection/report/withdrawal. Test private original media with the actual provider before offering that path broadly.
- Days 2–3: founder invites a proposed cohort of five local creators personally, with permission and no reward promise. Ask each to choose one challenge. Measure actual participation, confusion and review minutes; the cohort size is a proposal, not existing supply.
- Days 3–5: approve suitable actual contributions, share their exact Moments only with appropriate permission, ask each creator to invite a friend who might enjoy the challenge. No contact import, bulk DMs or automatic reminders.
- Days 5–7: review where people stop, whether recipients actually start, what they enjoyed, abuse/privacy reports and repeat play. Speak to two interested local businesses about a proposed fixed original-content or safe activity brief. Enquiries are not customers or cash flow.
- Expand only after the small cohort can play, contribute and invite without founder explanation or privacy failures. Pause publication if review capacity is exceeded. Keep Manila/Cebu as later markets.

## What can actually be measured

The founder scoreboard reads existing AttributionJourney/Touch/ActionIntent/AttributionEvent and current AdventureSubmission/FounderEvent records. It reports distinct journey+Moment try requests; deduplicated self-reported starts/finishes; authenticated submissions; first approval records; currently approved Moments; recorded spotlight selections; starts linked to Moment touches; approved wallet identities; returning browser journeys; and recorded business intake submissions. Samples above 10,000 are shown unavailable rather than silently complete. Re-review does not add a second first approval. Approval retains the submission’s frozen acquisition intent/touch.

Guest starts/finishes can be forged and are not physical proof. A journey/cookie is not a unique person; a wallet is not a unique human. Browser storage clearing, cross-device use, blocked requests and time windows limit attribution. Existing client analytics emit Moment opens and share-kit actions only when configured; this does not prove analytics ingestion. Social views/impressions, delivered messages, new unique people across devices, incremental sales and unreviewed enquiry qualification are explicitly unavailable in this ledger. Never turn those into zeroes or revenue.

## Top five launch blockers

1. **Production data compatibility — passed 31 October:** verified backup restore, exact migration rehearsal, transactional production application, Prisma ledger registration, 61-migration compatibility gate and 78-table RLS check. Finish application deployment and live smoke checks; see the cutover report.
2. **Actual contribution integration:** test one permissioned social contribution plus one real private original upload/owner preview/public playback/withdrawal with production-equivalent Pinata credentials. Existing account configuration alone is not proof.
3. **Device continuity and sharing:** actual iOS/Android passkey/wallet reconnect and recovery, exact challenge return after sign-in, installed-app native share and recipient’s fresh run. Desktop fixtures do not certify these.
4. **Operations and rights:** founder owns moderation/report support; set a workable review cadence and launch contact/operating-entity details; get permission before editorial/promotional use. No unreviewed content or unfunded sponsor rewards.
5. **Paid readiness remains separate:** mainnet bytecode/cutover, real funding → proof → review → payout and rejection/refund, legacy FUNDING reconciliation and existing sender/QR/operating gates. This release makes none of those pass.

## Go / no-go

- **Local demo:** GO for the verified guest loop and explicitly labelled disposable contribution fixtures once the checks below pass.
- **Small public free pilot:** NO-GO for this new release until blockers 1–4 are satisfied. The already shipped free guest challenges remain available. A link-only contribution pilot may proceed after its actual integration/device checks and moderation readiness; keep unproven original uploads unavailable to the cohort.
- **Paid commercial launch:** NO-GO until the existing financial and operating gates, including a human-signed real payout and refund rehearsal, pass. No performance-pay experiment is authorized by this build.

## Rollout and rollback

Review the PR and CI. Rehearse the additive migration on an isolated preview database, preserving a legacy submission and browser-role RLS denial. Verify the protected hosted preview against that database. Apply the approved migration before deploying the app, then run the read-only database compatibility gate and the real contribution smoke. Never migrate production as a side effect of build.

31 October update: PR40 is already merged and the migration/backup gate is now satisfied. The ordinary preview shares the production Supabase target and must not be used for synthetic write tests. The hardening continuation adds default-off write switches and visible availability checks; keep both production switches false while device/provider/moderation gates remain.

Prefer a forward fix. Leave the additive schema and records intact on rollback. The previous application assumes a mandatory venue and public media URL; it cannot safely display new nullable/social submissions. A rollback therefore needs an operator-reviewed compatibility plan that pauses new submissions and protects public **and private owner** reads; do not blindly promote an old app over new rows or delete contributions. Stop publication if pending media becomes public, owner scope leaks, withdrawal fails, paid readiness changes, or the map regresses.

## Verification record

Focused policies, legacy forward migration/RLS and real handler/DB privacy tests pass; the prior discovery, Passport and buyer regressions pass. The optimized app also passed actual signed-localhost submission, admin approval, card generation and withdrawal. Final browser/build/Graphify and remote CI results are recorded with the PR. Database tests use a real disposable PostgreSQL database and actual route handlers with explicit auth/storage fixtures; those fixtures are not real wallet/provider/chain evidence. No test success should be presented as a live participant or launch receipt.

## 30 October continuation — business entry

The previous social-loop implementation and sign-in handoff repair are complete locally. Its last remote build hit a newly reported URI decoder advisory; the compatibility-preserving patch and regression checks are included in this continuation. Final head/CI state lives on draft PR40.

Local checks passed: 25 business policies, 70 discovery, 6 Moments, 3 URI security and 4 provider validation tests; real buyer-state DB regressions; both actual optimized local HTTP suites; guest business forms at 320/390px and desktop at 1440px; clean install, typecheck, 0 lint errors, static safety, build and Graphify (4,307 nodes / 5,199 edges).

Business owners now get a plain-language offer, Bring people in / Get creator content / Get more visibility, then Grow my business and a five-field guest enquiry. Existing workspace, targeted campaign/venue/report links, legacy offers and admin intake remain. Requests are saved proposals, never funded or published campaigns. Review remains before live work; no pricing, availability, rights or results are invented. See `docs/releases/business-entry-clarity-2026-10-30.md` for tests and boundaries.

This does not clear the production Moments migration/provider/device gates above or the separate paid-mainnet gates. No outreach, production mutation or funds movement.

## PR #40 — FINAL MERGE READINESS

PR40 itself merged on 30 October. Its failed production build left the prior live version healthy. This classification covers the subsequent hardening/cutover, not a claim that the already-merged PR is still a draft.

- **BLOCKING MERGE:** final hardening CI must pass before its follow-up merges. No new feature scope or weakened security gate is required.
- **BLOCKING PRODUCTION DEPLOYMENT:** required backup, restored migration and production schema checks are now satisfied. Complete the tested hardening rollout and live read/paused-write smoke; keep the migration gate intact.
- **BLOCKING PUBLIC PILOT:** new contributions stay paused pending physical-phone identity/share checks, one real permissioned contribution journey and named moderation/support operation. Private originals additionally require genuine provider upload/playback/revocation checks. Existing guest adventures remain available.
- **BLOCKING PAID LAUNCH:** mainnet bytecode/cutover, actual funding/proof/review/payout and rejection/refund, legacy FUNDING reconciliation, rights and operating details remain outstanding.
- **NONBLOCKING FOLLOW-UP:** remaining moderate/low dependency advisories and warning-only lint debt; a temporary protected test project is not a permanent isolated staging service. No provider credential presence or fixture success clears the gates above.

Final implementation, verification scope, rollback limits and physical-device checklist: [31 October cutover report](../releases/moments-production-cutover-2026-10-31.md).

## Next release — weekly recognition and staged link activation

The founder's next two shared briefs request social links independently of originals, a dated weekly editorial pick and a clearer way to see genuine independent takes. The implementation reuses approved Moments, the existing review queue and FounderEvent; there is no new migration or prize economy. See [the motivation release](../releases/weekly-spotlight-motivation-2026-10-31.md) for exact routes and the controlled founder-test sequence.

Ship code with both production intake flags off. Arrange a bounded founder acceptance window once a genuine permissioned attempt and phones are ready; prove the real flow before broad link activation. Originals remain disabled. Every submission stays pending until real review. The founder supplied official profiles and both phones, but no real challenge post/device result is inferred from those. Guest challenges and business enquiries stay available. Public launch claims still require the genuine source, physical sharing/reconnect and moderation checks; paid gates remain separate.
