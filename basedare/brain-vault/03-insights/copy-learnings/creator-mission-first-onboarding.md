---
type: copy_learning
status: ACTIVE
evidence: QUALITATIVE_FOUNDER_INTERVIEWS
captured_at: 2026-08-24
owner: codex
---

# Creator onboarding: show the mission before the system

## Signal

The founder spoke directly with prospective influencers. Their repeated response was that BaseDare is difficult to understand and too complex to onboard into.

This is qualitative evidence, not a quantified usability study. It is strong enough to change the cold creator entry because it matches the observed product problem: the current path asks creators to understand tags, passports, styles, availability, Dares, proof and reputation before they have seen a concrete paid opportunity.

## Locked contributor promise

> Pick a mission. Make it real. Get paid.

Supporting line:

> Check a place, capture a moment, or create something for a venue or brand.

## Product-language rule

The contributor sees one umbrella object: **Paid Mission**.

The contract can still be Field Truth, Experience Execution or Publication underneath. The card uses a plain badge:

- Visit & report
- Complete & film
- Create & publish

Translate internal terms at the creator edge:

| Internal term | Creator-facing term |
| --- | --- |
| Claim Dare | Request mission |
| Submit proof | Submit your work |
| Outcome contract | What to do |
| Receipt | Completed mission |
| Route ready | Ready for missions |
| Signal Points | Reputation |

## Funnel rule

1. Send the creator to one exact paid mission when possible.
2. Let them see the brief, location, deadline, submission requirement, usage rights and real net payout without signing in.
3. Ask for sign-in only when they choose **Request mission**.
4. Keep tag, profile, style, radius and availability setup until after demonstrated intent or completed work.

No manual, glossary or platform tour should sit before the first mission.

## Rights boundary

Requesting a mission grants no sponsor reuse rights. Acceptance and submission grant only the rights captured by the immutable mission contract and current Terms. Missions requiring sponsor commercial reuse remain hidden from `/earn` and blocked at the claim API until a separate explicit opt-in exists.

## Ecosystem routing

- `/now` and the map answer **what is happening?**
- `/earn` answers **what paid work can I request?**
- `/create` answers **what can I fund or start?**
- Eligible paid links from the map, Board, homepage and social sharing resolve to `/earn/<mission-short-id>`.
- Assigned, proof, review, payout and receipt states remain on the canonical Dare lifecycle underneath.

## What to measure

- exact mission link opened → mission viewed
- mission viewed → mission request
- mission request → approved assignment
- assignment → work submitted
- submitted → approved and paid
- questions or operator intervention required before requesting

The primary usability test is whether a new creator can answer, without help: **What do I make, where, by when, what do I submit, and what do I receive?**
