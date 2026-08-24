---
type: product_playbook
status: SOFTWARE_READY
created_at: 2026-08-24
updated_at: 2026-08-24
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
   - open the canonical map context
   - add an exact time to calendar
   - invite another person with the existing Plan Link
5. Boat calendar export remains blocked until the operator confirms the exact departure.
6. An ended plan shows **Go again?** only to a viewer who RSVP’d. The new Rally gets a fresh time and fresh participant count.

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
> Map · Calendar · Invite · Open

## Rollout check

Measure whether joined users use calendar/share and whether ended participants start a repeat. If those actions do not improve real plan formation, do not add streaks, points, or heavier social mechanics.
