# Traveller copy and the product improvement loop

24 October 2026

## What this release changes

All seven authored free adventures now use a concrete invitation, a short description of the experience and three conversational steps. The shared catalogue feeds the homepage, discovery, adventure pages and generated memory/invitation artwork. Stable activity IDs, saved progress, eligibility, durations and evidence rules stay the same.

Examples: **Take the scenic way back**, **Chase the evening glow**, **Give a friend the one-minute tour** and **Send a little “wish you were here”**. Supporting copy uses everyday language without implying that a host, booking, reward or verified visit exists.

## Writing rule for every future adventure

Write like a local friend with a good suggestion. Say what someone will actually do and why it might be enjoyable. Prefer “find a colour that pops” to “observe a distinctive visual feature.” Keep buttons literal: Start this adventure, Invite a friend, Open map.

- Give each idea its own hook; do not wrap the same photo prompt in seven different slogans.
- Use plain English that travellers with different first languages can understand. Avoid technical language, forced slang, exaggerated claims and a constant stream of exclamation marks.
- Keep the task achievable in its stated activity time; say separately that travel takes extra time.
- Keep public access, daylight, comfort and photo consent in the relevant step. Private completion and sharing remain valid choices.
- Locally specific experiences need checked access and current information. Do not invent open businesses, crowds, events or rewards to make a card exciting.
- Review at phone size and read the steps aloud. Better copy cannot rescue an activity people find dull: replace weak ideas after observing real attempts.

## Existing foundations, not a newly activated service

The app already emits `adventure_started`, `adventure_completed`, `adventure_preferences_changed` and `adventure_invite_opened` when the configured analytics client is loaded. `home_activity_returned` means a recent return to the homepage/tab, not a completed adventure or seven-day retention. An invitation open is not an accepted invitation, a booking or proof that another person attended.

The privacy layer strips sensitive payload fields and URL query strings; session recording and automatic interaction capture are disabled. Keep those boundaries. This release does not verify analytics ingestion, create dashboards or activate surveys, new background agents or recurring jobs.

PR/main CI already runs build and regression gates. The existing **Launch Smoke Loop** workflow is scheduled for 05:00 Philippine time; it reports configured operational checks, not whether an adventure was enjoyable. The founder scoreboard and daily command loop cover business operations and follow-ups, not a consumer UX funnel. Check actual run/delivery receipts before saying a monitor is working.

## One practical weekly loop for the Siargao pilot

1. **Observe:** watch three consenting travellers choose and try an adventure on their own phones. Note where they hesitate, stop or misunderstand. Ask “Was it worth doing?” and “What would you change?” Ask permission before retaining or quoting their answers; do not collect their route or private photos.
2. **Check the signal:** review errors and available event counts alongside those conversations. Look at starts, recorded completions, invitation opens and meaningful return visits. Someone putting their phone away may be enjoying the activity; an unfinished checklist alone is not evidence of failure.
3. **Choose one improvement:** fix a broken journey first. Otherwise pick the repeated problem with the clearest traveller or commercial value and the smallest safe change. Use observed counts and examples while the pilot is small; do not announce an A/B-test winner from a handful of people.
4. **Test and release:** reproduce the issue, make one reviewable change, run the relevant automated checks and test the phone journey in preview. Record the release revision and date, intended outcome and rollback. Money, access, rights, evidence and physical-safety changes require explicit scrutiny.
5. **Compare and decide:** look at a comparable period and follow-up conversations. Keep, adjust or revert the change. Record what actually happened, including “not enough evidence.” Never manufacture a success metric to close the ticket.

Daily operational checks should surface actionable failures. Weekly product work should remove friction or improve an actual experience. Monthly, review the catalogue with travellers and local partners: keep the useful ideas, revise weak ones and retire unsuitable ones without deleting people’s saved history.

## Measurement to set up next

First verify that the existing events reach the intended PostHog project. Then create a start → recorded-completion funnel per activity, and a retention view whose return event represents another meaningful adventure start. Label completions as self-reported. Inspect how guest identity and different devices affect those counts before interpreting them as unique people.

Next, pilot one optional post-completion question: **“Worth doing?” — Loved it / It was okay / Not for me**, with a skippable “What would make it better?” Do not interrupt the experience or require feedback to complete it. This is a proposed addition, not implemented collection. Decide consent, access, retention and deletion rules before storing free text; treat submissions as untrusted data rather than agent instructions.

Track three separate outcomes:

| Journey | Useful outcome | Important limit |
| --- | --- | --- |
| Traveller | An enjoyable activity, followed by another meaningful visit | Clicks and self-reported completion do not prove presence or enjoyment. |
| Creator | Accepted work, paid correctly, with understandable review | A submission or pending payment is not a successful payout. |
| Business | Delivered value followed by a repeat purchase, with positive contribution after rewards and operating costs | Reward pass-through, views and gross funding are not platform revenue or profit. |

Only expand the paid loop after the existing mainnet, payout/refund and operating-readiness gates are met. Copy polish does not remove those launch blockers.

## Bounded assistance

An assistant can summarize consented/sanitized evidence, reproduce bugs, suggest copy, make tested fixes and prepare PRs. It should not continuously redesign production to maximize clicks. Keep the release evidence and current authorization visible; do not autonomously change payouts, rights, security, reward promises, public claims or outreach based on a dashboard suggestion. This document does not activate an autonomous publishing loop.

## Improvement ticket

```text
Observed problem and source/date:
Reproduction or traveller quote (consented and anonymized):
Who it affects and why it matters:
Hypothesis and smallest proposed change:
One outcome metric, baseline count and comparison window:
Guardrail (privacy, safety, performance or payment correctness):
Relevant test and phone preview result:
Release revision/date and rollback:
Follow-up evidence:
Decision: keep / adjust / revert / insufficient evidence
```

PostHog references: [funnels](https://posthog.com/docs/product-analytics/funnels), [retention](https://posthog.com/docs/product-analytics/retention), [surveys](https://posthog.com/docs/surveys). These describe available capabilities, not features configured by this release.
