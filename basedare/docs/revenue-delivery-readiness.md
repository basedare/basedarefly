# Revenue delivery readiness — 23 September 2026

Status: implemented locally; production acceptance remains open. No deployment,
real funding, payout, refund or external test notification was performed in this pass.

## Offer and boundaries

The first content flow is a self-service paid mission for **one original photo or
video at a real place**, with an optional public social post. The buyer specifies
the file format/length, acceptance criteria, legal buyer name, UTC deadline,
posting account/instructions/disclosure and availability window. There are no
included revision rounds. A changed brief requires a new agreement and mission;
the existing evidence appeal path remains available.

The reward retains the existing 96% contributor / 4% settlement split. This is
not a newly priced managed content package. The existing managed Verified Field
Sprint remains $2,500 ($2,000 service and $500 gross contributor pool). Its
evidence receipt does not gain promotional reuse rights.

The proposed content licence in `lib/content-delivery.ts` is a **review draft**:
creator ownership; after approval and payment, a 12-month non-exclusive worldwide
licence for the named buyer and BaseDare's own websites and organic social
accounts, including cropping/captions/resizing. Paid ads, sublicensing, resale and
AI training are excluded. No reach, sales or positive-review promise.

Before launch, have the actual terms reviewed as required by
`docs/FINANCIAL_CANON.md`, including hosting/display before approval, contributor
authority over people/music/material, posting disclosures, licence start/end,
payment/reversal disputes and record retention. Record the reviewed version.
Only then set server-side `CONTENT_RIGHTS_APPROVED_VERSION=content-organic-v1`.
Setting an environment variable is not legal review. Do not silently edit a
released version's text; introduce a new version and preserve old grants.

## What is implemented

| Barrier | Local implementation | Remaining evidence |
| --- | --- | --- |
| Unclear purchase | Structured one-asset brief; explicit posting, criteria, deadline and permissions, visible before sign-in | Buyer agrees to an actual brief |
| Missing rights acceptance | Separate unchecked consent; canonical funded-brief fingerprint; wallet-bound immutable DB record, atomic with claim request; checks before upload and payout | Reviewed terms and production migration |
| Broken delivery handoff | Assigned-author/media-type/deadline checks; server receipt timestamp; guarded upload preserving saved work; photo/video preview and original-file link | Real upload, review and payment |
| Notification return path | Durable in-app messages and awaited, bounded push attempts link to the exact mission; contributor page refreshes while waiting; rejected work restores the appeal form after refresh | Physical iOS/Android delivery and signed-out return |
| Unknown economics | Existing Sprint admin tracks additional costs/time/revisions/refunds; reward liability separated from revenue; profit withheld until reconciliation; overruns retained | Actual operator records and buyer cash receipts |
| Reordering friction | Sprint repeat decisions open a prefilled invoice request; successful venue-bound content opens an editable fresh brief with a new deadline | Actual repeat purchase; no automatic charge |

An accepted public-post URL is an input for human review, not proof that the post
exists, belongs to the contributor or stayed public. Review those obligations.
The source media uses the existing public media storage path; this is not private
asset delivery. Do not sell confidential material under this offer.

Economics currently use the **managed Sprint** operator records, not a universal
accounting system for every self-service dare. Amounts are operator-confirmed,
not a bank feed. Record labour cost at a stated rate as well as minutes. Do not
double-count existing mission review costs. Refund entries document actual
refunds; they do not transfer money. Later paid deliveries count completed,
subsequently funded Sprints from the same buyer wallet and exclude fully refunded
service fees; missing buyer identity remains unknown.

## Verification evidence

- 75 focused unit/policy tests pass: content scope, publication URLs, lifecycle
  eligibility, economics, return destinations and fresh reorder drafts.
- `scripts/run-revenue-readiness-db.sh` uses a disposable PostgreSQL database and
  the actual claim/upload routes. It covers unsigned/wrong/missing consent,
  concurrent requests, JSONB-stable fingerprints, wallet/brief mismatch,
  immutable records, anonymous denial and service-role reads, wrong author/type,
  late upload, concurrent/retried uploads, review-state protection, payout guards,
  rejection/appeal/simulated-approval recovery, duplicate finalization, protection
  against late moderator rejections, cost
  idempotency, excessive refunds, losses and in-app notification destinations.
- That harness substitutes Next's session adapter and external media storage.
  It does **not** test the production wallet SDK, storage service, blockchain or
  push delivery. No real media or customer message leaves it.
- Full historical migration replay and the existing Sprint database smoke pass,
  including rejected first proof, replacement, receipt and repeat request.
  Escrows in that smoke are database fixtures, not actual chain transactions.
- App typecheck passes. Focused lint has no errors; image-rendering warnings
  remain. Desktop and 390px browser checks cover the content form, conditional
  posting fields, honest release gate and removal of conflicting time controls. A temporary local component preview
  also checks restored rejection and pending-appeal states; it is removed after
  verification. The local server warns that the OnchainKit API key is missing,
  so these browser checks do not validate the embedded wallet.
  Phone-sized browser checks do not verify a physical phone.
- Read-only production `/api/push/config` reports client and delivery configuration
  present. Configuration does not establish successful delivery.

Re-run from the app directory using Node 22:

```sh
node --experimental-strip-types --loader ./scripts/test-alias-loader.mjs --test lib/content-delivery.test.ts lib/delivery-economics.test.ts lib/revenue-return-paths.test.ts lib/creator-mission-policy.test.ts lib/creator-mission-action.test.ts lib/outcome-contracts.test.ts lib/dare-claim-policy.test.ts lib/settlement-transition.test.ts lib/dare-lifecycle.test.ts
bash scripts/run-revenue-readiness-db.sh
bash scripts/run-verified-field-sprint-db-smoke.sh
npx tsc --noEmit --pretty false
npm run graphify:rebuild
```

## Concrete production acceptance run

Choose a real buyer, contributor, saved venue, agreed deliverable and an explicit
reward budget first. Keep one pilot record with mission/receipt IDs, timestamps,
transaction hashes, review outcome, costs and device evidence. Do not mark the
following complete from a fixture or simulated dare:

1. Apply `20260921100000_content_rights_acceptance` before deploying the application
   that expects it. This is required even while content commissions remain disabled:
   Prisma's full Dare reads include the new column. Run `npm run safety:database`
   with the intended deployment database; production Vercel builds enforce this
   read-only compatibility check. Enable content commissions only after terms review.
   Confirm real mode, correct network/contracts, uploads and reviewed terms.
2. Buyer reviews the exact brief and funds the agreed reward. Check the mined
   transaction against the database amount and escrow identifier. Abandon a
   wallet confirmation once and verify no unfunded mission becomes requestable.
3. Contributor opens the same mission from a signed-out phone, signs in, reads
   the brief and separately accepts usage terms. Confirm that the mission
   survives authentication and a refresh does not duplicate consent/request.
4. Moderator accepts. Confirm notification, exact mission return, contributor
   identity and upload availability. Record receipt in the device matrix below.
5. Submit the agreed file and, if required, its public post URL. Interrupt the
   connection after upload, reopen the mission, and recover the saved proof
   without overwriting or re-uploading it.
6. Review against the actual brief. Exercise a rejected attempt and the supported
   appeal/replacement path without approving unsuitable work merely for testing.
   Keep the rejected attempt and any replacement funding visible.
7. Approve suitable work and verify the real contributor transfer and 96/4 split.
   If settlement queues, observe recovery through the existing retry path.
   Repeating approval must not pay twice. Record transaction evidence.
8. Buyer opens the delivered original and applicable rights. Record cash,
   payouts, operator time/cost, revisions/replacements and any actual refunds.
   Reconcile only once the record is complete.
9. If the buyer requests another delivery, use the repeat draft, edit its new
   scope/deadline and confirm new payment and fresh contributor consent.
   A repeat click or invoice request is not a repeat sale.

| Physical-device check | iPhone | Android |
| --- | --- | --- |
| Supported browser / installed app and notification opt-in | Not run | Not run |
| Acceptance arrives while app is backgrounded | Not run | Not run |
| Rejection/review decision returns to exact work and appeal | Not run | Not run |
| Payment message matches a real settled transfer | Not run | Not run |
| Signed-out notification retains mission through sign-in | Not run | Not run |
| Permission denied/offline still recovers via My work | Not run | Not run |

No production or phone success is claimed until this evidence is recorded.
