# Living local economy and Sessions — audit and delivery plan

Baseline: `ed36292e` (origin/main, PR50), isolated branch `codex/living-economy-sessions`. Existing dirty working copies are untouched.

## Audit findings

- Next16/React19, Prisma6/PostgreSQL, MapLibre, canonical Venue and StreamerTag, existing session/signed-wallet authority. No new identity/provider required.
- Meetup + MeetupRsvp already provide public hosting, map pins, share links and audience intent. VenueEvent remains the separate sourced/official event rail. Sessions will extend Meetup rather than create another event feed.
- Existing SocialFollow/SavedItem re-resolve current identities and blocks; extend for collective Nodes. Venues remain Venue records, people remain StreamerTag records; Nodes represent a person project or consenting collective, not accounts or live person pins.
- No structured direct booking or performer guest approval exists. Community Ask/Offer forbids commercial requests and is not suitable for booking terms. Add narrow explicit opportunity/request records, with immutable terms, bounded capacity, transactional decisions and independent completion attestations.
- AdventureSubmission provides private Pinata originals, quotas/deduplication, explicit display consent, moderation and terminal withdrawal. Preserve it. New recordings reference these canonical submissions; no second upload pipeline.
- BaseClips media exchange v1 exists in the separate local BaseClips repository (`integrations/basedare/client.ts`, `schemas/basedare-media-v1.json`), not in this app. It accepts moment/place/dare targets and separate processing/publication/evaluation/training grants. Compatibility must be tested, not assumed to be deployed.
- Existing payment/phone/provider acceptance remains incomplete. This increment records paid terms only; no collection, escrow, commission, settlement or paid-success inference.

## Phases

1. Foundation: additive migration, owner/member permissions, public Node pages, canonical venues, existing follows/saves; audit history.
2. Economy: venue-bound offers/needs/gigs/collaborations/experiences, free/barter/paid terms, requests and accept/decline/cancel, dual completion receipt; discovery linked to the actual map.
3. Sessions: one-to-one Meetup format, public audience RSVP, separate bounded guest applications/approvals, host and participant attestations; no private Sessions or recurrence in V1.
4. Recordings: canonical private Moments, explicit source/music/featured-person permission, independently scoped processing grants, exact BaseClips local exchange payload, expiry/withdrawal; no automatic publication.
5. Verification: real disposable PostgreSQL authorization/lifecycle/race/migration tests, types/lint/build, existing regression suites, responsive browser checks, release checklist and pilot fixtures.

## Pilot boundaries

Siargao / Bhabie Waves is a fixture and operating plan until the real band, members, host, venue and contributors consent. No invented performance date, partner, achievement, availability or production profile. First real loop: consented Node → venue offer or Session → approved guests → audience RSVP → two-sided participation receipt → independently permissioned recording → reviewed BaseClips candidate. Physical phone/provider/rights/publication acceptance stays explicit.
