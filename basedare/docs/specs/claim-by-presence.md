# Spec: Claim-by-Presence — "Activate a venue loop, not claim a venue"

**Status:** spec + foundation helper built (`lib/venue-role.ts`). Power-granting
endpoints are NOT built — parked until presence auto-approval (#1) is smoked + merged.

**Principle (Codex):** *Presence unlocks ACTION, not OWNERSHIP.* A visitor who
checks in once must never gain control of a venue. Presence + reputation should
let someone *run a lightweight loop*; dangerous powers (money, official profile,
QR admin, brand campaigns) stay behind stronger proof.

## Three levels

Level 1 (contributor) ships via #1. Level 3 (owner) is today's claim flow.
**This spec builds the missing middle, level 2.**

| Action | Contributor (QR+GPS) | Provisional host (new) | Verified owner |
|---|---|---|---|
| Post proof, leave vault signal, build reputation | ✅ | ✅ | ✅ |
| Open a host session / run a lightweight presence loop or guest mission | ❌ | ✅ | ✅ |
| Venue-room announce / pin a "tonight" prompt | ❌ | ✅ | ✅ |
| Edit official venue profile | ❌ | ❌ | ✅ |
| QR admin / rotation control | ❌ | ❌ | ✅ |
| Money: payout splits, brand campaigns, settlements | ❌ | ❌ | ✅ |

## Eligibility

**Contributor** — has a `CONFIRMED` `QR_AND_GPS` check-in at the venue (within 30d).

**Provisional host** (auto, self-serve) — ALL of:
- on-site **now**: a `CONFIRMED` `QR_AND_GPS` check-in here within ~90 min, AND
- a reputation signal (ANY one): Signal Points ≥ 50, OR ≥3 distinct-day check-ins
  here, OR ≥3 approved marks here, AND
- the venue has **no verified owner** (`venue.claimedBy` is null). If owned, the
  owner governs; provisional powers are off unless the owner opts in.

**Verified owner** — `venue.claimedBy === wallet` (today's stronger flow: admin
approval / email-domain / payment / QR session control / contested resolution).

## Permissions resolution

`resolveVenueRole(wallet, venueId)` → `verified_owner | provisional_host | contributor | visitor`
(built in `lib/venue-role.ts`, read-only, fails closed to `visitor` on error).
Every level-2+ endpoint must gate on this, never on a raw check-in.

## Expiry / decay (kills "claimed once, owns forever")

- Provisional status is time-boxed: valid ~24–48h after the last on-site
  check-in, then must re-check-in to renew.
- A host session and any loop it starts carry their own expiry; ending the
  session closes open loops gracefully.

## Abuse cases → mitigations

- *Random visitor hijacks a venue* → needs reputation **+** recent/repeated
  presence, only lightweight powers, time-boxed, owner overrides.
- *GPS spoofing* → `QR_AND_GPS` required (QR is venue-bound, rotating,
  replay-blocked); GPS alone never qualifies.
- *Two would-be hosts* → many contributors fine, but **one active host session**
  per window (highest reputation + most-recent on-site wins; ties → admin/owner).
- *Host funds a loop then bails* → loop escrow + existing refund/expiry settles.
- *Squatting a popular unclaimed venue* → time-box + reputation gate + a real
  owner's level-3 claim always supersedes and revokes provisional grants.

## Precedence

`verified_owner` > `provisional_host` > `contributor` > `visitor`.
An owner claim at any time revokes provisional grants.

## Build slices

1. **`resolveVenueRole(wallet, venueId)`** — DONE (`lib/venue-role.ts`). Pure,
   read-only, wired to nothing.
2. Provisional-host **activation endpoint** (start a time-boxed host session),
   gated by `resolveVenueRole`. (parked)
3. **Gate** the lightweight-loop actions behind `provisional_host`+; keep
   money / profile / QR behind `verified_owner`. (parked)
4. **UI**: an "Activate this venue" CTA that appears only when eligible, clearly
   labeled *provisional* and showing the expiry. (parked)

Then **#3**: reputation-tuned verification — Signal Points gradually raise what
the system auto-clears.
