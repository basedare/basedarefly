# Runbook: The First Real Loop

**Goal:** run ONE Mission Night at ONE venue end-to-end, turn a flyer into a
receipt, and ask for the rebook. This is the real test — the product has enough
shape; it now needs a real receipt.

**The loop:** Board → Map → Venue Proof Page → QR/GPS proof → Receipt → rebook ask.

---

## Pre-flight (once, in this order)

1. **Set PostHog in Vercel** → `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com`, redeploy. Without it you run the loop **blind** (no funnel data, no `proof_shared`).
2. **Real-device check the Map "The Board" pill** (bottom-center; reposition if it collides with mobile controls / safe-area / a venue drawer).
3. **Pick one venue** — e.g. Hideaway or Siargao Beach Club (`/venues/<slug>`).
4. **Arm the QR session — RIGHT BEFORE the night, not days ahead.** Venue console (`/venues/<slug>/console`) → start the rotating QR session. *(Sessions rotate/expire — a stale session was the exact blocker in testing.)*

---

## Night-of (the loop)

1. **Create the flyer** — fund a dare at the venue: Venue Proof Page → "Create a challenge / fund a drop" (or `/create` prefilled). **Keep payout under $50** so it auto-settles on proof (no referee needed). → it appears on **The Board → Rewards** automatically.
2. **Confirm it's live** — `/board` shows the flyer under **Rewards**; `/map` shows the venue pin.
3. **Drive people** — put the QR poster up; share the Venue Proof Page + The Board. (Home "See the Board", Map "The Board" pill, the proof-page links all point in.)
4. **Run QR + GPS proof** — participant scans the venue QR → `/handshake` ("reading venue pass") → checks in (QR + GPS). They do the dare → **Take proof** on the venue page.
5. **Flyer → receipt** — presence-backed proof auto-approves; the sub-$50 dare auto-settles → it moves to **The Board → Receipts** and shows on the Venue Proof Page. *Watch this happen — it's the magic moment.*
6. **Show the venue** — open the **Venue Proof Page**: the proof strip + verified visits + the receipt. "Here's what last night produced — proof, not vibes."
7. **Ask for the rebook** — "Want next [day]? Same flyer, bigger reward." That ask is the whole point.

---

## Watch-outs (surfaced by the dry-run)

- **QR session freshness** — arm it just before; it rotates/expires.
- **$50 line** — under $50 auto-settles; over needs referee verification (`REFEREE_HOT_WALLET_PRIVATE_KEY`). Keep #1 under $50.
- **The Board is proof-backed only** — a flyer = a funded dare or a venue with check-ins. No arbitrary events will appear; that's intentional.
- **Measurement** — confirm PostHog Live events show `$pageview` + `proof_shared` during the run, or you can't tell what worked.

## Done =
One verified dare in **Receipts** + on the **Venue Proof Page** that you can show
the owner. One real receipt beats a sixth surface.
