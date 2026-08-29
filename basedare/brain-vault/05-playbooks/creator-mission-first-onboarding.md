---
type: playbook
status: SOFTWARE_READY_FOR_PILOT
owner: product_growth
created_at: 2026-08-24
updated_at: 2026-08-30
---

# Creator mission-first onboarding

## Goal

Move a cold creator from a shared link to an informed mission request without teaching the BaseDare operating system first.

## Entry points

- General creator entry: `/earn`
- Preferred outreach entry: `/earn/<mission-short-id>`
- Existing canonical contract and receipt page: `/dare/<mission-short-id>`
- Assigned/in-progress work: `/action-center`
- Optional mission alerts: `/earn#mission-alerts`

## Operating sequence

1. Fund and publish one genuine open paid Dare through the canonical rail.
2. Open its `/earn/<mission-short-id>` view and confirm the plain-language brief, net payout, deadline, evidence and rights are correct.
3. Share that exact link with a creator who plausibly fits the brief.
4. Let the creator browse before authentication.
5. **Request mission** sends the existing moderated open-Dare claim request.
6. A human approves or rejects through the existing claim queue.
7. Approved assignment, proof upload, review, payout and receipt remain unchanged.
8. Invite the creator to complete profile, tag and availability after value is demonstrated.

## Entry rule

`/creators/signup` is a compatibility redirect, not a second application funnel. It lands on the optional mission-alert form inside `/earn`. Seeing real work never requires a wallet, follower count, public profile, or creator application. Authentication is requested only after someone chooses a mission.

## State truth

This surface does not introduce a new lifecycle:

- Start: `Dare.status=PENDING`, genuinely open, paid, unexpired and unassigned.
- Trigger: creator submits **Request mission** through the canonical claim API.
- Result: `claimRequestStatus=PENDING` with the authenticated wallet; main Dare status remains `PENDING` until moderation.
- Approval: the existing moderator rail assigns the wallet.
- Completion: existing proof, review, payout and receipt rails apply.

## Pilot guardrails

- Never show simulated, smoke-test or QA Dares as creator jobs.
- Never describe gross reward as creator take-home. Show the net creator payout and disclose the 4% settlement fee.
- Never begin work before assignment is approved.
- A rejected request releases the mission back into `/earn`; `REJECTED` is a vacant request-slot state, while the next request still uses an exact compare-and-set.
- Hide sponsor-reuse-required missions from the public list and block their claim API until explicit, versioned opt-in consent is implemented and legally reviewed.
- Keep full evidence, safety and rights language behind **Details**, but show its plain-language summary before acceptance.
- Social webviews save a Mission Pass and continue in Safari or Chrome; do not execute wallet auth inside the webview.
- Do not use fake mission inventory or fake scarcity.
- Use open paid missions for the first pilot. Targeted creator invitation edge cases remain on the canonical Dare/claim path until separately verified.

## Pilot success

Run five observed contributor handoffs. Call this onboarding usable only if at least four can explain the job and submit a mission request without founder guidance. Record every clarification question and remove the cause rather than adding a manual.

## Integration contract

- Homepage **Find paid missions** opens `/earn`.
- The connected-wallet menu opens **My work** at `/action-center`; legacy Mission Passes remain a separate saved-pass utility.
- Eligible Board rewards link directly to `/earn/<mission-short-id>`.
- Legacy eligible `/dare/<mission-short-id>` links—including map and older shared links—redirect to the same `/earn` detail.
- Once assigned or in proof, review, payout or receipt states, the Dare page remains the canonical operational record.
