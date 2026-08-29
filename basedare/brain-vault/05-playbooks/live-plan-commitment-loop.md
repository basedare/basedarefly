---
type: product_playbook
status: SOFTWARE_READY
created_at: 2026-08-24
updated_at: 2026-08-28
owner: BaseDare
---

# Live Plan commitment loop

## Purpose

Close the gap between **I’m in** and a real plan without creating another product rail.

## State contract

1. A Rally or boat exposes its real time/place, real participant count, and stated minimum.
2. A signed, idempotent join writes the existing RSVP or crew membership.
3. The response says `unlockedNow` / `reachedMinimum` only when that write crosses the real minimum.
4. My Next Move derives from the existing joined state, persists across NOW, Map, Board and Dashboard, and exposes one compact action set:
   - open plan
   - open directions from public place-level coordinates
   - add an exact time to calendar
   - invite another person with the existing Plan Link
5. Boat calendar export remains blocked until the operator confirms the exact departure.
6. An ended Rally shows **Same crew again?** only to a viewer who RSVP’d. A departed boat shows **Same crew tomorrow?** only to a confirmed crew member. Each repeat starts with a fresh time and participant count, then invites the prior opted-in crew without auto-joining them.
7. A verified place update closes with **You made this place current** and the existing shareable receipt.
8. After the plan begins, a joined participant may self-report **We went**. Two distinct joined participants must confirm before the plan contributes to the crew-confirmed completion metric.
9. Invite-open, joined, attendance-confirmed and repeat-started events use the append-only attribution ledger. They never authorize attendance, proof, payout or place verification.

## Truth boundaries

- RSVP = declared intent.
- Crew unlocked = real database count reached the stated threshold.
- Plan ended = derived from the public time window.
- **We went** is crew-reported attendance, not GPS or accepted evidence.
- Two confirmations support a crew-confirmed completion metric; they do not create verified presence or place memory.
- Only secure check-in or accepted proof may create verified presence/place memory.

## UX rule

Keep the commitment layer compact. It is a utility tray, not a manual:

> You’re in · My Next Move
>
> Thursday trivia · Hideaway · Thu 7:00 PM
>
> Directions · Calendar · Invite · Open

## Rollout check

Instrument only observable steps: invite opened, confirmed join, directions opened, calendar added, invite shared, self-reported attendance, and repeat started. Report **weekly crew-confirmed plans completed by two or more joined people** separately from verified attendance. If the commitment actions do not improve real plan formation, do not add streaks, points, or heavier social mechanics.
