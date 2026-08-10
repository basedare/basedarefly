---
id: kanaway-daily-surf-boat-board
type: experiment
name: "Kanaway Daily Surf Boat Board"
status: SOFTWARE_READY_NOT_LIVE
owner: "product + local operator"
created_at: 2026-08-11
updated_at: 2026-08-11
---

# Kanaway Daily Surf Boat Board

## Objective

Test whether one recurring, useful coordination problem can turn the map into a daily social habit: helping compatible surfers fill a shared boat without making BaseDare the tour operator or payment intermediary.

## Hypothesis

If surfers can see `BOAT 3/4` on Kanaway's canonical marker, join as interested or confirmed, and receive final operator-confirmed details, at least 30% of formed crews will return to ask **Same crew tomorrow?**

## Segment

Surfers already considering Rock Island, Stimpy's, or Bumee/Bomi who want to share the locally quoted boat price and can accurately choose their own ability lane.

## Product Loop

`Kanaway marker → choose day / window / break / ability → 4 confirmed → authorized operator confirms actual trip → crew accepts → surf → Same crew tomorrow?`

## Boundaries

- BaseDare coordinates interest and consent only; it does not sell the trip, collect the fare, choose conditions, or guarantee safety.
- The real operator remains authoritative for price, capacity, destination, departure and whether the trip runs.
- Operator confirmation uses a short-lived private link shared by the organizer; no venue partnership or operator opt-in is inferred from a public listing.
- Payments stay direct to the operator.
- One person may confirm only one crew per departure day; interested status can remain flexible.
- No separate boat marker: the signal decorates the single canonical Kanaway venue marker.

## Metric

- boat calls created;
- time from `1/4` to `4/4`;
- confirmed-seat drop-off;
- operator-confirmation rate;
- final-detail acceptance rate;
- crews that reach `READY`;
- **Same crew tomorrow?** starts and 7-day repeat participants;
- safety complaints, no-shows and operator disputes.

## Success Threshold

Across the first 20 real boat calls:

- at least 10 reach four confirmed surfers;
- at least 70% of four-person crews receive operator confirmation;
- at least 70% of confirmed trips reach unanimous final acceptance;
- at least 30% produce a next-day crew start;
- zero payment custody, false partnership claims, or unresolved safety reports attributable to BaseDare copy or workflow.

## Result Summary

Not live. Software and migration are ready for release review; a real Kanaway/operator check and production migration are still required.

## Winner

Undecided.

## Next Action

Confirm the current boat-operator workflow and indicative ₱1,200 reference with a real local operator, deploy the migration, then run a bounded 20-call pilot before generalizing the mechanic to other activities or markets.
