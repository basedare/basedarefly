---
type: product_playbook
status: SOFTWARE_READY
created_at: 2026-08-24
updated_at: 2026-08-26
owner: BaseDare
---

# Live Plan commitment loop

## Purpose

Close the gap between **I’m in** and a real plan without creating another product rail.

## State contract

1. A Rally or boat exposes its real time/place, real participant count, and stated minimum.
2. A signed, idempotent join writes the existing RSVP or crew membership.
3. The response says `unlockedNow` / `reachedMinimum` only when that write crosses the real minimum.
4. My Next Move derives from the existing joined state and exposes one compact action set:
   - open plan
   - open directions from public place-level coordinates
   - add an exact time to calendar
   - invite another person with the existing Plan Link
5. Boat calendar export remains blocked until the operator confirms the exact departure.
6. An ended Rally shows **Go again?** only to a viewer who RSVP’d. A departed boat shows **Same crew tomorrow?** only to a crew member. Each repeat starts with a fresh time and participant count.
7. A verified place update closes with **You made this place current** and the existing shareable receipt.

## Truth boundaries

- RSVP = declared intent.
- Crew unlocked = real database count reached the stated threshold.
- Plan ended = derived from the public time window.
- None of these prove attendance or completion.
- Only secure check-in or accepted proof may create verified presence/place memory.

## UX rule

Keep the commitment layer compact. It is a utility tray, not a manual:

> You’re in · My Next Move
>
> Thursday trivia · Hideaway · Thu 7:00 PM
>
> Directions · Calendar · Invite · Open

## Rollout check

Instrument only observable steps: confirmed join, directions opened, calendar added, invite shared, and repeat started. The north star remains **weekly real-world plans completed by two or more people**, but it must stay unpopulated until secure presence can honestly observe both completion and group size. If the commitment actions do not improve real plan formation, do not add streaks, points, or heavier social mechanics.
