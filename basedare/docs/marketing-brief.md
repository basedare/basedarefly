# BaseDare Marketing Brief — Siargao Ignition

**Reads with:** `feature-guide.md` (what's true) · `onboarding-hooks.md`
(what to say) · `PHILOSOPHY.md` (why). This brief is the strategy layer:
objectives, positioning, channels, budget, measurement. KPI numbers are
proposals — adjust, don't ignore.

---

## 1. Situation

- Product: verified-presence map for real nights out. Core loop shipped and
  live: passkey sign-in → check in (GPS+QR) → thermal receipt → verdict →
  crossed paths → earned DMs → streaks → Mayor crowns → meetups.
- Stage: pre-density. One island (Siargao), ~zero real users, founder-led.
- Assets: personal X account only. No brand socials (handles unregistered —
  do this week). No budget spent to date.
- Strategy lock (PHILOSOPHY.md): one city, one loop. Users and word-of-mouth
  over revenue. The map is the feed. Underground, not launched.

## 2. Objectives

**14-day (Ignition):**
- 10+ claimed Baretags (the mates wave)
- 1 venue claimed by its owner (Hideaway)
- 1 funded dare completed and PAID on a real night
- 15+ receipts shared to stories/chats

**90-day (Density):**
- 100 claimed Baretags active on Siargao
- 10 venues with verified proof trails; 3 owner-claimed
- 1 recurring weekly night (venue-funded by day 90)
- 100+ receipt shares; measurable ?by= referral arrivals
- The sentence "you can only DM people you've met" heard back from a
  stranger (the qualitative KPI that word-of-mouth works)

**Explicit non-goals:** revenue, follower counts, press, more cities.

## 3. Positioning

- **Category:** not social media — *the proof layer for real life.*
- **One-liner:** "Snap Map meets Pokémon GO for real nights out — and the
  receipts can't be faked."
- **Thesis line (X):** proof of presence > proof of stake. #HumanOnly.
- **Enemy:** AI slop and fake signal. Everything on BaseDare provably
  happened. (Never name competitors; the enemy is fakeness.)
- **Brand voice:** lowercase founder voice · artifact-led (every post
  contains a real screenshot/receipt) · zero crypto vocabulary in
  user-facing copy · "one-tap" not "Face ID" · never "encrypted" ·
  underground register: leak, don't launch.

## 4. Audiences (effort split)

| Priority | Audience | Effort | Door (see hooks doc) |
|---|---|---|---|
| 1 | Mates + island locals | 40% | Mayor, land grab, the night |
| 2 | Venue owners | 25% | "You're already on the map" — claim free |
| 3 | Tourists/backpackers | 20% | Receipt + earned DMs |
| 4 | Contributors/earners | 4% success fee | Dare → proof → 96% payout |
| 5 | X thesis crowd | 5% | #HumanOnly credibility (not acquisition) |

## 5. Channels & roles

- **IRL (primary acquisition):** tabletop QRs at partner venues, the group
  night, the venue-owner pitch (script in hooks doc). Nothing beats a
  receipt minted in front of someone.
- **Personal X:** build-in-public + thesis. 3 posts/week cap. Credibility
  channel, not acquisition.
- **IG/TikTok (@basedare, activate AFTER first real night):** receipts,
  crown wars, reels. Geotags + Siargao hashtags. This is the tourist
  channel and it needs real footage to exist.
- **Siargao Facebook groups:** exactly one authentic post, only after the
  loop demonstrably works. Highest local reach per effort on the island.
- **Telegram Signal Room (@baresignalroom, exists):** live activations feed
  for the already-converted.
- **Product-as-channel:** receipts w/ ?by= links, land-grab scarcity, DM
  gate curiosity, Mayor rivalry. The product is the referral program.

## 6. Campaign arc

- **Phase 0 (gate):** Android/desktop QA green → drill night → handles
  registered → screenshot bank built.
- **Phase 1 — Ignition (days 1–14):** the 14-day plan in
  `onboarding-hooks.md` (mates → public land grab → the Friday night).
- **Phase 2 — Density (weeks 3–8):** weekly rhythm: Mon crown/heat recap ·
  Wed land-grab countdown · Fri/Sat live receipts. Venue #2 pitched with
  Friday's receipts. IG/TikTok activate. Crossed-paths density makes the
  social layer self-demonstrate.
- **Phase 3 — Proof of business (weeks 9–13):** first venue-FUNDED night
  (they pay the bounty, not you). Recap page becomes the sales deck.
  Mission Night packaging (per strategy memo) offered to hostels.

## 7. Budget (ignition, total < $100)

| Item | Cost |
|---|---|
| First-round drinks, group night | ~₱1,500 |
| 2 dare bounties (USDC) | $10–40 |
| Tabletop QR prints (10 venues) | ~₱500 |
| Gas for funder wallet | ~$5 |
| Paid ads | $0 — banned |

## 8. Measurement (weekly review ritual, Mondays)

- **PostHog:** pageviews (incl. `?by=` arrivals), `proof_shared` funnel
  (attempt → success/fallback), `venue_verdict` counts.
  Gate: confirm `NEXT_PUBLIC_POSTHOG_KEY` is set in Vercel prod.
- **DB truth:** claimed tags, approved proofs, venues-with-proofs,
  owner claims, meetups posted, DM threads opened via crossed paths.
- **Qualitative:** did anyone say a hook back to you unprompted?
- Kill/adjust rule: any channel with zero signal after 3 weeks of
  consistent posting gets dropped without ceremony.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Density failure (empty map feels dead) | One venue, one night, repeat. Never spread thin. Seeds/QA content clearly labeled. |
| Demo stumbles in front of strangers | QA gates + drill night before any public push. |
| Copy outruns product | Feature-guide tier system is law (PROMOTE NOW only). |
| Founder burnout / posting fatigue | 3 posts/week cap; artifact-led means low production cost. |
| Harassment via social layer | Presence-gated DMs by design; report/block APIs live; verdicts are one-per-wallet. |
| "Crypto app" mislabel | Zero crypto vocabulary; passkey-first onboarding; money framed as "get paid", not tokens. |

## 10. Asset checklist

Have: thermal receipt (the ad unit) · venue-sealed OG cards · proof reels ·
Mayor crowns · feature guide · hooks bank · venue pitch script · group-chat
sequence. Missing: brand handles (register this week) · tabletop QR prints ·
screenshot bank · real land-grab count for the countdown post (query on
request).
