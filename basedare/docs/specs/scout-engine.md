# Spec: Scout Engine — incentivized hotspot seeding

**Status:** spec + pure rake lib (`lib/scout-rake.ts`). Schema migration + cron/
endpoints are NOT built — parked until greenlit (and DB-migration access).

**What it is:** scouts are the cold-start engine. They sign up venues and
discover creators, and earn a **recurring cut of the B2B revenue** their venues
generate — for as long as the venue keeps paying *and* they keep delivering.
This productizes "a catalyst per node": every hotspot gets a self-interested
local operator who's motivated to seed it and keep it alive, with no founder
on-site.

**Founder decisions baked in (2026-06-17):**
- Rake reassignment is **monthly, performance-based**.
- Rake split: **25% discovery / 75% active**.
- **No territory for now** — scouts earn on the **venues they personally sign up**
  (plus the existing per-creator model). Territory is a later evolution.

## Funding source — the unlock

Scout comp comes from the **fat B2B margin** (venue activations / brand campaigns /
CPV), **not** the thin 4% creator-dare fee. A brand paying $500–5k for verified
visits leaves room to pay a scout a real recurring cut *and* keep platform
margin. The 4% creator side is a separate, smaller stream and is **not** the
scout funding source.

## Dual rake (reuses the existing `Scout` / `ScoutCreator` pattern)

For each B2B payment a venue makes, a **scout commission** is carved out and split:

- **Discovery rake — 25%, permanent.** Credit for sourcing the venue. The scout
  who signed it keeps this for as long as the venue pays, even if someone else
  becomes the active manager. Cannot be lost. Rewards the seeding.
- **Active rake — 75%, ongoing + performance-gated.** For *currently delivering*
  verified value at the venue. Reassignable monthly (see below). This is the big
  money, and it's earned continuously — never inherited.

This split is the anti-rot guardrail: "own it as long as you keep it alive," not
"own it forever and coast." A scout who lights a hotspot then disappears keeps
only the small discovery slice; the active slice flows to whoever actually works
it — so a scout never becomes the rent-seeking middleman the thesis exists to kill.

If a role is unassigned, that share returns to the platform (not paid out).

## Monthly active-rake reassignment

Each month, per venue, evaluate the **active** scout:
- **Retain** active status if they drove ≥ `minVerifiedLoopsPerMonth` verified
  loops at the venue (real check-ins / approved proofs / settled loops).
- One slow month is forgiven (`graceMonths`).
- Below threshold beyond grace → active rake becomes **reassignable**: another
  scout who steps in (or the platform) can claim it next cycle.
- If the venue stops paying, there's no active rake to assign.

Discovery rake is untouched by this — it's permanent.

## Anti-fraud — the moat does the work

Rake only accrues on **verified, settled B2B payments tied to real verified
delivery** (a real venue really paid, real verified visits were delivered). It is
**not** paid on "venue signed up" alone. Because presence is unfakeable (the #1
thesis), and the cut is recurring + tied to ongoing real money, **fraud has to
sustain real verified value flowing — i.e. actually do the work.** The recurring
model launders out farmers automatically. Payouts **vest** after `vestDays` and
**claw back** if the underlying payment reverses.

## Capacity + tiers (reuses existing `Scout.reputationScore` / `tier`)

A scout can only *actively* manage as many venues as their tier allows —
bandwidth is real, and an over-extended scout seeds none well. Higher
reputation/tier → more active slots + faster vesting + less oversight. New scouts:
small cap, longer hold. Same reputation-compounding loop as creators.

## No pyramid

Two rakes only (discovery + active), both paid on real verified value. **No
scout-recruits-scout override chains** — that's a regulated pyramid and a
reputational landmine.

## Hierarchy

Scout (signs up venues, discovers creators, earns rake) sits **above** host
(one venue, presence-gated, runs loops — see claim-by-presence). A scout may
anoint local hosts. Flow: **scout lights a venue → recruits hosts + creators →
hosts run loops → players show up → everyone settles on proof → scout earns a
cut of the verified B2B value.**

## Schema additions (parked — needs migration)

- **`Venue`**: `discoveryScoutId` (migrate existing `scoutId` → this),
  `activeScoutId`, `activeRakeReviewedAt`.
- **`ScoutRakeEvent`** (money ledger — auditable, idempotent, clawback-able):
  `scoutId`, `venueId`, `kind` (`DISCOVERY` | `ACTIVE`), `sourceType`
  (`B2B_PAYMENT`), `sourceId` (payment id), `amount`, `status`
  (`PENDING` | `VESTED` | `CLAWED_BACK`), `vestsAt`, `createdAt`.
  Unique `[scoutId, sourceId, kind]` for idempotency. `Scout.totalDiscoveryRake`
  / `totalActiveRake` become denormalized sums of this ledger.

A ledger (not just counters) because this is money: every cent traces to a
payment, vests, and can be reversed.

## Build slices

1. **`lib/scout-rake.ts`** — DONE. Pure, read-only: the 25/75 split, the
   commission carve, and the monthly active-rake eligibility rule. Wired to
   nothing.
2. Schema migration (Venue dual-scout fields + `ScoutRakeEvent`). (parked)
3. **Attribution on venue signup** — set `discoveryScoutId` / `activeScoutId`
   when a scout signs up a venue. (parked)
4. **Rake accrual** — on each settled B2B payment, write `ScoutRakeEvent`s via
   `computeScoutRake`. (parked)
5. **Monthly cron** — run `evaluateActiveRakeEligibility` per venue; open up
   active rake where performance lapsed. (parked)
6. **Scout dashboard** — surface earned/vesting/at-risk rake per venue (the
   `app/scouts/dashboard` already exists to extend). (parked)
