# Place Memory Schema and API Evolution

## Purpose

Map the current venue-first implementation into a place-first product without forcing a destructive rewrite.

The goal is:
- preserve the working backend foundation
- shift product semantics toward places and place memory
- add only the minimum new entities required for the Place Tags MVP

## Key Recommendation

Do **not** rename `Venue` in the database immediately.

For MVP:
- treat `Venue` as the first `Place` primitive
- keep routes and models stable where possible
- shift the product language first

Reason:
- this preserves momentum
- avoids migration churn
- lets the product prove itself before data-model renames

## Current Useful Foundation

Existing models already give us a lot:

### `Venue`

Use today as:
- canonical place identity
- coordinates
- categories
- source metadata
- check-in configuration

### `VenueCheckIn`

Use today as:
- place-presence event
- proof of somebody being there

### `VenueMemory`

Use today as:
- aggregated activity bucket
- early heat / memory summary input

### `VenueQrSession`

Use later as:
- high-trust claimed-place handshake
- not required for basic ambient place tags

## New Product Semantics

For MVP, reinterpret the current stack like this:

| Current model | Product meaning now |
| --- | --- |
| `Venue` | Place |
| `VenueCheckIn` | Presence event |
| `VenueMemory` | Place memory aggregate |
| `VenueQrSession` | Optional trusted place session |

## Suggested New Entities

### 1. `PlaceTag`

This is the main missing entity.

Purpose:
- represent a creator's verified mark on a place

Suggested fields:
- `id`
- `placeId` (mapped to current `Venue.id`)
- `walletAddress`
- `creatorTag`
- `status` (`PENDING`, `APPROVED`, `REJECTED`)
- `caption`
- `vibeTags` string array
- `proofMediaUrl`
- `proofHash`
- `proofType` (`IMAGE`, `VIDEO`)
- `geoDistanceMeters`
- `submittedAt`
- `reviewedAt`
- `reviewReason`
- optional `linkedDareId`
- optional `hiddenPromptId`
- optional `firstMark` boolean

Indexes:
- `[placeId, submittedAt]`
- `[creatorTag, submittedAt]`
- `[status, submittedAt]`

### 2. `PlaceMemoryEntry`

Purpose:
- timeline item for the place page

Alternative:
- derive timeline from `PlaceTag + Dare + VenueCheckIn`

Recommendation:
- do **not** create this immediately unless the timeline query becomes painful
- start by deriving the timeline

### 3. `HiddenPrompt`

Purpose:
- geo-revealed or time-revealed place-specific prompt

Suggested fields:
- `id`
- `placeId`
- `title`
- `description`
- `status`
- `unlockRadiusMeters`
- `startsAt`
- `endsAt`
- `rewardType`
- `rewardValue`
- `metadataJson`

### 4. `LocationBounty`

Recommendation:
- avoid a separate table if the existing `Dare` model can represent location bounties

Use existing `Dare` with:
- `missionMode = IRL`
- `venueId`
- `isNearbyDare = true`
- `locationLabel`
- `latitude`
- `longitude`

Add only if necessary:
- `placePromptType`
- `firstValidWins`
- `hiddenPromptId`

## Schema Evolution Path

## Phase 1: Minimal

Add:
- `PlaceTag`

Reuse:
- `Venue`
- `VenueMemory`
- `Dare`

No rename yet.

## Phase 2: Discovery and memory richness

Add:
- `HiddenPrompt`

Maybe add:
- richer derived place timeline queries

## Phase 3: Claimed place trust layer

Use more of:
- `VenueQrSession`
- `VenueCheckIn`

for premium or higher-trust places.

## API Evolution

## Keep

### `GET /api/venues/nearby`

Short-term use:
- still works as the nearby place feed

Recommended product rename later:
- `GET /api/places/nearby`

Additions needed:
- heat summary
- top creator
- tag count
- rising status

### `GET /api/venues/:slug`

Short-term use:
- still works as place detail

Additions needed:
- place tag feed
- derived memory timeline
- heat score
- hidden prompt preview if eligible

## Add

### `POST /api/places/:id/tags`

Purpose:
- submit a place tag

Inputs:
- proof media
- optional caption
- optional vibe tags
- optional linked dare id
- client geo payload

Returns:
- pending review result

### `GET /api/places/:id/tags`

Purpose:
- public approved tags for place page

### `GET /api/places/:id/memory`

Purpose:
- merged timeline or derived memory feed

### `GET /api/places/:id/hidden-prompts`

Purpose:
- reveal prompts only if the user qualifies

### `POST /api/places/:id/hidden-prompts/:promptId/claim`

Optional first pass:
- might not be needed if hidden prompts only feed into a standard dare or tag flow

## Derived APIs Instead Of New Tables

Prefer deriving first when possible:

- heat score from `VenueMemory + approved PlaceTag count + recent completions`
- top creator from approved tags and linked dare completions
- place timeline from approved tags and completed IRL dares

This keeps the MVP lean.

## Heat Score Inputs

Suggested first inputs:
- approved place tags
- unique creators
- completed IRL dares at the place
- first mark bonus
- recency weighting

Do not use:
- raw page views
- raw opens
- unverified submissions

## Migration Philosophy

1. Add the minimum entity that unlocks the product: `PlaceTag`
2. Reuse the current venue foundation as much as possible
3. Delay renaming to `Place` until usage patterns are proven
4. Keep QR session logic optional and premium

## Bottom Line

The MVP does **not** need a full place-system rewrite.

It needs:
- one new first-class verified tag entity
- richer place detail queries
- a place-first product language layered on top of the current venue backend
