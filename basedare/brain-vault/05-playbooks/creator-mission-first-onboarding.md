---
type: playbook
status: SOFTWARE_READY_FOR_PILOT
owner: product_growth
created_at: 2026-08-24
updated_at: 2026-08-24
---

# Creator mission-first onboarding

## Goal

Move a cold creator from a shared link to an informed mission request without teaching the BaseDare operating system first.

## Entry points

- General creator entry: `/earn`
- Preferred outreach entry: `/earn/<mission-short-id>`
- Existing canonical contract and receipt page: `/dare/<mission-short-id>`
- Assigned/in-progress work: `/missions`

## Operating sequence

1. Fund and publish one genuine open paid Dare through the canonical rail.
2. Open its `/earn/<mission-short-id>` view and confirm the plain-language brief, net payout, deadline, evidence and rights are correct.
3. Share that exact link with a creator who plausibly fits the brief.
4. Let the creator browse before authentication.
5. **Accept mission** sends the existing moderated open-Dare claim request.
6. A human approves or rejects through the existing claim queue.
7. Approved assignment, proof upload, review, payout and receipt remain unchanged.
8. Invite the creator to complete profile, tag and availability after value is demonstrated.

## State truth

This surface does not introduce a new lifecycle:

- Start: `Dare.status=PENDING`, genuinely open, paid, unexpired and unassigned.
- Trigger: creator submits **Accept mission** through the canonical claim API.
- Result: `claimRequestStatus=PENDING` with the authenticated wallet; main Dare status remains `PENDING` until moderation.
- Approval: the existing moderator rail assigns the wallet.
- Completion: existing proof, review, payout and receipt rails apply.

## Pilot guardrails

- Never show simulated, smoke-test or QA Dares as creator jobs.
- Never describe gross reward as creator take-home. Show the net creator payout and disclose the 4% settlement fee.
- Never begin work before assignment is approved.
- Keep full evidence, safety and rights language behind **Details**, but show its plain-language summary before acceptance.
- Social webviews save a Mission Pass and continue in Safari or Chrome; do not execute wallet auth inside the webview.
- Do not use fake mission inventory or fake scarcity.
- Use open paid missions for the first pilot. Targeted creator invitation edge cases remain on the canonical Dare/claim path until separately verified.

## Pilot success

Run five observed creator handoffs. Call this creator onboarding usable only if at least four can explain the job and submit an accept request without founder guidance. Record every clarification question and remove the cause rather than adding a manual.
