# Unified Pulse P0 — reviewed text publishing

The previous Create entry only offered missions/challenges/meetups. Ordinary experience sharing was missing. This slice gives the existing Community composer a text-story option, connects its existing review records to Now and map, and preserves the canonical place/identity/actions around each post.

## Implementation and reused systems

- Home/shared metadata and Now use the locked positioning; approved artwork/layout/materials remain. Create asks What would you like to share? with a direct story entry and existing challenge/meetup/paid options. Media and authorized venue tools remain contextual disclosures.
- LOCAL_SIGNAL/FounderEvent stores community stories with immutable source kind, authorTagId, immutable author-wallet snapshot, consent version/time and idempotent author/submission key. Five submissions per author/day. Identity derives from the existing primary Baretag resolver and signed/session authorization. No schema/dependency/auth/media provider added.
- Optional place is an existing active Venue; unplaced stories use coarse selected browsing coordinates. These are not presence evidence. Independent stories always say Community experience; official venue publishing still uses the existing authorized workspace.
- Shared public Local Signals projection rechecks current approval, active/verified author, display consent and active associated venue. It omits internal operator fields and unsafe legacy source URLs. No-store prevents response-cache reuse after withdrawal; existing open clients refresh on normal navigation/polling.
- New canonical server-rendered /community/posts/[id] has meaningful text, real place/area actions and report/withdraw disclosure. Pending/withdrawn/reported/invalid-source reads are unavailable. Story pages remain noindex during acceptance; existing venue/activity SEO remains.
- Creator identity transfers cannot inherit old stories: public reads require the original wallet, while the original author retains withdrawal. Owner status and withdrawal reuse identity authorization, with account-scoped client state. Owner management can withdraw even after tag eligibility is lost. A first authenticated report returns the post to NEW in the existing queue; private reasons appear for the moderator. Reports cap at five/account/day and retries cannot re-hide resolved content. Withdrawal and review share a row lock; withdrawal is terminal. Story approvals never trigger the legacy Telegram broadcast.
- Now and map consume the same canonical story source. Stories never create independent map markers; linked place markers remain canonical. Timing labels distinguish personal stories from scheduled plans, live activity and verified visits. Public reads never fabricate an event when the database fails.
- Existing stable three-details adventure becomes Make the ordinary look unreal / Dare001, reusing its three steps, journal and invitations. Filming/sharing stays optional and no reward is promised.

## Verification

Actual disposable PostgreSQL/handler tests use real ECDSA author and stranger signatures (only the ambient NextAuth session is explicitly absent in this non-browser harness; operator identity is a fixture). Cover unauthorized/consent refusal, retry conflict/concurrency, private pending, exact public projection, geographic filtering, canonical optional venue, coarse coordinates, author/place revocation, reporting/re-review, resolved retry and withdrawal-vs-approval. Existing migration/media/retention/financial guards remain. Browser/CI receipts accompany the PR and distinguish local fixtures from provider/physical evidence.

## Release and rollback

Founder requested a reviewable P0 PR and explicitly withheld automatic merge/deploy. No production migration/config/data change or outbound message. To roll back after an approved rollout, pause story creation, retain terminal withdrawal/report/public-read protections and existing ledger records. Do not revert to the old local-signals public serializer over story rows: it predates consent/current-source checks. A forward fix is preferred; no destructive database rollback is required.

Meaningful residual risks: real phones/passkey/session reconnect still need field acceptance; process-local outer throttles are supplemented by durable author/report caps; recent-list selection is bounded, not exhaustive; old viewers may retain previously displayed text until refresh; no claim of physical truth or unique humans follows from story submission.
