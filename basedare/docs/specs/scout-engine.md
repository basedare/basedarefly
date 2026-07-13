# Spec: Scout Engine — incentivized hotspot seeding

**Status:** **PARKED HISTORICAL SPEC.** The pure helpers and ledger schema may remain for historical compatibility, but the active Verified Field Sprint does not accrue an automatic scout commission. `docs/FINANCIAL_CANON.md` supersedes every price or entitlement in this file.

**What it explored:** scouts as a cold-start engine who sign up venues and
discover creators, with a possible future recurring cut of B2B revenue.
This productizes "a catalyst per node": every hotspot gets a self-interested
local operator who's motivated to seed it and keep it alive, with no founder
on-site.

**Founder decisions baked in (2026-06-17):**
- Rake reassignment is **monthly, performance-based**.
- Rake split: **25% discovery / 75% active**.
- **No territory for now** — scouts earn on the **venues they personally sign up**
  (plus the existing per-creator model). Territory is a later evolution.

## Funding source — the unlock

Any future scout compensation must come from an explicitly approved commercial acquisition budget, **not** the 4% settlement fee. It must be recorded as a direct acquisition cost and fit inside the active SKU's delivery-cost ceiling. No commission may be inferred from a managed-service invoice or accrued automatically.

## Dual rake (reuses the existing `Scout` / `ScoutCreator` pattern)

The historical model proposed carving a scout commission out of a B2B payment and splitting it as follows. These are not current entitlements:

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

If a future version is approved, commission would accrue only on settled B2B payments tied to verified delivery, never on signup alone. Presence evidence is layered and fallible—not “unfakeable”—so any future payout also needs the active fraud, dispute, vesting, and clawback controls.

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
