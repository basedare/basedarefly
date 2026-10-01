# Shared adventures and people — 1 October 2026

## Released scope

Complete a free adventure, then optionally share one photo or short clip (4 MB maximum), a caption and an existing public place. A required display consent is separate from optional permission to contact the contributor about promotion. That contact preference is not a licence for venue or social-channel commercial reuse.

An authenticated admin reviews submissions at `/admin/adventures` (also linked from Island Pulse). Approval publishes them on the homepage, shared-adventure page and purple/gold B map layer. Hashtags link to homepage results; share links open the individual post, and Try this adventure preserves its place. Owners can withdraw listings. Uploaded media is publicly stored even before approval, as disclosed in the form; withdrawal removes discovery but does not promise removal of copies or the underlying storage URL.

Community’s Find people & friends disclosure searches active public profiles and supports request, accept, decline, cancel and remove. Connections are private, use wallet authorization, respect existing blocks and never expose live location. Closed requests cannot be resent. Friendship does not override the existing chat eligibility rules.

Tonight offers Start a meetup and Invite a friend for matching loaded venue records. Meetup creation preserves the venue and title; users choose the actual time next. Weekly nightlife patterns remain explicitly unconfirmed. PeeBear reveals words sequentially with a small head motion; tap once to reveal the whole line and again for another hint. Reduced motion shows the complete text immediately.

## Verification

- Production Next build, TypeScript and static production safety checks.
- Disposable PostgreSQL replay of all 59 migrations; adventure tests cover authorization, consent, duplicate concurrent upload, pending privacy, concurrent moderation, hashtag/area filters, withdrawal, daily caps, friend requests/blocks and no verified evidence or points creation.
- Existing Mission Pass PostgreSQL integration covers lock, issue, open, recover and list.
- Mobile browser checks: free activity completion and optional sharing; sign-in preserves the page; reviewed cards, hashtag and try links, B map marker and Tonight venue links. Preview content was browser-only; nearby venue data came from the public API. No real submissions, friend requests or meetups were published as tests.
- Production additive migration applied explicitly before app release. Read-only database compatibility gate passed: 59 migrations and 77 models.

## Limits and operating requirements

Moderation requires an operator; no automatic approval. Rejected uploads show a reason; editing/resubmitting the same run is not implemented. New user-authored adventure templates, social-channel posting and automatic media reuse are not part of this release.

`/missions` is saved private continuation, not the paid-work dashboard. Production email recovery remains disabled and its delivery configuration is absent. In-app notification records are created for reviews and friends; physical-phone push/email delivery was not verified. Real wallet signing and Pinata upload were not exercised in production; integration tests use auth/storage adapters.

The existing mainnet bounty-contract mismatch remains a separate paid-launch blocker. No payment, BaseCash/Yodl conversion, sponsored perk or commercial-rights gate is changed here.

## Rollback

Revert the application commit if submission privacy, map controls or existing discovery routes regress. Leave the additive tables and migration history intact. Disable public discovery by reverting the app rather than deleting contributor data. Do not remove the database migration during rollback.
