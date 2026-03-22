# BaseDare Place Tags MVP

## Product Thesis

BaseDare should make the physical world taggable, memorable, and challengeable.

The core product is not events.
The core product is an ambient place-memory layer where creators leave verified marks on real-world locations and places accumulate living history.

This should feel closer to:
- street tags
- hidden gems
- local legend building
- creator marks left on a city

It should not feel like:
- event software
- coupon check-ins
- generic map pins
- passive attendance farming

## One-Sentence Goal

Let any creator leave a verified cultural mark on a real-world place so the place accumulates memory, heat, and monetizable attention.

## Locked Vocabulary

Use this naming consistently as the social residue layer is built:

- `Spark`: a recent verified creator mark tied to a place
- `Last Spark`: the most recent approved mark timestamp shown publicly
- `Pulse`: the current warmth state of a place
- `Crossed Paths`: the public module that shows recent shared activity at a place
- `Echoes`: later-phase ephemeral notes from verified recent visitors

Do not use:
- `Ghosts`
- `Chaos Level`

Reason:
- `Spark` and `Pulse` better match BaseDare's heat / ignition / dare-energy language
- `Echoes` is reserved for the later note layer, not the first aggregate signal layer

## Primary Users

### 1. Creator

Job to be done:
- "I want to leave a permanent flex here that earns me status, attention, or money."

Wants:
- visible cultural mark
- proof of presence
- discovery
- reward

### 2. Explorer

Job to be done:
- "I want to find places that feel alive, legendary, and worth going to."

Wants:
- mystery
- rising spots
- hidden gems
- social proof

### 3. Venue / Brand

Job to be done:
- "I want creators to organically make this place matter."

Wants:
- creator traffic
- place memory
- discoverability
- repeat cultural relevance

## Core Objects

### Place

A real-world location that can accumulate:
- verified tags
- completed dares
- proof clips
- top creators
- heat
- memory timeline

### Place Tag

A creator's verified mark on a place.

It is not a free-form text graffiti wall.
It should only exist when backed by enough proof.

### Memory Entry

A timeline object attached to a place.

Examples:
- approved place tag
- completed location bounty
- first verified mark
- top moment

### Location Bounty

A bounty tied to a place-specific prompt.

Examples:
- "Tag this alley after dark"
- "Show the weirdest angle of this rooftop"
- "Capture the energy of this beach at sunset"

### Heat Score

A derived signal showing how alive a place is right now.

## MVP Principles

1. Places are the primary object. Dares are one of the things that happen at places.
2. Tags must be verified enough to avoid spam collapse.
3. Heat should reward quality and recency, not raw spam volume.
4. Hidden prompts should create discovery, not admin friction.
5. QR is optional and only used later for higher-trust places.

## MVP Surface Area

## 1. Map: Alive Places Near Me

The map should shift emphasis from:
- "dares near me"

to:
- "alive places near me"

Each place pin should be able to show:
- name
- heat level
- category or vibe
- active bounty count
- whether it is rising

## 2. Place Page v1

Each place page should show:
- place name
- area / locality
- hero image or submitted media when available
- heat score
- memory timeline
- top creator at this place
- active bounties
- `Tag this place` CTA

Optional v1.1:
- "first mark" legend
- recent hidden prompt completions

## 3. Tag Flow v1

Trigger:
- creator is physically near a place
- taps `Tag this place`

Submission fields:
- proof media (required)
- optional caption
- optional vibe tags
- optional linked bounty or prompt

Output:
- pending review object
- if approved:
  - appears on place timeline
  - contributes to heat
  - contributes to creator reputation

## 4. Hidden Prompt v1

Some prompts should only reveal nearby.

Examples:
- visible only inside a geo fence
- visible only during a time window
- visible only after the user opens the place page nearby

Purpose:
- inject mystery
- create a reason to open the app in the wild
- reward discovery behavior

## 5. Location Bounty v1

Anyone can stake USDC on a prompt tied to a place.

MVP rule:
- simplest version is first valid approved completion wins

If completed:
- the payout resolves
- the proof becomes a memory entry
- the place heat increases

## Verification Rules

## What makes a tag real

A place tag is valid only if:
- creator is inside the required geo radius
- proof media is original enough and platform-submitted
- timestamp is recent and within allowed window
- submission is relevant enough to the place or prompt
- referee approves it

## MVP trust stack

1. GPS proximity
2. recent timestamp
3. uploaded media proof
4. manual referee review
5. replay / duplicate checks

Later:
- rotating QR for high-trust claimed places
- computer vision similarity checks
- social vouching from high-rep creators

## Heat Score v1

Start with a simple model:

- approved place tag: +10
- completed location bounty: +20
- first approved mark: +15
- unique creator bonus: +5
- repeat same creator at same place in short window: diminishing returns
- rejected spam or fraudulent proof: negative adjustment

Heat should represent:
- recency
- uniqueness
- activity quality
- proof-backed cultural energy

Heat should not become:
- a farmable point counter

## Memory Timeline v1

A place memory timeline should show:
- approved tags
- completed bounties
- notable proof clips
- first marks
- recent creator activity

This is the screenshot-worthy surface.

If a place page does not feel screenshot-worthy, it is not ready.

## Anti-Spam Rules

1. Rate limit tags per creator per place.
2. Apply diminishing returns to repeat same-place tagging.
3. Reject duplicate media.
4. Penalize repeated rejected proof.
5. Do not let text-only or unverified tags hit the public timeline.

## What Success Looks Like

In the first 30 days, success means:
- 50+ unique places tagged
- 10+ places with meaningful heat
- 3+ paid location bounties completed
- repeat tagging from real creators
- screenshots or shares of place pages and memory timelines

## What To Delay

Do not build yet:
- full venue chat
- district warfare
- giant loyalty systems
- heavy QR usage
- full token mechanics
- giant brand dashboards

Those come after the place-memory loop feels alive.

## MVP Summary

The first shippable version is:
- map of alive places
- place pages
- creator place tags
- memory timeline
- basic heat score
- hidden nearby prompts
- simple location bounties

That is enough to validate the category.
