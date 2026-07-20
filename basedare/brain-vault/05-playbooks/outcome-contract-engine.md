---
type: product_playbook
status: ACTIVE
owner: BaseDare
created_at: 2026-07-20
updated_at: 2026-07-20
---

# Outcome Contract Engine

## Decision

BaseDare is buying truth and bounded execution, not a preferred answer. Every new mission freezes an immutable versioned contract before funding and compiles it into:

1. **Go** — where or which brief.
2. **Do** — the bounded question or action.
3. **Prove** — evidence required.
4. **Win** — which reported outcomes can clear.
5. **Earn** — payout after the stated review boundary.

## Three separate decisions

- **Reported outcome:** what the contributor says happened (`YES`, `NO`, `PARTIAL`, `INCONCLUSIVE`, `COMPLETED`, or `PUBLISHED`).
- **Evidence decision:** whether the submitted evidence is `PENDING_REVIEW`, `ACCEPTED`, or `REJECTED`.
- **Orchestration decision:** the later system action, such as pay, retry, refresh, escalate, create place memory, or ask a follow-up question.

`Dare.status=VERIFIED` continues to mean accepted evidence plus settled completion. It does not mean the reported real-world answer was positive.

## Alpha registry

| Family | Alpha | Core win |
| --- | --- | --- |
| Field Truth | Active | Accepted evidence supports an honest current answer, including `NO` |
| Experience Execution | Active | Accepted evidence shows the bounded action occurred |
| Publication | Active | The required public asset clears the brief; sponsor reuse still requires separate reviewed consent |
| Attention | Disabled | Needs platform-grade attention evidence |
| Arrival / Redemption | Disabled | Needs venue, merchant, rotating QR, booking, transaction, or redemption co-sign |
| Qualified Action | Disabled | Needs buyer-defined qualification and authoritative conversion evidence |

## Hard rules

- Contract family/version/snapshot are all-or-none and cannot mutate after creation.
- Field Truth requires a location-bound mission.
- A truthful supported negative answer pays the same contracted amount as a truthful supported positive answer.
- The reported observation is append-only on the proof attempt. Retries require new evidence; appeals do not rewrite history.
- Receipts describe only the rung proven. Never turn evidence acceptance into claims of traffic, purchase, conversion, or venue authorization.
- Publication does not grant sponsor commercial reuse. Phase 3 explicit, versioned opt-in and human legal review remain required before the first sponsor-reuse invoice.
- Mission Pass, creator attribution, payout leases, and existing proof proximity rails are reused—not rebuilt.
- No automatic slashing, open-ended payout freezes, or autonomous real-money mission generation in this alpha.

## Release gate

1. Apply `20260720120000_add_outcome_contract_engine` to disposable PostgreSQL.
2. Prove the all-or-none constraint and immutable-snapshot trigger.
3. Run concurrent proof/state tests and the normal money-rail gates.
4. Fund one small Field Truth mission whose honest answer may be `NO`.
5. Submit server-pinned evidence, accept it through the real review path, settle once, and inspect the receipt wording.
6. Deploy the migration before application code.

The manual Dare Director can be designed only after contract data shows which questions, evidence requirements, retry paths, and refresh intervals are actually reliable.
