# PLACE Campaign Smoke Checklist

Use this after any change to Brand Portal, place campaigns, dare approval, or venue challenge surfaces.

## Goal

Confirm that a `PLACE` campaign behaves like a real BaseDare venue-linked challenge from launch through completion.

## Preconditions

- brand wallet can access Control Mode
- target venue already exists as a canonical BaseDare venue
- local or production env can create simulated/database-backed dares

## Acceptance Flow

### 1. Launch a PLACE campaign

- open `/brands/portal`
- choose `PLACE`
- search and select a real BaseDare venue
- create the campaign

Verify:

- campaign record exists
- `Campaign.type = PLACE`
- `Campaign.venueId` is set
- `Campaign.linkedDareId` is set
- campaign status is `LIVE`

### 2. Validate the linked dare

Verify the linked dare:

- exists in `Dare`
- has the same canonical `venueId`
- is a real active challenge, not a separate campaign-only object
- remains on the standard dare lifecycle

### 3. Check the map selected-place panel

- open the linked venue on `/map`

Verify:

- challenge appears in active challenges
- brand label is subtle, not dominant
- challenge still looks like a normal BaseDare challenge card

### 4. Check the venue page

- open `/venues/[slug]`

Verify:

- same linked dare appears in Active Challenges
- brand context is visible but understated
- ordering follows normal active challenge logic, not artificial pinning

### 5. Approve the dare

- complete / approve the linked dare through any real approval path

Verify:

- dare becomes `VERIFIED`
- place memory is created once
- campaign becomes `SETTLED`
- brand spend increments once
- slot state updates once

### 6. Retry / duplicate safety

Run or simulate a repeated approval path.

Verify:

- campaign does not double-settle
- brand spend does not double-count
- slot success does not double-increment
- place memory does not duplicate

### 7. Refund / failure safety

Test a refund or failure path for a linked dare.

Verify:

- dare terminal state propagates to the campaign
- campaign becomes `CANCELLED` unless already `SETTLED`
- no orphaned `LIVE` campaign remains after a dead linked dare

## Current Phase 1 rules

- `PLACE` campaigns create one linked dare
- `CREATOR` campaigns remain visible but are not the main live path yet
- no separate funding rail is allowed
- the dare remains the settlement object
