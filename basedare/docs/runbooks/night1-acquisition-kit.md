# Night 1 — Acquisition Kit (Hideaway)

The marketing that's worth doing *now*. Companion to [first-loop.md](./first-loop.md)
+ the [field log](./verified-drop-field-log.md).

**Principle:** don't advertise BaseDare broadly — **advertise one specific Drop
locally.** Proof becomes the creative, but it does **not** distribute itself; you
push it through channels. Anti-*global-feed*, not anti-*sharing* — local invites,
referrals, and receipts moving through nearby communities are the whole model.

**Message rule:** lead with **connection** ("come solo, leave with a crew"), never
crypto / USDC / verification / tech. The rails are the backbone, not the pitch.

---

## Three channels only (each gets its own source code)
1. **Host personal invites** → `?src=host`
2. **Two hostel / front-desk partners** → `?src=hostel-a`, `?src=hostel-b`
3. **One local Instagram + traveller-group-chat push** → `?src=ig`

> Distribution can land in IG/FB/Telegram traveller chats + the **Signal Room**
> (`@baresignalroom`, Telegram broadcast) for reach — but **the group people
> actually join for Night 1 is a temporary WhatsApp group** (travellers already
> have it; optional; closed after 48h). BaseDare's owned platform (Signal Room +
> bot) stays Telegram; only the throwaway guest group is WhatsApp.

---

## The assets (copy-paste)

**Hostel poster** (A4 · QR = `[invite-link]?src=hostel-a`):
> **COME SOLO. LEAVE WITH A CREW.** 🎱
> Thursday games night @ Hideaway · 7–9PM
> We sort you into a crew + hand you the plan. Just show up.
> Pool · darts · meet 8–12 travellers
> **[QR] Scan to join tonight**
> *free · order one thing off the menu to play*

**Front-desk script** (for hostel staff):
> "Solo or bored tonight? There's a games night at Hideaway, 7pm — they put you in a crew so you're not walking in alone. Scan this, that's it." *(point to the poster QR)*

**Host personal invite** (DM · `?src=host`):
> Yo — running a games night Thursday at Hideaway, 7pm. Putting solo travellers into crews, pool + darts, super chill, no pressure. You in? → [invite-link?src=host]

**Instagram story** (`?src=ig`):
> *[photo/graphic]* "Solo in Siargao Thursday? 🏝️ Hideaway games night — we hand you a crew + a plan, no awkward entrance. Pool + darts, 7pm." → *link sticker* [invite-link?src=ig]

**WhatsApp / traveller-chat invite** (`?src=ig`):
> Thursday games night @ Hideaway 🎱🎯 Come solo — we give you the crew + the plan. Pool, darts, 8–12 travellers, one item off the menu to play. Join → [invite-link?src=ig]

---

## Attribution — measure qualified customers per source
Three links, three source codes. **Treat Night-1 attribution as MANUAL** — a
per-source clipboard tally (pre-assign by the link they used, or ask "how'd you
hear?"). A `?src=` param *may* surface in PostHog pageviews, but **"joined" and the
downstream funnel (arrived → verified → purchased → returned) are NOT auto-wired** —
don't assume the data shows up on its own. Count by hand for Night 1; wire it later.

| Source | code | Invited | Joined | Wallet-ready | Arrived | Verified | Purchased | Returned wk2 |
|---|---|---|---|---|---|---|---|---|
| Host | `host` | | | | | | | |
| Hostel A | `hostel-a` | | | | | | | |
| Hostel B | `hostel-b` | | | | | | | |
| Social | `ig` | | | | | | | |

**The question this answers:** which channel delivers *qualified customers* — not
clicks. (Feeds the [field log](./verified-drop-field-log.md) raw funnel.)

---

## After the first receipt — the content package
Turn one Drop into reusable creative (then **distribute it** — it won't move itself):
- Crew photo (with consent)
- 10–20s recap clip
- Stat overlay: **"10 solo travellers → 8 verified customers"**
- Next Drop invitation (CTA)
- Venue Proof Page link
- Owner testimonial — *only if genuinely earned*

**Distribute through:** hostels · surf schools · coworking spaces · cafés ·
traveller group chats · and the participants themselves (ask them to share their crew photo).

**Recruit creators with it** (the receipt *is* the pitch): *"Hideaway's last Drop = 8 qualified customers. We'll pay you for every additional customer you bring to the next one."* Evidence recruits creators; an unproven idea doesn't.

---

## Four GTM motions — never combine in one ad
- **Players:** "Come solo. We give you the crew and the plan."
- **Residents / hosts:** "Run great nights without organizing everything yourself."
- **Creators:** "Get paid for the verified customers you bring — not for posts."
- **Venues:** "Only pay for qualified customers BaseDare can prove."

---

## Positioning & messaging (the content brand)
**Master villain: _maybe_ — unverified attention.** Don't villainise agencies,
influencers, or Web2 — you need them as partners. The enemy is the *broken system*:
views that never become visits, followers that never become customers, reports
nobody can verify, plans that die in the group chat. Contrast: **promises vs proof ·
attention vs action · maybe vs verified.**

**Villain, tailored by audience** (one enemy, three faces — never mixed in one piece):
- **Venues** (B2B): paying for uncertain attention → *"Stop paying for maybe."*
- **Creators:** influence they can't prove or monetise → *"Influence should have a receipt."*
- **Players:** plans that never happen + the awkward solo arrival → *"Come solo. Leave with a crew."*

**The recurring question — every reel, carousel, and receipt answers it:**
> **"But did anybody actually show up?"**

### Pre-receipt — launch NOW (the question; honest, problem-led, NO outcome claims)
- "Your campaign reached 30,000 people. Did anybody show up?"
- "Influence without attribution is still a guess."
- "We're testing whether venues can pay for verified customers instead of views."
- "Most travel plans die in the group chat. We're running a different experiment."

→ Frame it as an *experiment you're running*, never a proven result. The villain can exist immediately; only outcome claims wait.

### Post-receipt — launch AFTER Night 1 (the answer; proof-led, real numbers)
- "10 arrived. 8 verified. 7 purchased."
- "This creator generated four qualified customers."
- "Here's what Hideaway's quiet Thursday produced."

→ ⚠️ The question is double-edged: don't make outcome claims until you can show **your** receipt, or the first skeptic turns it back on you. The proof earns the line.

**Brand story:** villain = marketing built on unverifiable attention · hero = creators who move real people · buyer = venues tired of paying for promises · mechanism = verified presence + qualifying purchase · reward = creators paid / players get a night / venues get customers · **artifact = the receipt.**

**Faceless content:** fine for cheap hook-testing (text carousels, voiceover reels, absurd-marketing-report screenshots, animated receipt numbers, before/after venue stories) — but real humans doing real things is the edge, so verified Drops, creators, and receipts must become the *main* creative.

---

## Deferred (not now)
- **Permanent Verified Drop package** — the existing `activation-packages` catalog is reusable, but it sells *creator content*, not *qualified customers*. Let Night 1 set the real delivery burden + economics first, then extend the catalog.
- **Paid ads** — after 2–3 successful Drops: a geofenced **$20–50 IG test, connection-led vs reward-led creative.** A/B the message, never the loop.
