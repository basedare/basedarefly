# BaseDare Venue System Technical Spec

## Purpose

This document translates the IRL venue strategy into a first-pass technical shape:
- data model
- API surface
- QR session logic
- validation rules

It is intentionally MVP-biased.

## System Scope

The first venue-system slice covers:
- venue records
- venue check-ins
- venue memory aggregation
- rotating QR validation
- minimal venue console support

It does not yet cover:
- venue chat
- district warfare
- full perks engine
- sponsor campaign orchestration

## BaseDare Secure Handshake Concept

In technical terms, QR should be treated as a secure handshake starter for trusted actions.

Default rule:
- links are the normal communication layer
- QR is the high-trust transition layer

Examples of high-trust transitions:
- venue check-in
- dare unlock
- dare claim
- perk redemption
- staff validation

## Entity Overview

### Venue

Represents a real-world place on the BaseDare map.

Primary needs:
- canonical identity
- coordinates
- partner status
- check-in configuration
- optional source metadata

### VenueCheckIn

Represents a presence-proof event at a venue.

Primary needs:
- who checked in
- how presence was validated
- what time window applied
- whether a QR token was involved

### VenueMemory

Represents an aggregated venue history bucket.

Primary needs:
- counts by time bucket
- unique creators
- completion volume
- top-activity summary

## Proposed API Surface

### Venue discovery

`GET /api/venues/nearby`

Inputs:
- `lat`
- `lng`
- `radiusMeters`
- optional filters

Returns:
- nearby venues
- active campaign hints
- light memory summary

### Venue detail

`GET /api/venues/:slug`

Returns:
- venue metadata
- memory summary
- active dares
- top creators
- live status

### Venue console session

`POST /api/venues/:id/console/session`

Creates or refreshes a live venue console session.

Returns:
- session id
- venue status
- active QR token metadata
- expiry

### Venue QR payload

`GET /api/venues/:id/qr`

Returns the current rotating QR payload for the active session.

Returns:
- token
- expiry timestamp
- campaign label
- check-in instructions

### Venue check-in validation

`POST /api/venues/check-in`

Inputs:
- venue id
- QR token
- wallet address
- optional claimed tag
- optional GPS coordinates
- client timestamp

Returns:
- success or failure
- proof level used
- points unlocked
- perk or dare unlocks

### Venue lightweight stats

`GET /api/venues/:id/stats/live`

Returns:
- scans in last hour
- unique visitors today
- active campaign state

## QR Token Model

The QR itself should not be the truth.

Recommended payload pattern:
- opaque server-issued token
- bound to venue id
- bound to console session id
- short expiry
- single-use or limited-replay server logic

Do not encode business logic directly in the visible QR string beyond what is needed to resolve the token.

## Suggested Handshake Scopes

First-pass scope values:
- `VENUE_CHECKIN`
- `DARE_UNLOCK`
- `DARE_CLAIM`
- `PERK_REDEEM`
- `STAFF_VALIDATE`

Each token should be scoped so a valid check-in token cannot be reused as a perk or dare claim token.

## Presence Validation Rules

Recommended validation steps:

1. Resolve venue session
2. Verify token exists and has not expired
3. Verify token belongs to the venue
4. Verify wallet or session identity exists
5. Optionally verify GPS is within venue radius
6. Check replay policy for same user and same time window
7. Write check-in event
8. Trigger rewards or memory updates

## Check-In Status Model

Suggested values:
- `PENDING`
- `CONFIRMED`
- `REJECTED`
- `EXPIRED`
- `REPLAY_BLOCKED`

## Proof Levels

Suggested values:
- `QR_ONLY`
- `GPS_ONLY`
- `QR_AND_GPS`
- `STAFF_OVERRIDE`

## Memory Aggregation

VenueMemory should be bucketed.

Recommended first bucket types:
- `HOUR`
- `DAY`
- `WEEK`

Each bucket can store:
- check-in count
- unique visitor count
- dare count
- completed dare count
- proof clip count
- top creator tag

## Dare Integration

The first venue draft should allow a dare to point at a venue.

Recommended approach:
- add optional `venueId` to `Dare`
- keep existing location fields for compatibility
- allow a venue-linked dare to still use nearby discovery logic

## Venue Console Requirements

The tech surface needed for the console is intentionally small:
- one active session per venue
- one current token
- one expiry clock
- one pause or resume mechanism
- one lightweight stats query

## Security Notes

- do not trust the client timestamp alone
- do not trust a QR without server validation
- do not treat GPS as sufficient for high-trust presence
- do not allow unlimited repeated scans in a short window

## Rollout Plan

### Phase 1
- data models
- one venue console session flow
- rotating QR
- check-in validation

### Phase 2
- venue detail pages
- memory cards
- points and perk hooks

### Phase 3
- sponsor and district logic
- richer analytics
- chat and social layers
