# Verified Drop — First Night Operator's Manual (Hideaway)

The complete, run-it-from-your-phone playbook for BaseDare's first real loop.
Companion: [field log](./verified-drop-field-log.md) (the capture sheet).

**Goal:** one Verified Drop at Hideaway — solo people arrive, get handed a crew +
a plan (built around the bar's games), buy one thing, prove presence, leave with
friends. Produce one real receipt.

**The principle: remove planning, not agency.** People love being handed a good
plan; they hate feeling controlled. BaseDare picks the next move and always keeps
an easy out — **join, swap, or step out — anytime.**

**The one thing you're really there to learn:** after their **scheduled rounds
end**, do participants **voluntarily ask for another game** — and do they **stay,
swap contacts, and sign up for next week?** (A bracket manufactures "what's my next
match," so that question doesn't count — the real signal is wanting *more* once the
plan runs out.) Plus: do shoulders drop when they're handed a crew?

---

## The three layers (keep them separate)
1. **Outcome contract** — fixed + billable: **"one eligible menu item purchase unlocks the whole night."** (Not "any drink" — includes food/soda/sober guests, fewer disputes. Never per-game.)
2. **Experience recipe** — BaseDare picks the crew, the meeting point, and the social mission (tonight: a game).
3. **Proof** — QR/GPS proves arrival; staff (or BaseCash/POS later) confirms the purchase; optional content proves the moment.

A mission compiles to: **meet these people → go here → order one thing → do one interesting thing together → unlock the reward.**

---

## Roles (assign by name)
- **You (founder) = director + observer.** NOT the host — watch whether they want *more* after the rounds end, and fill the log.
- **Host = the engine.** Greets at the door, draws crews + rounds, hands out missions, keeps energy.
- **Staff (1, behind the bar) = the meter.** Confirms the eligible purchase + redeems perks on the Venue Console device.
- **Creator (1) = the proof.** Captures the group moment (with consent); gets the one paid bounty.
- **Clawdbot (Telegram) = your ops console.** Live alerts (check-ins → proofs → payouts) hit your admin chat; from your phone at the bar you can `/approve` the creator's proof and pull `/stats`. Admin-only — guests never touch it.

---

## Event formats
> **The scalable insight isn't "BaseDare runs pool tournaments." It's: BaseDare detects a venue's existing _social objects_ and turns them into a structured crew-forming recipe.** Hideaway has pool + darts; a café has tasting prompts; a surf school has partner drills; a hostel has trivia or routes. Same Verified Drop machine, different interaction template.

Pick **one** for Night 1 (Hideaway = 3 pool tables + darts). Each is a curated deck the host runs by hand (no live AI yet).

**A) Blind Doubles mixer (pool) — recommended for 8–12.**
**Three timed rounds, reshuffling partners each round — no elimination, no skill
pressure, maximum introductions.** One eligible purchase buys into the whole night.
The draw *is* the decision-removal (you're told your partner, table, opponents).
Proof = table photos / a simple round sheet.
*3 tables × doubles = 12 people active at once — fits Night 1 perfectly.*

**B) Darts (overflow / odd numbers).**
Fast random-paired darts rounds — the release valve for odd numbers and late
arrivals between pool rounds. No bracket, no "loser buys," no spend pressure.

**C) Triple Crown card (the purest decision-removal night).**
A printed card with 3 stamps — pool, darts, one more game — each played with a
**different** crew. **One eligible purchase unlocks the whole card** (not one per
station). Three stamps → reward. The card tells each person exactly what to do and
who with. Stamps = proof.

**D) Captain's Draft (scale, Night 2+).**
Host drafts 3 crews; crews earn points across pool + darts; most points wins. More
team-y and structured — run it once the base door flow survives.

*AI's role:* detect the venue's social objects, design the recipe, generate the
round draws/pairings (random within constraints — pair strangers, rotate, balance),
generate per-crew prompts, and vary them weekly. Night 1 runs from a **curated
deck**; live generation is a later, evidence-gated build.

---

## Social safety (non-negotiable)
- **Photos require consent** — ask first; the creator shoots tables/the room, not faces without a yes.
- **Swap or leave anytime** — not just once. Stepping out is always fine, no explanation needed.
- **The group chat is optional** — joining Telegram can expose contact info; never required to play.
- **The host can quietly rematch or remove** anyone making someone uncomfortable — no drama.
- **Close the temporary group after 48h.**

---

## Pre-flight blockers (ALL true before the night)
- [ ] **PostHog** live (confirm `$pageview` events flowing).
- [ ] **Referee hot wallet** configured + funded with a little Base ETH (or payouts stall in `PENDING_PAYOUT`).
- [ ] **8–12 people pre-onboarded** (wallet-ready before the night).
- [ ] **Perk agreed** with the owner + briefed to staff.
- [ ] **Host briefed**, format chosen, mission deck in hand.
- [ ] **Two QRs sorted** (see below) — Claude arms the live check-in session on the date.
- [ ] **Venue Console** logged in on one staff tablet/phone.
- [ ] **Clawdbot alive** — `/help` responds in your admin chat (your live ops console); Signal Room (`@baresignalroom`) reachable for broadcast.

### ⚠️ Two different QRs (do not conflate — and don't put both at the entrance)
- **Invite QR** = a *static link* to the invite page. Distribute it **at hostels + online** — **not at Hideaway's entrance.**
- **Check-in QR** = the **rotating Secure Handshake** (15–180s), shown **live on a screen** (Venue Console on a tablet/TV/staff phone). **Never printed.** At the entrance, display **only this one**, clearly labelled — two nearby QRs confuse people.

---

## Phase 0 — Lock the contract (~30 min with the owner)
1. **Type:** Community-Social (the solo-traveler games night).
2. **Window:** quietest 2 hours, same slot weekly — e.g. **Thursday 7–9pm.**
3. **Outcome contract:** **"one eligible menu item purchase unlocks the whole night"** (fixed for the whole Drop — never per-game). Later-selectable menu: any purchase · min spend · featured item · group purchase · return visit.
4. **Perk:** low-cost / high-perceived-value, **unlocked by that one purchase** (e.g. tournament entry / a token / prize-draw entry). **Owner funds it.** *(Optional spend-local rail: the YODL-equivalent already exists as **BaseCash** — venue credit, redeemed once via staff, `/basecashapprove`.)*
5. **Target + cap:** **8–12 qualified customers** (controlled stress test — scale Night 2); one sub-$50 creator bounty (BaseDare-funded) + the perk (venue-funded). Cap both.

Also get the **baseline:** normal arrivals + sales in that window (for directional comparison — one night isn't causal proof).

---

## Countdown

### T–5 days
- Recruit **one magnetic host** (not you). Brief: *"you're the crew-maker — you hand people a plan + a game so they never figure anything out, but they can always swap or step out, anytime."*
- Open the invite list. Target **~15 commitments → expect 8–12 arrivals.**

### T–3 days
- Send the **pre-onboarding message** (below) to every invitee. Chase non-responders — wallet-ready-before-arrival is the #1 friction fix.
- **Spin up a temporary Telegram group** for the night (script below): host intro, meeting point, "most people are coming solo," light intros, final reminder. Announce it in the **Signal Room** (`@baresignalroom`) for reach. Joining is **optional**. This cheaply tests the future "Drop Room" — *record how people actually use it.* ⚠️ The bot is **admin/broadcast only** — it won't manage crews or onboard guests; the human host runs the group.
- Make the **printed invite flyer** (static QR → invite page) and distribute it **at hostels + online — not at the entrance.** ⚠️ **Distribute the social invite manually** — the Drop does **not** auto-appear on The Board; the creator bounty shows there as a *Reward* flyer, a different thing. Treat Board appearance as secondary for Night 1.
- Pick the **format** + write the **mission deck** (below).
- Create **ONE targeted sub-$50 dare** for the creator (the proof bounty). ⚠️ **Not an open dare.** **Don't promise all guests USDC** — they get the perk + the night; one creator gets the bounty.
- **Send Claude the date** → live check-in session armed + loop path-checked.

### T–48h — REHEARSAL (~20 min, do not skip)
Run the loop with **3 real people, 3 devices** (iPhone, Android, staff console device):
wallet connect → scan the **live** check-in QR → QR+GPS verifies → staff confirms the purchase → perk redeemed → proof upload → tiny live payout.
- **Time onboarding. Note every fumble. Fix ONLY what breaks here.**
- Confirm the **rotating check-in QR displays + scans** off the console screen.

### T–24h
- Confirm headcount; over-confirm for no-shows. Telegram reminder: *"Tomorrow, Hideaway, 7pm — come solo, you'll have a crew."*

### T–3h
- "Tonight at Hideaway" nudge. Host reviews the format, the round draws, and names.

### T–30 min (setup)
- **At the entrance: only the live check-in QR** on the Venue Console screen (tablet/TV/staff phone), clearly labelled "Check in here." (The static invite QR lives at hostels/online — keep it off the door.)
- Console logged in; staff briefed on the perk.
- Games clear and ready (tables open, darts set). Host at the door; you positioned to watch faces.

### T–0 → T+2:00 — the window (per arrival, target < 2 min)
1. **Host greets at the door** (kills anxiety) — *script below.*
2. Player **scans the live check-in QR (off the console screen) → allows location → QR+GPS verifies → "You're in."**
3. **Host hands them a crew + a game mission + the easy out** — *the decision-removal moment.*
4. Player **orders one eligible item** (baked into the mission) → **staff confirms → redeems the perk.**
5. Crew plays the mixer / runs the mission → **creator captures the proof (with consent)** → submits (the dare auto-settles).
- **You:** tally the funnel live, tag interventions, and watch what happens *after* the scheduled rounds end (voluntary extra game? stayed? swapped contacts?).

### Immediately after
- Host runs the **closing ask** (script). You produce the **receipt** + **shadow invoice.**

### Next day
- Owner debrief (script). Log Defaults / Choices / Exceptions while fresh. Note how the Telegram group was actually used, then **close it after 48h.**

---

## Scripts (copy-paste)

**Pre-onboarding message:**
> You're on the list for Hideaway games night — Thursday 7pm 🎱🎯 Come solo, leave with a crew. 60-sec setup so you're ready at the door: [link] → tap Connect → done. See you Thursday.

**Telegram group intro (host posts) — joining is optional:**
> Welcome to Thursday's Hideaway crew! I'm [name], I'll be running it. Most people here are coming solo — that's the whole point. We'll sort you into game crews on arrival. Meet point: the bar, from 7. (This group's optional — no need to share anything you don't want to.) Drop a 👋 if you like.

**Printed invite flyer / poster (static QR → invite page; hostels + online, not the door):**
> **HIDEAWAY GAMES NIGHT** · Thursday 7–9PM
> Come solo. Get a crew. Play pool + darts.
> Order one thing off the menu to play.
> **[ Scan to join tonight ]**

**Host — door greeting:**
> Hey, here for games night? Most people came solo too — I'm [name]. Scan the screen here, allow location, and I'll get you a crew.

**Host — crew + mission handoff (with the easy out):**
> You're with [A] and [B] — you've drawn Table 2. Grab one thing off the menu, then it's blind doubles, three quick rounds, new partners each time. Want to swap or sit one out? Anytime, just say. Go say hi 🎱

**Mission deck** (one eligible purchase per person unlocks the whole night — no per-game spend, no group spend, no alcohol requirement):
1. **Blind doubles mixer:** you + [partner], Table [n], vs [pair]. Order one item to play; new partners next round (3 rounds, no elimination).
2. **Darts:** you vs [name] at the board — quick 301, then pick the next challenger together.
3. **Triple Crown:** collect 3 stamps — pool, darts, [game] — each with a different crew. One purchase unlocks all three.
4. **Strangers' table:** crew [A][B][C], Table [n]. Rack up, and find out the strangest place each of you has travelled.

**Conversation prompts (pair with any game):** strangest place you've travelled · best meal on the island · one thing to do before you leave.

**Staff briefing:**
> When someone shows the unlock screen or says "games night" — confirm they've ordered **any one eligible menu item**, then tap **Redeem** on the console. One purchase covers their whole night.

**Host — closing ask:**
> That's the night! You came solo and you've got a crew. Same time next Thursday — **bring one person.** And who wants to help host next week?

**Owner debrief (next day):**
> Tonight: [X] verified arrivals, [Y] made an eligible purchase, [Z] new faces, photos + clips — here's the Proof Page. Normal Thursday was ~[baseline] — a directional difference (one night can't prove causality). Run it again next week?

---

## Troubleshooting (failure → on-the-spot fix)
| Problem | Fix |
|---|---|
| Wallet won't connect | Rare (pre-onboarded). Host helps reconnect; if stuck, note "arrived, manual" and move on. |
| Check-in QR won't scan / GPS denied | Refresh the rotating QR on the console; have them toggle location on. Fallback: host logs them manually. |
| Person won't buy | Reframe: "any one item counts — even a soda — and it covers your whole night." Don't push; log verified-but-unqualified. |
| Odd number / late arrival | Send them to darts (the overflow valve) until the next pool reshuffle. |
| No-shows | Expected — that's why you invited ~15 for 8–12. |
| Staff redemption fails | Owner's device as console backup; tally redemptions by hand if needed. |
| Someone's uncomfortable | Host quietly rematches or removes — no drama, no questions. |
| Payout `PENDING_PAYOUT` | Referee wallet unfunded — the *result* still counts; payout settles once funded. |

---

## The receipt (partly manual for now)
BaseDare automatically records **verified arrivals + perk redemptions**. It does
**not yet** produce a one-click Drop-scoped report with till sales + qualified
purchases + incremental contribution. So the first receipt = **BaseDare proof data
+ venue till numbers + manual Drop-window reconciliation.** (BaseCash/POS can
automate purchase attribution later — keep it optional.)

- Compute the **shadow invoice** (don't send): hypothetical CPV × qualified customers; keep customer-spend / reward-subsidy / COGS separate — never inflate.
- Frame results as a **directional difference from baseline**, never proven "lift" — one Thursday isn't causality.
- The ask: **"Same Thursday? Everyone bring one."** Spot the best participant as a future host.

## After Night 1 — turn it into the machine
- Same format **3–4 weeks, change ONE variable/week** (format / perk / message / channel).
- After ~4 nights: **Defaults → build · Choices → menu · Exceptions → ignore.**
- Then **hand this runbook to a different host + run a second, arms-length venue** (a different social object — café tasting, surf drills, hostel trivia) unchanged — the portability test that proves the *machine* travels, not the pool tables.

---

**Division of labor:** everything human is yours (owner, host, people, perk, room). Claude's two jobs on the date: **arm the live check-in session** + **verify the loop end-to-end** so the door can't fumble.
