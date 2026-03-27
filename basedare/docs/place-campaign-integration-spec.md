# Place Campaign Integration Spec

## Purpose

Turn Brand Portal and Shadow Army from a parallel campaign economy into a brand layer on top of the existing BaseDare graph.

This spec locks the Phase 1 architecture:

- one `PLACE` campaign creates one real venue-linked challenge
- it uses the existing `bounty-flow.ts` rail
- campaign metadata wraps the challenge
- completion settles through the normal dare lifecycle
- results write back into campaign, brand, scout, creator, and place surfaces

This is the non-gimmick path.

## Locked Decision

### Phase 1 model

**One campaign -> one place challenge**

Not:

- one campaign spawning many venue challenges
- one campaign becoming its own parallel settlement object
- a second funding rail just for brands

Yes:

- brand creates one place campaign
- that campaign creates one real BaseDare challenge
- the challenge is tied to a canonical `venueId`
- existing map/place challenge surfaces show it like any other live challenge

### Why this is the right first model

- minimal wiring
- uses infrastructure already shipped
- preserves the existing challenge lifecycle
- makes Brand Portal immediately visible on the map
- avoids building a third parallel product loop

## Product Thesis

### Brand Portal

How brands inject money into the existing dare/place graph.

### Shadow Army

How scouts route creator supply toward that money.

### BaseDare core

Where everything settles into:

- creator identity
- venue activity
- place memory
- verified completion
- social distribution

## Current Problem

The current brand/scout system is real, but isolated.

Today it has:

- `Brand`
- `Campaign`
- `CampaignSlot`
- `Scout`
- `ScoutCreator`
- slot claim / submission / verification APIs

But it does not yet connect cleanly to:

- `Dare`
- `Venue`
- map place panels
- place pages
- place memory
- creator identity surfaces

That isolation is what makes Control Mode feel at risk of gimmick.

## Phase 1 Goal

Make a `PLACE` campaign feel like:

- a brand-funded place challenge
- visible on the map
- visible on the place page
- settled through the normal dare flow
- written back into brand/scout history after completion

## Architecture Rule

### Funding / creation rail

`PLACE` campaigns must create the underlying challenge through the existing:

- [lib/bounty-flow.ts](/Users/mrrobot13/Desktop/basedarestar/basedare/lib/bounty-flow.ts)

That means:

- same wallet / simulation / live handling
- same `venueId` enforcement
- same dare creation rules
- same completion and approval path

The campaign is metadata and routing around the dare.
The dare remains the settlement object.

## Phase 1 Campaign Type

Add an explicit campaign type:

- `PLACE`
- later: `CREATOR`

For Phase 1, only `PLACE` needs to be first-class in implementation.

## Required Data Model Changes

### Campaign

Add:

- `type` (`PLACE` initially, later `CREATOR`)
- `venueId` nullable
- `linkedDareId` nullable
- `createdByWallet` or equivalent audit field if useful

Meaning:

- `venueId` tells us which place the campaign activates
- `linkedDareId` points to the real BaseDare challenge created on the existing rail

### CampaignSlot

Phase 1 does not need major slot redesign.
Slots can remain mostly as they are, but we should treat them as:

- optional routing metadata
- not the primary settlement object

For the first `PLACE` campaign implementation, slots can be present but secondary.

## Phase 1 API Changes

### 1. Campaign creation

When creating a `PLACE` campaign:

- require canonical `venueId`
- create the campaign record
- immediately create the underlying dare through the existing bounty flow
- store the returned dare linkage on the campaign

Required rule:

- a `PLACE` campaign is not considered live unless `linkedDareId` exists

### 2. Campaign fetch payload

Campaign GET responses should include:

- linked dare summary
- venue summary
- map/place visibility state
- brand summary

Enough for:

- place page
- map selected-place panel
- brand portal list
- scout dashboard

### 3. Completion / verification writeback

When the linked dare is approved:

- dare settles normally
- place memory writes normally
- campaign record updates to reflect verified outcome
- scout attribution updates if applicable
- brand completion stats update

This must reuse the existing dare approval/finalization path.

Do not invent a second approval truth.

## UI / Surface Changes

### Brand Portal

For `PLACE` campaigns, the portal should:

- choose a place
- show venue identity clearly
- show that this will create a real live place challenge
- show budget / payout / campaign tier
- show challenge visibility expectations:
  - map
  - place page
  - creator completion

The brand should understand:

- this is not just a campaign record
- this is going live into the public BaseDare graph

### Map selected-place panel

If a place has a linked brand campaign:

- show it inside active challenges
- indicate sponsored / brand-funded status subtly
- do not split campaign challenges into a separate module if avoidable

Preferred behavior:

- it looks like a real active challenge with brand context attached

### Place page

Place pages should show:

- active brand-funded challenge naturally inside Active Challenges
- optional subtle brand marker
- completion should contribute to place heat/memory like any other challenge

### Scouts dashboard

For Phase 1:

- scouts should at least be able to see brand place campaigns
- but Shadow Army does not need deep new routing logic yet

This is where we stay disciplined:

- Phase 1 is place activation
- Phase 2 is richer creator routing

## Completion Flow

### Existing truth

BaseDare already has:

- dare approval logic
- place memory writeback on approved dare completion

That should remain the core truth path.

### Required writeback for place campaigns

When a `PLACE` campaign's linked dare is approved:

1. dare becomes verified through the existing path
2. place memory updates through the existing path
3. campaign gets marked with completion state
4. brand stats increment
5. scout stats/rake increment if a scout was attached to the route

## What Shadow Army means in Phase 1

In Phase 1, Shadow Army is not the star.

It is a secondary routing layer that can later become more important.

So for now:

- keep the scout model
- keep slot metadata
- keep reputation
- but do not let slot mechanics become the core object

The core object is still:

- a live place challenge

That keeps the system coherent.

## Phase 2 Direction

After Phase 1 lands:

- add `CREATOR` campaigns
- make scout selection use real BaseDare creator identity
- rely on:
  - claimed tags
  - social connect
  - verified history
  - footprint / venue relevance

That is when Shadow Army becomes strategically deep.

## Explicit Non-Goals

Do not build yet:

- multi-challenge campaign spawning
- brand analytics dashboards with low or zero data
- separate brand settlement rails
- separate campaign-only completion proof system
- brand-only challenge types that bypass the BaseDare challenge graph

## Success Test

Phase 1 is successful when this exact story works:

1. A brand opens Brand Portal
2. Selects a real place
3. Creates a `PLACE` campaign
4. The campaign creates one real venue-linked challenge via existing bounty flow
5. That challenge appears on:
   - map
   - place page
6. A creator completes it
7. Approval happens through the normal dare flow
8. The place gets memory / heat update
9. The campaign reflects completion
10. The brand can see that it activated a real place, not a shadow subsystem

## Implementation Order

1. add `type`, `venueId`, `linkedDareId` to campaign model
2. make Brand Portal `PLACE` campaign creation call the existing bounty rail
3. attach linked campaign metadata to active challenge/place surfaces
4. write campaign completion state back during dare finalization
5. only after real completions, decide what analytics belong in Brand Portal
