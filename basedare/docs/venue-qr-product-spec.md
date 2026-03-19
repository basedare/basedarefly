# BaseDare QR Product Spec

## Goal

Turn QR scans into trusted venue-presence events that unlock:
- dare eligibility
- leaderboard points
- venue memory
- time-based perks
- sponsor or partner rewards

QR codes are not the product. The workflow after the scan is the product.

## Product Thesis

BaseDare should use QR to prove real-world presence, not just to open a link.

The strongest QR use case for BaseDare is:
- creator arrives at venue
- scans a rotating venue QR
- BaseDare validates place plus time plus identity
- venue becomes more alive socially
- creator earns access, points, or perks

## Primary Jobs To Be Done

### Creator jobs
- prove I was really at the venue
- unlock venue-specific dares
- earn points or status
- collect perks for showing up at the right place and time

### Venue jobs
- verify actual foot traffic
- run time-based promotions
- activate creators without staff overhead
- measure presence and repeat visits

### BaseDare jobs
- reduce GPS spoofing
- create high-signal venue activity data
- build the venue memory layer
- connect place activity to social and leaderboard loops

## Core Use Cases

### 1. Presence-Proof Check-In

Scan proves:
- venue
- time window
- wallet or tag identity
- optional GPS proximity

Output:
- confirmed check-in event
- venue activity increment
- optional leaderboard points

### 2. Dare Unlock

Scan unlocks:
- a venue-only dare
- a hidden challenge
- a district challenge step
- a limited-time mission

### 3. Time-Window Activation

Examples:
- happy hour check-in
- late-night venue challenge
- first 20 visitors get bonus points
- weekly venue streak bonus

### 4. Perk Unlock

Examples:
- top creators get lower prices
- venue regulars unlock better rewards
- verified check-in unlocks sponsor bonus
- complete a local trail and unlock a district perk

### 5. Venue Memory

Each scan can add to:
- venue heat
- top creators
- recent moments
- time-window activity
- repeat visitor stats

## Product Principles

1. QR should prove presence, not act as a brochure link.
2. The scan must feel like access or status, not admin work.
3. Venue perks should feel earned.
4. The system should improve foot-traffic measurement without feeling corporate.
5. QR should complement GPS, not necessarily replace it.

## Scan Types

### Static QR

Use for:
- early prototypes
- low-risk venues
- informational venue actions

Avoid using static QR alone for strong proof because it is easy to share.

### Rotating QR

Use for:
- real venue proof
- anti-replay protection
- timed activations
- partner venues

Recommended default for serious venue programs.

## Recommended Validation Ladder

### Bronze
- scan only

### Silver
- scan plus wallet or tag identity

### Gold
- rotating scan plus identity plus time window

### Platinum
- rotating scan plus identity plus time window plus GPS proximity

BaseDare should aim for Gold or Platinum at partner venues.

## Anti-Fraud Rules

Minimum anti-fraud expectations:
- rotating codes with short TTL
- server-side validation of issued code
- one redemption per user per venue per time window
- replay protection
- optional device fingerprint or session checks later
- optional GPS radius cross-check

Do not rely on screenshot-resistant UX alone. The backend must enforce the truth.

## Identity Binding

QR check-ins should bind to:
- wallet address
- claimed tag if available
- session identity

Priority:
1. wallet
2. verified tag
3. internal session id

## Reward Design

Good reward types:
- leaderboard points
- venue streaks
- district progress
- access to hidden dares
- sponsor-funded boosts
- venue perks

Weaker reward types:
- generic static coupons
- one-off information pages
- meaningless “attendance” badges

## Success Metrics

Core metrics:
- scan-to-valid-check-in rate
- unique creators per venue
- repeat check-ins per venue
- unlock rate for venue dares
- perk redemption rate
- time-window participation rate
- repeat visits after first check-in

Business metrics:
- partner venue retention
- district activation lift
- foot-traffic lift during campaign windows
- sponsor conversion or redemption rate

## MVP Recommendation

### MVP 1
- one venue
- rotating QR
- one reward type
- one time window
- optional GPS check
- minimal venue console

### MVP 2
- multiple venues
- repeat visit tracking
- venue memory cards
- district trails

### MVP 3
- venue chat
- partner dashboards
- sponsor-funded perk layers

## Product Risks

- users see QR as boring admin friction
- venues forget to keep the console active
- rewards are too weak to motivate real visits
- GPS/QR validation is annoying instead of satisfying
- anti-fraud is too weak to trust the data

## Recommendation

BaseDare should treat QR as a venue-proof and access mechanic, not as a generic event-marketing tool.

If implemented well, QR can become:
- a proof layer
- a social layer
- a reward trigger
- a venue analytics source

That makes it one of the strongest bridges between the digital leaderboard and real-world foot traffic.
