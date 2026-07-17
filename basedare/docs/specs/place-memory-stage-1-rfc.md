# Place Memory Stage 1 RFC (v0.3)

Status: implementation contract
Scope: `OPENING_WINDOW`, `ITEM_PRICE`, and `PAYMENT_METHOD`
Last updated: 2026-07-17

## 1. System boundary

Stage 1 turns an already accepted structured Dare proof into durable, versioned
place intelligence. It extends the existing proof and payout rails; it does not
replace them.

```text
Dare target -> immutable proof attempt -> observation -> assertion version
            -> current Place Memory -> Place Receipt -> refresh/conflict
```

`Venue` remains the canonical place identity. A `FieldStationProfile` is only a
cached capability/projection attached one-to-one to a Venue. Its status remains
`LATENT` in this release. Physical markers, trusted-station graduation, OCR,
passkeys, H3/PostGIS, autonomous tie-break funding, and map-renderer changes are
outside this RFC.

The existing lifecycle stays authoritative: proof is durably recorded, the
Dare reaches a legal payout state, real settlement is confirmed when required,
and only the compare-and-set winner inside `finalizeVerifiedDare` may write
`VERIFIED`, Place Memory, the Spark, and the receipt.

## 2. Prisma delta

The implementation adds:

- `ProofPolicyVersion` and `DareAssertionTarget`
- immutable structured-answer and evaluated-policy snapshots on
  `DareProofAttempt`
- `Dare.approvedProofAttemptId` as the accepted-attempt pointer
- `FieldStationProfile`
- `PlaceAssertion`, `AssertionObservation`, `AssertionVersion`, and
  `AssertionVersionObservation`
- `AssertionConflict` and `AssertionConflictObservation`
- `RefreshSchedule`
- `PlaceReceipt`, `PlaceReceiptObservation`, and
  `PlaceReceiptAssertionVersion`
- `PlaceTag.placeReceiptId`

PostgreSQL composite foreign keys additionally enforce that an approved proof
attempt belongs to its Dare and that an assertion's current version belongs to
that assertion. A partial unique index permits only one active conflict
(`OPEN` or `NEEDS_CORROBORATION`) per assertion. Immutable-body triggers reject
updates to proof-policy bodies, structured attempt snapshots, observations,
receipt bodies, and assertion version values. An assertion version may only
close its interval once; it cannot reopen or change its value body.
Target configuration is protected by a parent-Dare row lock and becomes
immutable after the first proof attempt or any transition out of `PENDING`.

All new columns are nullable where legacy compatibility requires it. Existing
proof attempts are `LEGACY_V0` by absence; historical provenance is not
fabricated.

## 3. Structured mission input contract

Each target is server-owned and binds a Dare to a `kind`, normalized
`subjectKey`, schema version, immutable proof-policy version, required flag,
display configuration, and stable position. The Dare's `venueId` is canonical
and is never accepted from the browser.

The browser submits `{ targetId, value }[]`. Server validation rejects unknown
or duplicate target IDs, missing required targets, and malformed values. A
single proof can answer several targets; a target can produce at most one
observation from a proof attempt.

- `OPENING_WINDOW/v1`: `{ closed, opens, closes, timezone, note? }`. Times use
  `HH:mm`; a closed day has null times; overnight windows are valid.
- `ITEM_PRICE/v1`: `{ itemLabel, amountMinor, currency, unit?, available? }`.
  Currency is uppercase and money is a non-negative integer in minor units.
  Display configuration carries a bounded `minorUnitScale` (default `2`) so
  the browser never submits floating-point money.
- `PAYMENT_METHOD/v1`: `{ methodCode, accepted, evidenceContext? }`.
  Credentials, card numbers, faces, signatures, and receipt PII are forbidden.

No title parsing, OCR, or AI extraction is used.

## 4. Proof-policy snapshot contract

The database contains immutable, server-owned policy templates identified by
`identifier + version` and a canonical SHA-256 hash. Stage 1 policies describe
the structured schema, media requirement, trusted capture-time requirement,
and reuse of the existing proximity gate. They are data contracts, not
executable arbitrary JSON.

At proof-attempt creation the server stores:

- canonical submitted answers and their hash
- every target's identifier, kind, subject, schema, policy identifier/version,
  canonical evaluated policy, and policy hash
- a hash of the complete evaluated-policy snapshot

These fields are write-once. Manual review, appeal, retry, or cron finalization
uses the stored attempt, never the original HTTP request.

## 5. State machine

Transition planning is a dependency-free pure function:

| Current condition | Observation | Result |
| --- | --- | --- |
| no current version | any valid value | create first version, `CURRENT` |
| current value hash matches | same fact | link support, no duplicate version |
| current is stale/due | different fact | close old system interval, create successor |
| current is fresh | different fact | retain current, set `CONFLICTED`, open/join conflict |
| already conflicted | any challenger | join active conflict, manual review |

Physical `effectiveFrom/effectiveTo` remain null unless the evidence defensibly
establishes them. Stage 1 defaults to `OBSERVED`; `supersededAt` is the system
record interval. Receipt outcome precedence is `CONFLICT_OPENED`, then
`MEMORY_UPDATED`, then `MEMORY_CONFIRMED`.

## 6. Conflict behavior

Detection is automatic; paid corroboration is not. The Sentinel admin queue
shows safe current/challenger values, trusted observation times, policy
versions, and coarse proximity results. It does not expose ordinary users to
precise submitted coordinates.

- `DISMISS_OBSERVATION`: retain all evidence, dismiss the case, restore
  `CURRENT` where appropriate.
- `ACCEPT_CORRECTION`: create a successor from the selected challenger, close
  the prior system interval, resolve the conflict, and reschedule refresh.
- `REQUEST_CORROBORATION`: set `NEEDS_CORROBORATION`, keep the assertion
  conflicted, and save an unfunded mission draft only.

All actions use guarded state transitions. Existing Place Receipts remain
immutable after later conflict resolution.

## 7. Place Receipt and serial behavior

Exactly one `PlaceReceipt` is issued for each finalized structured Dare. It
links the authoritative proof attempt, all produced observations, and all
created or confirmed versions. Its versioned public JSON omits exact
coordinates, internal fraud signals, private policy details, and payment PII.
Its content hash is canonical and immutable.

One shared PostgreSQL sequence is initialized above the maximum historical
`PlaceTag.serialNumber`. All future direct Spark approvals and Place Receipts
allocate from it. A structured completion allocates once: its receipt and
associated approved `PlaceTag` mirror the same serial and are linked. Historical
serials are not rewritten and no risky backfill is attempted.

## 8. Pulse v1

Pulse is a rebuildable cached projection on `FieldStationProfile`, never source
of truth. Score is an integer from 0 to 100:

```text
score = coverage * 35 + freshness * 35 + support * 20 + recentSpark * 10
```

Each component is normalized to `[0,1]` and stored in explainable JSON.

- coverage: assertions with a current version / all known assertions
- freshness: average linear remaining life using priors of 90 days for opening
  windows, 30 days for prices, and 180 days for payment methods
- support: average supporting-observation strength, saturated at three
  independent proof observations per current version
- recent Spark: approved Sparks in the last 30 days, saturated at five

No assertions produce `0/cold`. A critically stale assertion (freshness zero)
prevents `blazing`. Any active conflict caps the score at 49. Thresholds are:
`cold 0–24`, `simmering 25–49`, `igniting 50–74`, `blazing 75–100`.
The public Place Memory read recomputes this formula from durable observations
at request time, so time decay remains truthful even before a refresh worker is
introduced; the stored profile remains an operational cache.

## 9. Transaction and idempotency boundary

The winning `finalizeVerifiedDare` transaction:

1. wins the existing `VERIFIED` CAS;
2. resolves and sets a same-Dare accepted proof attempt;
3. preserves the legacy path when no structured targets exist;
4. validates the immutable snapshots for a structured Dare;
5. upserts assertions and idempotently inserts observations;
6. applies state transitions, version support, conflicts, and refresh schedules;
7. issues exactly one receipt and one global serial;
8. creates/links the approved Spark with that serial;
9. rebuilds Pulse; and
10. commits before winner-only external notifications.

Unique constraints make Dare receipt, accepted attempt, observation-per-target,
version support, and receipt junctions idempotent. A structured write failure
rolls back `VERIFIED`; it is never silently downgraded to a paid completion
without its durable asset. Duplicate finalizers return the existing result and
do not notify or settle twice.

## 10. Refresh scheduling

Every assertion has at most one operational schedule. New/current facts use the
kind-specific prior. A confirmation moves the due date from the trusted latest
observation. Conflicts become immediately due with `NEEDS_REVIEW`. Stage 1 may
store an unfunded mission draft but never creates, publishes, claims, funds, or
settles a refresh Dare automatically.

## 11. Privacy and security

- Trusted `observedAt` comes from the attempt's validated capture time or
  receive time, never a free client field.
- Exact proof and target coordinates stay in the private evidence ledger.
- Public projections expose only proximity decision/code and may expose safe,
  coarse distance/radius summaries; exact coordinates never leave the private
  evidence ledger.
- All target and conflict mutations use existing admin authorization.
- New tables enable RLS and grant only the server `service_role` policy; direct
  `anon` and `authenticated` table privileges remain revoked.
- Structured values are bounded and exclude credential/identity PII.
- Deterministic JSON rejects non-JSON, non-finite, cyclic, and unsupported
  values before hashing.

## 12. Migration and rollback

The migration is additive and is authored as explicit PostgreSQL SQL; it is not
applied to any shared or production database in this task. Schema and migration
must deploy before code because the structured finalizer fails closed. Rollback
before any structured receipt is issued is additive-object removal. After
issuance, do not drop the global sequence or receipt/history tables: roll back
application traffic to legacy unstructured Dares while preserving issued
history, then ship a forward repair.

## 13. Deferred systems

Physical Field Station markers, QR challenge sessions, passkeys, custodial
escrow, Merkle settlement, H3/PostGIS, OCR/AI, an independence mesh,
autonomous pricing, automatic tie-break mission creation, treasury automation,
sponsor commercial-reuse consent, contract changes, and map UI are deferred.

## 14. Test matrix and release status

- Schema validation for every value kind, including overnight hours, integer
  money, and method allowlists.
- Canonical hash stability, domain separation, and observation-time behavior.
- First version, confirmation, stale successor, fresh conflict, and existing
  conflict transitions.
- Attempt snapshot reconstruction through direct, admin, appeal, and retry
  finalization.
- Transaction rollback when a structured durable write fails.
- Concurrent/duplicate finalization: one attempt pointer, observation set,
  receipt, serial, Spark, and notification winner.
- Shared sequence behavior for direct Sparks and structured receipts.
- Guarded conflict actions and corroboration-draft no-money behavior.
- Pulse boundaries, critical staleness, and conflict cap.
- Legacy unstructured and STREAM regressions.
- Public receipt/read models contain no precise submitted coordinates or
  internal-only evidence.

The implementation carries pure contract/state/hash/privacy/Pulse tests,
static migration-invariant tests, typed application and test suites, focused
lint, Prisma schema validation, the repository-wide policy suite, static
production safety, and a full production build. Public receipt reads verify
their canonical content hash before returning stored payloads.

A database-backed execution of the migration and transaction/concurrency
matrix is still a release gate. This working environment has no disposable
PostgreSQL server, `psql`, or container runtime, so the migration was authored
and validated statically but was not applied. Before production, apply it to a
safe disposable target and exercise: target/proof locking, multi-target
finalization, rollback on durable-write failure, duplicate/concurrent
finalizers, conflict CAS, shared serial issuance, and legacy/STREAM settlement.
