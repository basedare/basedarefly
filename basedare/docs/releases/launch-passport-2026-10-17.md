# Launch repairs and connected Passport — 17 October 2026

User authorization: implement the audit fixes and remaining Passport progression work, verify, and ship to main. Preserve the existing brand, navigation, settlement guards, reputation ledgers and private social permissions.

## Checklist

- [x] Payment availability before paid forms; preserve disabled money rail until real readiness passes.
- [x] Truthful radar labels, one immediately accessible free adventure, mobile map control separation.
- [x] Coherent buyer scoping/invoice handoff with honest empty-prefill states.
- [x] Evidence-backed place stamps and approval-backed Storyteller achievement.
- [x] Buddy/shared-plan memories, earned titles/cosmetics, weekly personal challenge and accepted-contribution community goal.
- [x] Existing venue perks surfaced with eligibility, availability and redemption conditions; no inferred monetary entitlement.
- [x] Explicit account-linked private journal saving, conflict recovery, export/delete, and account-switch isolation.
- [x] Rich personal completion card, optional public identity, exact invitation into a fresh attempt.
- [x] Unit/integration/auth tests, typecheck, lint, build, browser checks, Graphify, code review.
- [ ] Commit, push, CI, main merge and production deployment/smoke verification.

## External work and limits

Mainnet signing, real USDC/gas spend, contract-role changes, coordinated venue QR secret rotation, real physical-phone/passkey/GPS/push tests, inbox delivery to an operator-owned account, recruitment and real paid service delivery cannot be represented by code or fabricated receipts. Complete the independent software work; retain explicit unavailable states and record exact remaining operator actions.

## Data design

A private AdventureJournal row stores the latest 30 canonical self-reported runs for an explicitly authorized wallet. Rounded area coordinates and a monotonic revision are saved; account and guest device copies are separated. Save loads, merges and compares revisions. Clearing retains a revision tombstone so an old device cannot silently restore deleted memories. Personal progress remains self-reported. Confirmed QR+GPS visits, currently approved contributions, joined-plan attendance attestations and paid-work evidence remain separate. No new money, Signal Points or universal XP awards.

## Verification / release evidence

Completed locally:
- 41 discovery, progression and analytics-privacy tests; app and test TypeScript checks; full lint with zero errors; static production safety and existing usability checks; production Next build.
- Disposable PostgreSQL replay of 60 migrations. Coverage includes auth isolation, revision conflict, clear tombstone, public-role denial, missing QR evidence/QR-only exclusion, approval and withdrawal, revoked check-in, non-seeded community counts, distinct-wallet crew membership, cancelled outings and private allocated perks. No points or paid work are created.
- The explicit transaction-pooler migration fallback was tested in a disposable database, including idempotency.
- Real local HTTP tests use a fresh EOA action signature with the existing auth verifier: save/read/clear succeed, anonymous and cross-wallet reads fail, stale revision is rejected. No production test account or journal was created.
- Browser at 390 × 844: free start, step recovery after reload, self-reported completion, personal stamp, weekly 1/3, SVG download, full Passport, locked frames and guest evidence states; no horizontal overflow. Opening the actual invitation on a separate localhost origin shows the exact activity with unchecked steps and its own Start action; completion is not transferred. Native share receipt remains unverified.
- Mobile map List view bounds x108.92/y774/w172.16/h46 and Map key x262.84/y724.78/w98.16/h44 have zero overlap (previously about 18px horizontally at a colliding vertical position).
- Buyer invoice handoff retains objective, reward, time window and proof context, uses a custom quote request, and requires missing contact/place details.

Production schema:
- Confirmed the primary repository database matches the current public Hideaway venue ID and coordinates. Read-only history showed exactly one pending migration and no unresolved failures.
- The direct session connection was unreachable; Prisma migrate deploy through the pooler timed out without creating a migration row or table. The reviewed additive SQL was then applied intentionally using scripts/apply-private-journal-migration.mjs --apply. This is a manual operator command, never part of install or application build. It takes Prisma’s advisory lock as a transaction-scoped lock, refuses other pending/unresolved migrations, executes only this migration, and appends its exact checksum receipt in the same transaction. See [Prisma’s lock implementation discussion](https://github.com/prisma/prisma-engines/issues/5755).
- Verified the exact migration checksum/finished receipt, RLS enabled, anon/authenticated SELECT denied, and the read-only production compatibility gate: 60 migrations / 78 models.

Release to main and final production smoke: pending. CI now runs the disposable Passport database suite. The standalone test explicitly exits after database disconnect because the app rate limiter owns a housekeeping interval.

## Rollback

Revert the application release if existing discovery, account isolation or invitation routes regress. Keep the additive journal table, migration receipt and user data intact. Do not enable paid funding as a workaround. The previous main deployment is ff664b9a8e1f1137717aae34097bad2b673bb1b3.

## Review and verification limits

Personal progress cannot award server titles, visit evidence, Signal Points, money or paid-work eligibility. Only a confirmed QR_AND_GPS / VENUE_QR row with session ID, token hash and measured distance enters the place-stamp projection. Approved adventure contributions and approved non-seeded PlaceTags are separate evidence. Crew memory requires two distinct wallet owners and stays self-attested. Existing perk allocations remain governed by their own venue rules.

Cloud saving is deliberately manual, with visible merge and retry errors. We do not claim automatic backup, a proof of human uniqueness from wallet addresses, physical attendance from a crew report, or permanent achievements after underlying evidence is revoked.

External acceptance remains: physical-phone wallet/passkey/GPS/push flows; official venue QR availability and secret configuration; real media upload/moderation and staff perk redemption; delivery of actual invitations; a consented 20–30 person pilot; real full-price buyer delivery and repeat purchase; human-signed mainnet cutover and actual settlement. No external messages, paid missions, payment, secret rotation or contract changes were performed.
