# BaseDare IRL Venue System

Related docs:
- [QR Product Spec](./venue-qr-product-spec.md)
- [Venue Console MVP](./venue-console-mvp.md)
- [Venue System Tech Spec](./venue-system-tech-spec.md)

## Thesis

BaseDare should treat venues as living social surfaces, not just coordinates on a map.

The core asset is not the base map provider. The core asset is the venue memory layer:
- who showed up
- what dares happened there
- what proof was earned there
- who leads locally
- what perks unlock there
- what time-based culture exists there

That turns a venue from a static pin into a place with memory, status, and repeat traffic.

## Strategic Principles

1. The moat is the venue memory graph, not the basemap.
2. Map infrastructure should stay portable and preferably open.
3. Presence proof should become hybrid over time: GPS + rotating QR + time window.
4. Venue experiences should feel alive and social, not like a coupon app.
5. Perks and discounts should reward status, streaks, and verified presence.
6. Tourism and foot traffic matter because Basedare can turn places into live destinations.
7. QR should be treated as a premium trust and access layer, not as generic navigation.

## BaseDare Secure Handshakes

BaseDare should use QR as a secure handshake primitive for high-trust actions.

Good handshake use cases:
- venue check-in
- dare unlock
- dare claim
- perk redemption
- venue staff validation

Bad handshake use cases:
- normal browsing
- generic link sharing
- ordinary navigation

This means:
- links remain the normal communication layer
- QR remains the trusted transition layer

The QR itself is not the source of truth.
The server-verified handshake is the source of truth.

## Map Stack Direction

Default long-term stack:
- MapLibre GL JS
- OSM-derived tiles via Protomaps, PMTiles, or OpenMapTiles
- BaseDare-owned venue/place data
- BaseDare-owned overlays for dares, heat, territories, and memory

Google Maps is acceptable for speed or selective enrichment, but should not be the long-term foundation for the venue memory layer because:
- usage-based cost can grow quickly
- platform rules reduce portability
- BaseDare should own the place graph and social data

## Core Product Layers

### 1. Venue Layer

Each venue should have:
- canonical venue id
- name
- location
- categories
- operating hours
- status flags
- optional partner metadata

### 2. Memory Layer

Each venue should accumulate:
- completed dares
- proof clips
- top creators
- top moments
- streaks
- historical footfall/check-ins
- time-of-day activity patterns

### 3. Presence-Proof Layer

Presence should not rely on GPS alone.

Preferred ladder:
1. GPS/geofence
2. Rotating QR at venue
3. Time window validation
4. Optional venue staff confirmation
5. Optional BLE/NFC later

### 4. Social Layer

Each venue can evolve into:
- a live venue feed
- a venue chat or room
- local creator leaderboard
- active challenge board
- venue-specific rivalry or territory loop

### 5. Commerce Layer

Later venue commerce can include:
- discounts
- happy-hour unlocks
- creator perks
- loyalty rewards
- sponsor-funded venue missions

## Rotating QR Concept

Rotating QR is one of the strongest future presence mechanics for BaseDare.

Why it matters:
- harder to spoof than GPS alone
- works indoors
- lets venues actively participate
- ties activity to exact time windows
- is easy to explain to users

Recommended design:
- venue runs a lightweight BaseDare Venue Console on tablet or phone
- QR rotates every 30 to 60 seconds
- creator scans in the app
- scan is validated against:
  - venue id
  - current time window
  - wallet/tag identity
  - optional GPS proximity

Result:
- check-in event
- points
- dare eligibility
- reward unlock
- venue analytics increment

## Tourism and Foot-Traffic Hypothesis

BaseDare can affect tourism and foot traffic if it gives people a reason to go somewhere now.

The strongest drivers are:
- urgency
- status
- social proof
- reward

Good examples:
- complete this venue dare before 8pm
- top creators at Bondi this week
- unlock happy-hour access after one verified venue check-in
- complete three dares in one district to unlock a city badge

This can help:
- nightlife traffic
- event attendance
- local discovery
- student traffic
- sponsor activations
- tourism discovery loops

## MVP Direction

Keep MVP simple. Do not build the full city-memory system at once.

### MVP-1
- real venue pins
- venue profile pages
- dares attached to places
- GPS-based nearby discovery

### MVP-2
- venue memory cards
- venue feed
- top creators per venue
- venue streaks and activity history

### MVP-3
- rotating QR check-ins
- time-window events
- venue console
- loyalty and perk rules

### MVP-4
- venue chat
- district leaderboards
- perks and discounts
- sponsor activations

## Data Model Direction

Future venue-related entities likely include:
- `Venue`
- `VenueCheckIn`
- `VenueMemory`
- `VenuePerk`
- `VenueCampaign`
- `VenueMessage`
- `VenueLeaderboardSnapshot`

Important rule:
BaseDare should own these entities even if third-party maps or enrichment providers are used.

## Product Guardrails

Do not let this become:
- a generic map app
- a generic discount app
- passive check-in farming
- GPS-only spoofable growth hacks

It should feel like:
- local legend building
- live place culture
- creator status in the real world
- social energy tied to real venues

## Near-Term Experiments

High-value experiments:
1. Add richer venue metadata to map pins and venue pages.
2. Show memory stats per venue: dares, creators, top moments.
3. Prototype rotating QR at one friendly venue.
4. Test one time-window perk, such as a happy-hour unlock.
5. Measure whether venue-based challenges increase repeat visits.

## Metrics To Watch

Venue-health metrics:
- check-ins per venue
- unique creators per venue
- repeat visits
- dare completion rate by venue
- footfall by time window
- perk redemption rate
- clip volume per venue
- new users generated per venue

Tourism/activation metrics:
- district completion rate
- multi-venue journey completion
- event-day lift
- sponsor conversion or redemption rate

## Open Questions

- When should GPS be mandatory versus optional?
- How much should venue memory be public versus creator-only?
- Should venue chat exist before moderation tools are mature?
- What is the first venue partner vertical: bars, clubs, cafes, gyms, beaches, or festivals?
- Should perks be funded by venues, sponsors, or the BaseDare treasury?
