# Crew Presence — design doc (v0)

**Status:** approved direction, not yet scheduled. Build AFTER the free-meetup
layer clears its real-device mobile QA gate (shared UI surface + same social
muscle). Read `docs/PHILOSOPHY.md` first — this feature must strengthen the
proof-of-presence moat, never dilute it.

## The core inversion (why this isn't Snap Map)

Snap shares **live location** — a background GPS feed of where your phone is.
That is a privacy liability, and it's off-thesis: unverifiable phone density.

BaseDare shares **verified presence**: you appear to your crew ONLY at venues
where you actually checked in (QR + GPS), and only for a bounded window. The
unit of presence is the check-in — the primitive the whole product already
runs on. No background tracking exists, so none can leak.

> Snap shows where phones are. BaseDare shows where your people verifiably are.

## Reuse before build (the infra already exists)

- **`VenueRoomPresence`** already models presence: per venue+wallet unique row,
  `visibility` field, `expiresAt` TTL, `lastSeenAt`. Crew presence is a new
  visibility tier (`CREW`) on this table — NOT a new location system.
- **`VenueCheckIn`** (QR_AND_GPS proof level) is the only trigger that may
  create/refresh a crew-visible presence row.
- Map already renders a human-presence layer (green halos + count labels) and
  the panel has Who's Here. Crew adds *names/avatars for mutuals* to surfaces
  that already exist.

## Crew graph (v1)

- **Mutual-only, small.** No followers, no public counts. Cap ~30 per user.
- **Invite IRL:** by @tag or QR at a venue. Both sides confirm → mutual edge.
- **Bootstrap via Crossed Paths:** two wallets with verified proofs at the same
  venue on the same night become *suggestable* to each other — only if BOTH
  have opted into suggestions. No cold discovery of strangers.
- New table: `CrewEdge { aWallet, bWallet (a<b canonical), status: PENDING |
  MUTUAL, createdAt, confirmedAt }`.

## Privacy rules (non-negotiable)

1. **Ghost mode is the default.** Visibility is opt-in **per night** ("Go
   visible tonight"), auto-expiring — never a standing broadcast.
2. **Venue-snapped only.** Crew see you AT a venue pin, never at raw
   coordinates, never between venues.
3. **TTL everything.** Presence rows expire (checked-in window + grace, or
   midnight local, whichever first). Expired rows are purgeable, not archival.
   Crew NEVER get a location history — your footprint stays yours.
4. **Panic switch.** One tap → invisible now + delete current presence rows.
5. **Presence requires verification.** No check-in, no presence. This is the
   moat restated as a privacy feature: nothing to show that didn't happen.

## Map + panel rendering

- Crew members render as small PeeBear avatars clustered ON the venue pin
  (green human-presence layer, which stays green — live people, not venue
  trust; the gold/purple/cyan/gray trust law is untouched).
- Venue panel Who's Here gains a crew line: "2 of your crew are here."
- Nearby Now dock may say "Crew night: 3 at Hideaway" — same spike pattern as
  Popping Now, crew-scoped.

## Phases

- **P0** — CrewEdge + IRL invites; crew count in Who's Here. No map avatars.
- **P1** — "Go visible tonight" toggle; crew avatars on pins; TTL purge job;
  panic switch.
- **P2** — Crossed-paths suggestions (double-opt-in); crew notifications
  ("crew checked in nearby") — respect quiet hours, never engagement-bait.

## Anti-goals

- No continuous/background location. Ever.
- No presence visible to non-crew. No public "who's where" firehose.
- No presence without a verified check-in.
- No streak-style guilt mechanics on visibility ("you haven't shared in X
  days" is banned copy).

## Open questions before P0

1. Auth hardening: presence reads must be scoped server-side to mutual edges
   (never filter client-side).
2. Legal/privacy copy for the visibility toggle (explicit, plain-language).
3. Whether venue operators see crew presence in aggregate only (probably yes:
   counts, never identities).
