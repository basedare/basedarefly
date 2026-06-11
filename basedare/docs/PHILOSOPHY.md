# BaseDare — Core Philosophy & Operating Principles

> The durable "why" behind BaseDare. Read this before building features, writing copy, or planning GTM. Pages change; these don't. (Coding agents: build *from* these. Growth brain: `brain-vault/` operationalizes them.)

## What BaseDare is (one sentence)
**Proof-of-presence commerce for the IRL economy:** get paid in USDC to complete real-world missions, verified by actually being there (QR + GPS), onchain.

## The category we're in
The **"IRL economy"** — younger people investing in offline experiences and human connection itself, not screens. It is real, large, and funded (e.g. Airbnb led a **$58M** round into WeRoad's group-travel community in 2026 — see `brain-vault/03-insights/`). BaseDare is the **verified + paid** version of this wave.

## The 8 principles

1. **Proof, not performance.** Instagram/Beli/Atly/WeRoad are all *self-report* — you can claim a place you never went. Our QR+GPS check-in is the one thing none of them have. It is simultaneously the honesty engine and the sybil-resistant rewards engine. **Never dilute the proof gate** — it's the moat.

2. **The map is the feed.** No global timeline. You open a *place* to see its signal. Reputation, not reach. Anti-viral by design — discovery is geographic + reputation-gated, not algorithmic. This makes it feel underground/exclusive (a discovery club), which is the point.

3. **Lead with connection; back it with payment.** The IRL-economy demand is driven by *meeting people, adventure, belonging* — not money. Consumer-facing copy leads with **"find your scene / explore / belong,"** and "verified + paid" sits underneath as the moat. We have under-indexed on the emotional hook (too transactional/edgy); fix that in language, not mechanics. → see `brain-vault/03-insights/copy-learnings/`.

4. **You earn; you don't pay.** WeRoad: travelers pay. BaseDare: creators get *paid*, and venues/brands fund it. Demand side (venues wanting verified foot traffic) is the revenue engine and the cold-start solution at once.

5. **One sentence, one city, one loop, one receipt.** Concentrate, don't broadcast. Beachhead = Siargao / General Luna. Recruit local founding creators (= "group leaders"), run local events, prove the loop, then expand. (A ~$100M company runs this exact playbook — validation, not guesswork.)

6. **Best part is no part.** Subtraction over addition. Every surface earns its place; one job per screen; minimum parts. The worldview (Chaos / Peebear / "dares") is the *magnet* — second-touch. The plain loop (fund → show up → prove → paid → signal) is *first-touch*.

7. **Reputation now, token later.** Signal Points are reputation only — they rank creators up, gate access, build trust. No `$BARE` value is promised; airdrop "consideration" is framed as "first in line," never a guaranteed amount. This protects the brand from farm-the-token decay (the move-to-earn graveyard).

8. **Group & social is the fundable shape.** Solo missions work, but group missions / curated **Dare Routes** (multi-stop, hosted, social) are where the IRL economy concentrates value (WeRoad = 8–15-person curated journeys). v1.1 direction — *after* the single loop is proven.

## Build discipline (hard-won)
- **Working beats perfect, especially pre-launch.** Don't trade a functioning surface for a marginal polish that risks breaking it. (See the desktop-map renderer-freeze regression — a minor flicker fix that blanked the map.)
- **Verify before shipping** anything temporal/visual (map, animations) in a real browser. No blind edits to the 15K-line map.
- **Run water through the pipes.** Plumbing isn't proven until a real signed wallet action completes the loop end-to-end. Features are secondary to one proven loop.
- **Two agents, one repo:** respect ownership in `AGENTS.md`; coordinate on shared files.

## Operating loops (not feature queues)

BaseDare grows by tightening loops, not by adding surfaces. Before building anything, name which loop it strengthens and whether that loop has already run with a real human.

1. **Launch smoke loop:** before outreach or deploy confidence, run `npm run smoke`. It checks env, routes, passport/vault protections, creator payload shape, chain config, and payout fee sanity.
2. **Creator onboarding loop:** a real person claims a tag, tunes their Passport, becomes route-ready, and can be routed into paid missions.
3. **Venue pilot loop:** a venue funds one First Spark or micro-mission and sees verified arrivals or usable proof.
4. **Paid proof loop:** fund -> show up -> QR/GPS proof -> verify -> USDC payout/refund. This is the product heartbeat.
5. **Receipt loop:** each completion becomes a shareable proof artifact. Manual until the first 10 real completions.
6. **Reputation loop:** Signal Points rank trustworthy creators and gate better opportunities. Token talk stays later and carefully hedged.
7. **Spot vault loop:** a verified visitor leaves honest place signal, making the map more useful for the next explorer.
8. **Safety loop:** every money or IRL action has policy, moderation, and rollback paths before scale.
9. **Learning loop:** every DM, venue objection, and proof run creates an insight in `brain-vault/`, not a new feature request by default.
10. **Expansion loop:** only repeat to a new city after one city has repeat venues, active creators, and receipts without founder hand-holding.

Hard rule: **no new product surface until it either unblocks the paid proof loop or improves a loop that has already produced real-world evidence.**

## The north star (right now)
**Get 10 real creators through `/creators/onboard` and run 1 real paid loop.** Everything else is secondary.
