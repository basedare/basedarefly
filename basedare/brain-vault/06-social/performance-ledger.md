---
type: results_ledger
system: basedare-brain
status: ACTIVE
created_at: 2026-07-11
updated_at: 2026-07-13
owner: BaseDare founder
---

# Social Performance Ledger

> Fable's memory of what actually worked. Without this file, every week starts from
> zero and the same weak hooks get re-invented. One row per published post. Fill
> metrics at ~48h and again at ~7d; verdicts feed the next weekly package.

## Tracking convention (no new infra)

Every link into BaseDare uses UTM params so clicks are attributable:

```
https://basedare.xyz/<path>?utm_source=<x|ig|tt>&utm_medium=social&utm_campaign=w<ISO-week, e.g. 2026-28>&utm_content=<post-slug>
```

Deep-link targets that work today: `/join`, `/map`, `/how-it-works`, `/dare/<shortId>`,
`/brands/portal`.

UTMs are the pre-Journey fallback. Once tracked creator redirects are live, a
creator-partner episode must use a server-issued `/go/<creator>/<post>` link tied to a
real target. Never invent a creator code in a draft. The cross-browser attribution
contract lives in `../05-playbooks/creator-attribution-journey.md`.

## Verdict vocabulary

- **REPEAT** — format + hook worked; make a variant next week.
- **ITERATE** — signal exists but something specific underperformed (note what).
- **KILL** — format or hook is dead; do not resurrect without a new reason.

## Acquisition north star

**Qualified map actions per 1,000 short-form views** is the primary content-growth
metric. Follower growth and raw views are supporting signals, not the objective.

A qualified map action is attributable traffic that opens the featured place, mission,
Spark, Drop, or Route and continues into an intentional action such as save, join, claim,
or proof. Until that complete event funnel is instrumented, record attributable clicks
plus the downstream actions that can be audited honestly.

For creator-attributed episodes, the supporting receipt should also record:

- unique Journeys
- ActionIntents locked
- Mission Passes requested/sent/opened by delivery method
- cross-browser resumes
- verified participant bindings
- path-attributed server-verified unique completions
- creator-mission participation without a preserved acquisition path
- duplicate intents merged
- unrecoverable/direct completions in the same target window

## Ledger

| Date | Platform | Post URL | Series | Pillar | Artifact | Hook | CTA + link | Views | 3s / 6s hold | Completion / rewatch | Saves | Shares | Profile visits | Clicks → BaseDare | Qualified map actions | Downstream (joins / claims / proofs / missions / buyer convos) | Verdict + note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | | | | |

## Weekly review ritual (5 minutes, before the next package)

1. Fill any missing 7-day metrics on last week's rows.
2. Write a verdict on every row that has none.
3. Answer in one line each:
   - Which hook earned the most *saves* (not views)?
   - Which format produced the most qualified map actions per 1,000 views?
   - Where did people stop: hook, completion, click, action open, or action start?
   - How many started Journeys survived the in-app-browser to native-browser handoff?
   - Did any duplicate intents merge, and which canonical attribution won?
   - Did anything produce a downstream action (join, claim, proof, mission, buyer reply)?
   - What gets killed permanently?
4. The content-operator skill reads the last ~10 rows + these answers as input for the
   next weekly package.

## Kill list (permanent — hooks/formats that are dead)

- (none yet)
