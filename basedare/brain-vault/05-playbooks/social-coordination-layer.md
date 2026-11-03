---
type: playbook
system: basedare-brain
status: ACTIVE
created_at: 2026-07-12
owner: BaseDare founder
agents: Claude (Fable 5) + Codex 5.6 Sol — task split below is binding
---

# Social coordination layer — plan & task split

> The Hostelworld lesson: **shared place + overlapping time + visible intent = a
> socially safe reason to connect.** Hostelworld anchors that context in a booking
> (and now sells it standalone as Social Pass). BaseDare anchors it in a Dare, RSVP,
> verified presence, or place contribution — and improves on Linkups because our
> gatherings leave something behind: verified attendance, proof media, place signals,
> reputation, map lore.
> Refs: hostelworld.com/social-features · /linkups · /socialpass

## What we already have (do NOT rebuild)

| Hostelworld concept | Our primitive | Status |
|---|---|---|
| Linkups (activity + place + time + who's going) | `Meetup` + `MeetupRsvp` (idempotent, venue-bound, `approxLat/Lng` rounded — never raw GPS) | schema + POST API live; **no composer UI** |
| Event RSVPs | `DropRsvp` | live |
| "Who's here" presence | `VenueRoomPresence` (opt-in `visibility`, self-expiring) | live |
| During-chat | venue rooms (`VenueRoomMessage`, presence-gated) | live |
| After-reconnection | `lib/crossed-paths.ts` (mutual, gated on verified same-venue check-ins) | live |
| 1:1 + group messaging | `InboxThread`/`InboxMessage` | live |

**The gap is surfacing, not primitives:** going-counts on pins, a "Tonight" view,
joiners-only pre-threads, and the meetup composer.

## What we are NOT building (borrowed the right part only)

- ❌ Open city chat (noise + moderation burden + empty-room risk at our density)
- ❌ A traveller feed (map is the feed)
- ❌ Explorer/Social Pass or any charge for basic connection (density first; free →
  sponsored-Dare-subsidized → earned; pass is a LATER upgrade product)
- ❌ Any exposure of precise live location (approx zones + opt-in only, per canon)

## Target map modes (end state)

**Discover** (places, secrets, lore — adventure layer) · **Tonight** (dares/meetups/
drops in the next ~12h with going-counts) · **People** (opt-in participation signals).
Newcomer sees: "Tonight around General Luna — 4 dares · 17 people joining · 3 places
active." Pins carry social proof: `SUNSET DARE · 6 GOING · 48 MIN`.

Chat continuity model (locked): **before** = small thread visible only to joiners of a
dare/meetup · **during** = presence/QR unlocks the venue room · **after** = crossed
paths for mutual reconnection.

## Phases & task split

Ownership rule (standing): **map renderer work = Claude only** (desktop-Chrome
regression history). **Page surfaces / non-map UI / copy = Codex** (proven on /join,
portal, how-it-works). Each agent adversarially reviews the other's PR before merge.

### Phase A — make intent visible (now)

| Task | Owner | Notes |
|---|---|---|
| A1. "Tonight" aggregation API: dares + meetups + drops in a time window, with RSVP/going counts + venue join; one endpoint the map and strip both read | **Claude** | new route + pure windowing/count module w/ tests; no schema change expected |
| A2. Meetup composer UI (create form on /map) | **Codex** | POST API already exists; respect `approxLat/Lng` rounding; BareTag required by model — keep copy honest per canon |
| A3. "Tonight around <area>" summary strip on the map + /join | **Codex** | consumes A1; no renderer changes — plain DOM above the map |
| A4. Canon vocabulary additions (going-counts language, "Tonight", meetup copy) | **Codex** | edit brain-vault/06-social/content-canon.md; no "Linkups" naming — ours: Meetups/Drops/Dares |

### Phase B — social proof on the map (after A ships)

| Task | Owner | Notes |
|---|---|---|
| B1. Pin badges: `6 GOING · 48 MIN` on dare/meetup/drop markers + Tonight mode toggle | **Claude** | marker-layer only, no basemap/compositor changes; reduced-motion; behind toggle |
| B2. Joiners-only pre-thread on dares/meetups (before-chat) | **Claude** schema/API + **Codex** thread UI | reuse Inbox patterns; membership = RSVP'd/claimed only; report/block from day one |
| B3. Adventure-layer phase 1 (marker families: rumor/known/alive/discovered) | **Claude** | same marker layer as B1 — ship together behind `Adventure mode` |

### Phase C — people mode (after B, density-gated)

| Task | Owner | Notes |
|---|---|---|
| C1. Opt-in "looking to join" signal (generalize VenueRoomPresence pattern: visibility + expiry, area-level only) | **Claude** (schema/privacy) + **Codex** (UI) | strictly opt-in, self-expiring, approximate; privacy review is a merge blocker |
| C2. PeeBear guide hooks ("Six explorers heading to a sunset dare nearby — want in?") | **Claude** | reads A1 data; guide, not tamagotchi |

### Gates before scaling any of this

1. **Proof-rail smoke test on prod** (still open — one real proof → ledger row → settle).
2. **Meetup mobile-verify gate** (seeded QA meetup on prod must verify on a real phone
   before the first live meetup).
3. Density seeding: one weekend, one area, real dares/meetups — the "Tonight" strip
   must never show an empty count to a newcomer (hide it below a threshold).

## Safety invariants (non-negotiable, carried from canon)

Opt-in for any people-visibility · approximate zones, never precise pins for people or
sensitive places · joiner-threads scoped to participants · report/block on every social
surface · public places only for meetups · no minors-targeted copy · nothing that
pressures drinking/danger (safe version is the only version that pays).

## Adjustments (2026-07-12 review)

1. **Never hide "Tonight" below a density threshold.** Sparse is honest: the strip
   shows real zeros with an inviting empty state — "Nothing public tonight yet —
   start something simple." Cold-start cities must look early, not broken.
2. **A4 lands before A2's final copy.** Users learn ONE activity noun: everything
   participatory presents as a **Dare**, with types like `Meet up`, `Explore`,
   `Help`, `Earn`. `Meetup`/`Drop`/`Dare` stay distinct models internally only.
3. **A1 contract locked & shipped** (PR: feat/tonight-api): location-agnostic,
   destination-timezone window, rounded coords only, public approved activity only,
   canonical type/id/title/times/place/going/capacity/reward/viewer-rsvp/visibility,
   conservative dedup, honest zero counts (thresholds belong to the UI). Note:
   no map-level Drop model exists yet — drops join the aggregation when they do.
4. **Density seeding = real scheduled activities with honest RSVPs.** Never
   manufactured activity; if the map is sparse, make the first action inviting.
