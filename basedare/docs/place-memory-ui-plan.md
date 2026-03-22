# Place Memory UI Plan

## Purpose

Outline the exact UI shifts needed to turn the current venue-and-dare presentation into a place-first ambient memory product.

The goal is not a redesign for its own sake.
The goal is to make the product feel like:
- alive places
- creator marks
- hidden discovery
- memory and heat

## Design Principle

Places should feel:
- discovered
- tagged
- remembered
- culturally alive

They should not feel:
- administratively managed
- over-explained
- couponized
- like static directory pages

## Locked UI Language

Use the following terms for the first social-residue layer:

- module title: `Crossed Paths`
- recent activity unit: `Spark`
- recency label: `Last Spark`
- place warmth state: `Pulse`
- later ephemeral note layer: `Echoes`

Recommended pulse states:
- `igniting`
- `blazing`
- `simmering`
- `cold`

Avoid:
- `Ghosts`
- `Chaos Level`

## 1. `/map` Product Shift

## Current emphasis

The current map still leans toward:
- dares
- bounty cards
- mission-table framing

## New emphasis

The map should primarily answer:
- what places are alive near me?
- which places are rising?
- where are the hidden gems?
- where can I leave a mark right now?

## UI changes

### Replace the mental model

Primary object:
- place pin

Secondary object:
- active bounty or prompt attached to a place

### Pin states

Instead of only:
- live
- funded
- done
- hot

move toward:
- rising
- tagged
- bounty live
- legendary

### Hover / detail card

Each place card should show:
- place name
- heat score
- top creator
- recent tag count
- active bounty count
- short vibe line

### Top controls

Recommended filters:
- `Alive Now`
- `Hidden Gems`
- `Bounties`
- `Nearby Tags`

### New CTA

If user is near a place:
- `Tag Here`

If not:
- `Open Place`

## 2. Place Page Shift

Use the current venue detail page as the starting shell.

## New hero priorities

The hero should show:
- place name
- heat score
- vibe or category
- top creator or first mark if meaningful
- `Tag this place` CTA

This should feel like a page for a culturally active location, not a venue dashboard.

## Content modules

### Module 1: Memory Timeline

This should be the core surface.

Show:
- latest approved tags
- recent completed dares
- notable proof clips
- first mark
- legendary moments

### Module 2: Heat / Vibe

Show:
- heat score
- rising or cooling signal
- short explanation of why this place matters

### Module 3: Active Bounties

Show:
- open location bounties
- reward value
- expiry
- prompt summary

### Module 4: Hidden Prompt

If nearby and eligible:
- reveal mystery prompt

If not nearby:
- show a teaser state such as:
  - `Something unlocks here nearby`

## 3. Tag Submission UI

## Trigger

`Tag this place`

## Submission screen should include

- short title: `Leave your mark`
- proof upload
- optional caption
- optional vibe tags
- optional linked bounty badge
- confidence / proximity note

Tone:
- creator mark
- not attendance form

## States

### Pending
- `Mark submitted`
- `Awaiting referee review`

### Approved
- `Your tag is live`
- heat increase shown
- place memory updated

### Rejected
- concise reason
- encourage retry with stronger proof

## 4. Hidden Prompt UI

Keep this subtle and dopamine-rich.

Good approach:
- nearby glow on map
- teaser on place card
- reveal card only when inside radius

Avoid:
- giant modal theatrics
- too much explanatory copy

## 5. Creator Identity on Places

Places should make creator identity visible.

Useful UI elements:
- top creator chip
- first mark badge
- recent tag avatars or handles
- creator mark count

This helps place pages feel socially alive.

## 6. What To Remove or De-Emphasize

On place pages, de-emphasize:
- venue-console language as the main product story
- heavy operational status blocks
- QR mechanics on every place

Keep those available for:
- claimed places
- premium trust layer
- later higher-trust workflows

But the public-facing place page should foreground:
- memory
- heat
- tags
- active bounties
- mystery

## 7. MVP UI Sequence

### First pass
- rename product language from venue-centric to place-centric where appropriate
- update `/map` card and filter language
- add heat and top-creator presentation

### Second pass
- add place timeline UI
- add `Tag this place` flow

### Third pass
- add hidden prompt reveal states
- add rising / hidden gem states

## 8. Screenshot Test

The UI is ready when:
- a place page looks like a place with legend
- a map screenshot looks like a city with live hidden energy
- a creator would want to share their mark publicly

## Bottom Line

The UI shift is mostly about changing the center of gravity:

from:
- venue data
- operational status
- challenge list

to:
- place identity
- creator tags
- memory
- heat
- hidden discovery
