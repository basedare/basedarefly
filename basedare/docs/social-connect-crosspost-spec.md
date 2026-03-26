# Social Connect Phase 1 Spec

## Purpose

Social Connect should make BaseDare feel like the coordination layer for a creator's real-world footprint.

Phase 1 is not about importing years of social history or pretending old posts are verified memory.
It is about making three things coherent:

- identity
- distribution
- growth routing

The first user outcome should be:

- connect a real social account
- see that BaseDare recognizes the handle
- understand what that unlocks
- share approved outcomes more cleanly

## Product Rules

- Connected socials strengthen identity, suggestions, and distribution first.
- Connected socials do not automatically create verified place memory.
- Imported social history, when it exists later, must remain below verified BaseDare marks in trust weight.
- Strong proof language is reserved for approved BaseDare outcomes.
- BaseDare Brain can use social signals for ranking and routing, but not for autonomous posting.

## Platform Order

### Phase 1

1. X

### Phase 1.5

2. TikTok planning and payload design

### Later

3. TikTok posting and login implementation
4. Instagram only after the first two are working and worth the policy overhead

## Why X First

X is the fastest path to a real usable loop:

- clean handle identity
- good fit for post-win sharing
- deep links back to BaseDare
- lowest implementation complexity among our realistic first options

TikTok is strategically important, but should follow after the X rail is clean.
Its posting flow is richer and more native to dare content, but the implementation and review overhead are higher.

## Phase 1 Scope

Phase 1 includes:

1. connected social identity surfaces
2. X-first share rail for BaseDare outcomes
3. Suggested Footprint signals tied to connected handles
4. BaseDare Brain routing hooks for creator growth

Phase 1 does not include:

- automatic social import
- imported residue review queues
- TikTok direct posting
- Instagram support
- autonomous posting by BaseDare Brain

## Current Build State

Already shipped:

- shared X share payload builder
- Social Connect onboarding improvements on `/claim-tag`
- Suggested Footprint seed surface during tag claim

This spec locks what we build next around those foundations.

## User States

### State 1: No social connected

Show:

- why connect matters
- which platform is supported now
- what unlocks after connect

Do not imply:

- instant verification
- imported proof
- auto-sync magic

### State 2: Social connected, no claimed tag

Show:

- connected handle
- recommended tag match
- claim CTA
- map CTA

Primary goal:

- anchor the social identity to the wallet-backed BaseDare identity

### State 3: Social connected, claimed tag, no creator footprint yet

Show:

- identity is ready
- first verified win will start the footprint
- share rail is available

Primary goal:

- nudge toward first on-platform win or live challenge participation

### State 4: Social connected, claimed tag, creator footprint exists

Show:

- connected handle
- verified/claimed state
- live / completed / earned stats
- creator page CTA
- map CTA

Primary goal:

- turn identity into repeat activity and distribution

## Surfaces

### 1. Claim / Connect Surface

Primary route:

- `/claim-tag`

Role:

- connect social
- anchor handle
- introduce Suggested Footprint

### 2. Dashboard Surface

Should show:

- connected platform
- connected handle
- claim status
- share-ready status
- footprint-ready status

This should become the first stable "social status" panel outside the claim flow.

### 3. Creator Surface

Should show:

- linked handle
- platform badge
- share/distribution readiness
- creator footprint summary

This turns creator pages into proof of identity, not just proof of dares.

### 4. Post-Approval Share Surface

After an approved completion or verified outcome, the user should get a first-class share action.

Phase 1 target:

- X share composer / intent rail with stronger BaseDare payloads

Later:

- TikTok-specific export/post flow

## Data We Need

For a connected social account, Phase 1 should preserve:

- provider
- platform handle
- platform id
- platform bio when available
- follower or audience count when available
- wallet address association
- whether a matching claimed BaseDare tag exists

Optional enrichments later:

- engagement stats
- latest linked post ids
- imported residue candidates

## X Share Rail

Phase 1 X payloads should support three states:

1. live challenge share
2. invite / claim share
3. verified completion share

Every payload should try to include:

- place name when available
- challenge title
- bounty or amount won
- target handle when relevant
- clear live or verified state
- BaseDare naming
- exact deep link back into BaseDare

## Post-Approval Share Experience

The current shared X payload rail is the base layer.

The next improvement should be:

- a dedicated post-approval share UI
- clear copy preview
- stronger reward framing
- exact deep link
- optional place mention

It should feel like:

- earned
- sharp
- premium

It should not feel like:

- generic "share this" social clutter
- crypto spam
- a random tweet intent slapped on after the fact

## Suggested Footprint

Suggested Footprint should stay grounded in BaseDare-native truth.

Good inputs:

- matching creator handle
- claimed tag
- existing BaseDare dares
- existing BaseDare earnings
- verified outcomes

Bad inputs for Phase 1:

- scraped post history
- guessed place history
- unreviewed social content imports

Phase 1 Suggested Footprint should answer:

- do we know this creator already?
- do they already have BaseDare signal?
- what is the next best action?

## BaseDare Brain Hooks

BaseDare Brain should use connected social state as an operator signal.

### Safe Automatic Use

- rank creator readiness
- spot unclaimed connected identities
- route creators to claim flow or map flow
- identify creators with live footprint but weak tag anchoring
- flag users whose verified wins should be shared

### Review-Required Use

- proposed outreach referencing connected identity
- suggested campaign or venue routing
- public posting copy

### Human-Only Use

- autonomous posting
- committing to partnerships or creator promises
- any message that implies verified memory from imported social data

## Growth Routing Logic

BaseDare Brain should classify connected users like this:

### Connected, no tag

Action:

- route to claim completion

### Connected, claimed, no footprint

Action:

- route to first win or first live challenge

### Connected, claimed, active footprint

Action:

- route to distribution and repeat participation

### Connected, active, place-linked history later

Action:

- route to imported residue review once that system exists

## Success Metrics

For Phase 1, judge this work by:

- % of connected users who finish tag claim
- % of approved winners who use the share rail
- creator page visits from shared links
- map visits from connected identity flows
- share-to-return conversion

Do not overfocus on:

- number of connected accounts by itself
- raw share count without return traffic

## Risks

- social connect can look stronger than it is if we imply verification too early
- TikTok can distract the team before the X loop is actually clean
- BaseDare Brain can become spammy if it treats connected identity like permission to broadcast

## Next Build Order

1. add first-class connected social status on dashboard and creator surfaces
2. upgrade post-approval share UX beyond plain X intent language
3. define TikTok payload and permission model
4. implement TikTok when the X loop is clearly working
