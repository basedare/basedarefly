---
type: product_growth_playbook
system: basedare-brain
status: IMPLEMENTED_ALPHA_NOT_DEPLOYED
created_at: 2026-08-01
owner: BaseDare
---

# Creator Drop OS

## Objective

Turn creators into guided entrances to specific BaseDare actions without inventing a
generic referral program, automatic creator commission, or new payout rail.

The first useful loop is:

`creator post -> /go/<slug> -> creator drop landing -> action intent or Mission Pass -> target action -> server-verified result`

This gives each creator a concrete thing to share, and gives BaseDare a truthful read on
which creators move people from attention into real-world action.

## What a creator drop is

A creator drop is a packaged, shareable mission card for one specific action:

- a live Dare
- a public meetup
- a Field Station entry
- a free play challenge
- a venue or place-memory action
- a local ritual such as "what's on tonight"

The creator link still uses the attribution rail:

`/go/<slug>`

That link records the touch and lands on:

`/drops/<slug>`

The drop page explains the creator's hook, the action, the reward or non-reward status,
and offers a Mission Pass so the visitor can leave TikTok/Instagram and continue in a
normal browser.

## Why this exists

Generic creator onboarding is too broad. BaseDare needs creators to narrate the map with
clear prompts:

- "Solo in Siargao tonight? Open this."
- "Rumor or real? Go check this spot."
- "Wakepark Sunday is live. See what's happening."
- "Try this free challenge and put the place on the map."

This makes creator work specific, measurable, and less awkward than asking them to
promote a whole protocol.

## Alpha boundaries

Creator Drop OS does **not**:

- create automatic creator bonuses
- promise revenue share
- replace Dare claim authorization
- authorize proof or payout
- grant sponsor commercial reuse rights
- count views, scans, or clicks as verified arrivals

Only server-accepted proof, check-ins, or linked action completions count as verified
outcomes.

If a creator is marked as the participation owner for a target, that is a reporting
constraint only. It does not let the creator approve their own evidence or bypass
verification.

## Admin workflow

For each creator, create one to three drops at a time.

Each drop needs:

- creator code
- content code
- campaign code
- target type and stable target ID
- local BaseDare action URL
- short title
- human hook
- category
- honest reward label
- creator brief
- proof or outcome prompt

Good drop packets are small enough to send in WhatsApp:

1. Creator link
2. Suggested caption
3. What to film
4. What viewers should do
5. What counts as success

## Metrics

Judge every drop by the same ladder:

1. Touches
2. Action intents
3. Mission Pass saves
4. Target opens
5. Verified completions
6. Repeat decision

The core metric is:

`verified completions / action intents`

High views with zero verified outcomes means the format entertained people but did not
move the map.

## Creator instructions

Tell creators:

> You are not making an ad. You are narrating one small real-world action. Your job is to
> make someone think, "that sounds worth doing today," then send them to the exact
> BaseDare link. BaseDare tracks the path honestly, but only real accepted actions count.

Do not ask creators to explain wallets, USDC, verification policy, or protocol mechanics.
The content should be about the place, the moment, the people, and why it is worth doing.

## First Siargao drop ideas

- `Solo in Siargao tonight?` -> Tonight map intent
- `Rumor or real: hidden sunset spot?` -> Secrets mode
- `Wakepark Sunday check` -> Wakepark action-sports entry
- `Boardwalk bar crawl warm-up` -> nightlife route
- `Free first mark challenge` -> unverified place-memory target

Each must point to live inventory or a safe fallback. Never send a creator audience to an
empty map promise.

