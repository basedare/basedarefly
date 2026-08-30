---
type: product_playbook
status: SOFTWARE_READY
created_at: 2026-08-24
updated_at: 2026-08-30
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
10. Joining a Rally/meetup or confirming a boat seat unlocks one private Crew Room attached to that exact plan. Room access follows the canonical RSVP or confirmed-crew membership; sharing a room URL never grants access.
11. The room pins the plan's time, place and participant count above the conversation. One-tap coordination states — **I'm coming**, **I'm here**, **Running late**, **Need equipment**, and **Can't make it** — are recorded as room activity. **Can't make it** must also release the member through the plan's existing leave route.
12. Ordinary room messages stay quiet. Only operational state changes that materially affect the plan may notify the crew. Rooms remain active through a short post-plan grace period, then leave the active inbox without deleting the commercial or moderation record.
13. World Pulse is the time-and-place control over the shared Live Plan read model:
   - **NOW** means open inventory or a scheduled plan happening within the immediate 30-minute edge.
   - **NEXT 2H** includes now plus plans beginning within two hours.
   - **TONIGHT** ends at 04:00 in the destination timezone, not the viewer's device timezone.
14. A shared World Pulse link may preserve the time mode, selected plan, radius and rounded public map centre. It must never contain device-precision coordinates.
15. **Poke PeeBear** narrows the currently visible real inventory by **Surf**, **Social**, or **Surprise me**, then prioritizes the viewer's joined plan and plans that genuinely need people. It presents one answer before asking the user to act. Food/drink modes stay gated until opening hours and venue suitability are trustworthy.
16. Crew Rooms may publish declarative **10 min away** or **20 min away** states. These are expiring crew messages, never continuous location sharing.

## Truth boundaries

- RSVP = declared intent.
- Crew unlocked = real database count reached the stated threshold.
- Plan ended = derived from the public time window.
- **We went** is crew-reported attendance, not GPS or accepted evidence.
- Two confirmations support a crew-confirmed completion metric; they do not create verified presence or place memory.
- Only secure check-in or accepted proof may create verified presence/place memory.
- Crew Room membership is coordination access, not verified identity, attendance, safety clearance or payment authority.
- World Pulse labels describe source and freshness honestly: open missions may be **LIVE**, crew state is **REPORTED**, and imported venue events remain **SOURCE CHECKED**. A forecast must never be presented as an observed condition.
- Public view links use place-level coordinates only. BaseDare does not expose permanent precise participant location; future exact ETA sharing must be voluntary, temporary and crew-bound.
- Paid Dare threads remain durable commercial records. Place rooms remain place-bound and proximity-aware. Crew Rooms remain temporary and plan-bound; there is no global public chat.

## UX rule

Keep the commitment layer compact. It is a utility tray, not a manual:

> You’re in · My Next Move
>
> Thursday trivia · Hideaway · Thu 7:00 PM
>
> Directions · Calendar · Invite · Open

## World Pulse UX

The pulse is a decision surface, not a surveillance globe:

> See the island move. Join what happens next.
>
> NOW · NEXT 2H · TONIGHT · NEEDS PEOPLE
>
> PeeBear picked one → Rock Island boat · 3 going · needs 1

The existing BaseDare map stays the spatial view. World Pulse preserves a selected plan and public map centre when moving between the list and the map. A future cinematic mode is optional; it cannot outrank truthful inventory, fast joining or privacy.

## Crew Room UX

The room is an operating surface, not a destination feed:

> Rock Island · Tomorrow 7–9 AM
>
> 3 going · 1 more needed
>
> I'm coming · I'm here · 10 min away · Running late · Need a board
>
> Directions · Share · Open plan

Expose it from the joined Live Plan and **My Next Move**. Keep the global message icon as the inbox that aggregates Crew Rooms, place rooms and direct commercial threads. Do not require users to discover Chat before they can coordinate a plan.

## Rollout check

Instrument only observable steps: invite opened, confirmed join, directions opened, calendar added, invite shared, useful coordination state, self-reported attendance, and repeat started. Report **weekly crew-confirmed plans completed by two or more joined people** separately from verified attendance. Messages sent are not a success metric. If the commitment actions do not improve real plan formation, do not add streaks, points, global chat or heavier social mechanics.
