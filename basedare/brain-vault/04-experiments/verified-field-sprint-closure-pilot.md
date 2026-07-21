---
type: experiment
status: SOFTWARE_VALIDATED_RELEASE_BLOCKED
owner: growth_product
created_at: 2026-07-21
updated_at: 2026-07-21
---

# Verified Field Sprint closure pilot

## Decision this run must make

Can one authorized design partner move through the complete BaseDare commercial loop—bounded question, scope approval, confirmed funding, four independent field missions, conservative receipt, and an explicit repeat/adjust/stop decision—without hiding rejected evidence, negative answers, delivery costs, rights limits, or acquisition-vs-outcome boundaries?

The software path has passed a database-backed disposable test. That fixture proves system behavior; it is not evidence of a real customer, real place condition, real contributor work, or real demand.

## Canonical commercial scope

- Total buyer price: **$2,500**.
- Managed service: **$2,000**.
- Contributor reward pool: **$500**.
- Four initial missions: **$125 gross escrow each**.
- Exactly two active, permissioned Field Station links.
- Four accepted and settled outcomes from four distinct contributor wallets.
- Outcomes remain `YES`, `NO`, `PARTIAL`, or `INCONCLUSIVE`; negative and inconclusive answers are payable when the evidence satisfies the contract.
- One replacement maximum per mission slot.

Obsolete pilot-range intake values are historical compatibility metadata only. They must be labelled legacy and cannot create or price a new Sprint.

## Replacement boundary

A rejected or abandoned first mission never disappears. Its Dare, proof attempt, decision, and escrow reference remain in append-only history and are disclosed on the buyer receipt.

One replacement may be linked only when:

- the Sprint is collecting or under review;
- the original mission has an authoritative rejected/failed or refunded/abandoned state;
- the replacement is a new, real, non-simulated `$125` Field Truth escrow;
- contributor independence is preserved;
- the operator records a bounded reason, funding treatment, funding reference, actor, and timestamp.

If the original escrow was refunded, it may fund the replacement and is labelled `RECOVERED_REFUND`. If the original rejected attempt was not refunded, the replacement requires a separately disclosed `SUPPLEMENTAL_125`. A second replacement is forbidden.

## Real-pilot inputs required from the founder

- [ ] One named design-partner organization.
- [ ] One named contact with authority to approve the scope and receive the receipt.
- [ ] One precise, observable, time-bounded question.
- [ ] One compact area and freshness window.
- [ ] Two permissioned Field Station links and their keepers.
- [ ] One funding reference covering the `$2,000` service line and `$500` initial reward pool, or an explicitly recorded design-partner service-fee exception.
- [ ] Four independent eligible contributors and four real `$125` escrows.
- [ ] Rights review if sponsor-commercial reuse of contributor media is expected.

Do not manufacture a negative answer. Choose a question whose real field state can honestly resolve in more than one direction, pay any evidence-compliant `NO` or `INCONCLUSIVE`, and report the observed distribution. If every real result is `YES`, the receipt must say so.

## Required vertical-slice sequence

1. Deliver one truthful buyer/venue decision artifact.
2. Record the authorized buyer's `APPROVE_SCOPE` response.
3. Confirm the locked Sprint funding lines.
4. Compile four immutable Field Truth contracts.
5. Attach four real `$125` escrows and begin collection.
6. Submit one deliberately policy-invalid test attempt with the contributor's knowledge—for example clearly out-of-radius evidence—so the rejection rail is exercised without fabricating a business answer.
7. Preserve the rejection and link no more than one properly funded replacement.
8. Collect four independent accepted and settled outcomes.
9. Complete the Sprint and write four timestamped place-memory observations with refresh dates.
10. Deliver the public receipt with outcome distribution, evidence freshness/quality, payouts, review cost, Field Station acquisition kept separate, replacement disclosure, rights boundary, limitations, and privacy-safe evidence references.
11. Record the buyer's explicit `REPEAT`, `ADJUST`, `ASK`, or `STOP` decision.
12. If `REPEAT`, compile Sprint #2 as a fresh draft; never silently roll the old scope forward.

## Disposable database proof completed

The closure fixture exercised:

- concurrent funding confirmation with one winner;
- concurrent collection start with one winner;
- four real escrow-shaped Dare records;
- one rejected out-of-radius proof attempt;
- one disclosed, supplemental `$125` replacement and rejection of a second replacement;
- four distinct contributor wallets;
- `YES`, `NO`, `PARTIAL`, and `INCONCLUSIVE` accepted outcomes;
- accepted settlement state and four place-memory observations;
- a privacy-safe receipt with no precise coordinates;
- sponsor commercial-reuse rights reported as `NOT_GRANTED`;
- append-only escrow-link and buyer-decision database triggers;
- idempotent `REPEAT` decision and a fresh Sprint #2 draft.

The fixture's `Smoke Design Partner` is synthetic. It must never appear in traction, buyer, or investor reporting.

## Release blocker discovered by the closure test

A migration-only database does not currently reproduce the entire Prisma schema. The first application write exposed legacy schema/migration drift, including missing `Venue.discoveryScoutId` and other older models/columns. The closure logic passed after synchronizing **only the disposable database** with `prisma db push`; production must not use that shortcut.

Before this closure pass ships:

1. inventory the complete migration/schema diff;
2. reconcile it against the actual production schema;
3. write an additive, production-safe repair migration that tolerates already-present legacy objects;
4. prove all migrations from zero and against a production-shaped disposable clone;
5. apply migrations before application deployment.

## Rights, privacy, and receipt limits

- BaseDare display/promotion rights are not sponsor commercial-reuse rights.
- Sponsor reuse remains `NOT_GRANTED` unless a separate explicit, versioned, unbundled consent exists.
- Public evidence references are stable opaque hashes plus safe outcome metadata—not media URLs, exact contributor coordinates, private contacts, or raw device evidence.
- A verified arrival or accepted field answer does not prove a purchase, causal lift, or incremental revenue.
- Field Station scans and opens are acquisition signals, not verified outcomes.
- The receipt states freshness, review method, replacement funding, known limitations, and what could not be concluded.

## Stop conditions

Stop or pause when authorization is unclear, four independent contributors cannot be sourced, proof safety degrades, the question cannot be answered within the time window, a second replacement appears necessary, rights are unclear, costs exceed the approved scope, or the buyer asks BaseDare to overstate scans, arrivals, purchases, or causality.
