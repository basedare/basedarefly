# BaseDare Venue Console MVP

## Goal

Provide the smallest possible venue-side interface that can:
- display a rotating QR
- show venue status
- confirm scans are happening
- support a live promotion window

This should feel like a lightweight venue terminal, not a full dashboard.

## Target Device

Primary:
- iPad or Android tablet on a stand

Secondary:
- staff phone in kiosk mode

## MVP Jobs

The venue console must let a venue:
1. open the venue session
2. display a rotating QR
3. see that scans are coming in
4. know whether a campaign is active

That is enough for a pilot.

## Screen Structure

One single-page console is enough for MVP.

### Top Bar
- venue name
- status pill: `Live`, `Paused`, or `Offline`
- current campaign window

### Main QR Panel
- large rotating QR in center
- countdown ring or timer
- short helper text:
  - `Scan to check in`
  - `Scan to unlock tonight's BaseDare`

### Activity Strip
- scans in the last hour
- unique visitors today
- current streak or campaign name

### Footer Controls
- `Pause QR`
- `Resume QR`
- `Refresh`

Keep this minimal. Do not add analytics tabs in MVP.

## MVP States

### 1. Live
- QR visible
- countdown active
- campaign window visible

### 2. Paused
- QR hidden or dimmed
- clear paused message
- one-tap resume

### 3. Expired Campaign Window
- QR can still exist
- unlock message changes
- no perk messaging

### 4. Error
- simple message:
  - `Connection lost`
  - `Retrying...`

## QR Behavior

Recommended defaults:
- rotation every 30 to 60 seconds
- short TTL on backend
- new token generated continuously while session is live

Display:
- QR
- countdown
- venue label
- optional campaign label

Do not show raw codes or operational secrets to venue staff.

## Suggested UI Copy

### Default
`Scan to check in to this venue`

### Dare Window
`Scan to unlock this venue's live dare`

### Perk Window
`Scan now for tonight's venue perk`

### Paused
`Venue check-in is paused`

## Staff Experience

The venue operator should need almost no training.

MVP flow:
1. open console URL
2. log in or use secure venue link
3. tap `Go Live`
4. place tablet on stand

That should be enough.

## Backend Requirements

The console needs:
- current venue session
- current active QR payload
- expiry timestamp
- live scan count
- campaign window metadata

Minimal API needs:
- create or refresh venue session
- fetch current QR token
- pause or resume session
- fetch lightweight stats

## Anti-Abuse Basics

Even in MVP:
- QR token must be server-issued
- token must expire quickly
- pause should invalidate current token set
- venue session should be revocable

## Design Direction

Visual tone:
- dark
- premium
- simple
- live-system feel

Do not make it look like:
- enterprise admin software
- cluttered POS software
- analytics overload

It should feel like:
- a live venue beacon
- a simple ritual device

## Nice-To-Have Later

Not MVP:
- full analytics page
- staff redemptions
- venue leaderboard board
- in-console moderation
- multi-campaign scheduling
- district controls

## MVP Success Criteria

The console is good enough if:
- venue can keep it running all night
- creators understand it instantly
- scans succeed reliably
- venue staff do not need hand-holding
- BaseDare gets trustworthy venue-presence events
