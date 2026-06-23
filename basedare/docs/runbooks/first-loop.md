# Runbook: The First Real Loop

**Goal:** run ONE Mission Night at ONE venue end-to-end, turn a flyer into a
receipt, and ask for the rebook. This is the real test — the product has enough
shape; it now needs a real receipt.

**The loop:** Board → Map → Venue Proof Page → QR/GPS proof → Receipt → rebook ask.

---

## Pre-flight (once, in this order)

1. **Set PostHog in Vercel** → `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com`, redeploy. Without it you run the loop **blind** (the required signal is `$pageview`).
2. **Referee hot wallet ready (live-money blocker)** → `REFEREE_HOT_WALLET_PRIVATE_KEY` configured AND the wallet holds a little Base ETH for gas. Even a sub-$50, auto-approved proof still pays out onchain via this wallet (`verifyAndPayout`) — if it's missing/unfunded, proof verifies but payout stalls in `PENDING_PAYOUT`.
3. **Real-device check the Map "The Board" pill** (bottom-center; reposition if it collides with mobile controls / safe-area / a venue drawer).
4. **Pick one venue** — e.g. Hideaway or Siargao Beach Club (`/venues/<slug>`).
5. **Arm the QR session — RIGHT BEFORE the night, not days ahead.** Venue console (`/venues/<slug>/console`) → start the rotating QR session. *(Sessions rotate/expire — a stale session was the exact blocker in testing.)*

---

## Night-of (the loop)

1. **Create the flyer** — fund a dare at the venue: Venue Proof Page → "Create a challenge / fund a drop" (or `/create` prefilled). **Keep payout under $50** so valid proof auto-approves **without manual review** (live payout still runs through the referee hot wallet — see pre-flight #2). → it appears on **The Board → Rewards** automatically.
2. **Confirm it's live** — `/board` shows the flyer under **Rewards**; `/map` shows the venue pin.
3. **Drive people** — put the QR poster up; share the Venue Proof Page + The Board. (Home "See the Board", Map "The Board" pill, the proof-page links all point in.)
4. **Run QR + GPS proof** — participant scans the venue QR → `/handshake` ("reading venue pass") → checks in (QR + GPS). They do the dare → **Take proof** on the venue page.
5. **Flyer → receipt** — presence-backed proof auto-approves; the sub-$50 dare auto-settles → it moves to **The Board → Receipts** and shows on the Venue Proof Page. *Watch this happen — it's the magic moment.*
6. **Show the venue** — open the **Venue Proof Page**: the proof strip + verified visits + the receipt. "Here's what last night produced — proof, not vibes."
7. **Ask for the rebook** — "Want next [day]? Same flyer, bigger reward." That ask is the whole point.

---

## Watch-outs (surfaced by the dry-run)

- **QR session freshness** — arm it just before; it rotates/expires.
- **$50 = no manual review, NOT no referee.** Under $50, valid proof auto-approves — but live onchain payout still goes through the referee hot wallet (`verifyAndPayout`). Missing/unfunded wallet → proof verifies but payout stalls in `PENDING_PAYOUT`. Over $50 *also* adds manual review.
- **The Board is proof-backed only** — a flyer = a funded dare or a venue with check-ins. No arbitrary events will appear; that's intentional.
- **Measurement** — the required signal is `$pageview` in PostHog Live events. `proof_shared` only fires on an actual receipt-share tap — don't treat its absence as failure unless sharing was part of the test (it's a bonus signal).

## Done =
One verified dare in **Receipts** + on the **Venue Proof Page** that you can show
the owner. One real receipt beats a sixth surface.
