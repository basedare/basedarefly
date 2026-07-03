# BaseDare Feature Guide — what exists, who it's for, how to use it

**Status:** living doc. Goal of this phase: **users and word-of-mouth, not
revenue.** Every feature is judged by one question: *does it give someone a
reason to sign up, come back, or tell a friend?*

**Every claim in this doc carries one of three labels — never blur them:**
- **PROMOTE NOW** — shipped, works today, say it out loud to strangers.
- **DEMO CAREFULLY** — shipped, but needs density or device verification
  before it demos smoothly. Show it yourself; don't promise it cold.
- **TARGET FLOW** — designed or partially built. Internal language only.

Copy discipline: never say "Face ID" in product or promo copy — passkeys are
Face ID on iPhone, fingerprint on Android, QR-to-phone on desktop. Say
**"Continue with phone"** or **"one-tap passkey."**

---

## The five to hammer (promote these, ignore the rest)

### 1. The Living Map — "where's popping right now" · PROMOTE NOW
The map is the feed. Venues glow by verified activity: heat is weighted by
real proofs, live dares, and recency (a proof in the last hour burns brightest;
quiet spots visibly cool). Gold = verified, purple = presence, cyan = live
dare, gray = no proof yet.
- **Hook:** nightly utility. Open it on the couch, know where to go.
- **How:** basedare.xyz/map → browse free, no signup → tap any venue.
- **Share moment:** "look what's popping" screenshot.

### 2. Take Proof → the venue-sealed receipt · DEMO CAREFULLY (until connect flow is device-verified)
Check in at a venue with GPS + QR and you mint a verified receipt of your
night — PeeBear-stamped, venue-sealed ("VERIFIED AT HIDEAWAY · #HUMANONLY").
It's yours forever, on the map, unfakeable.
- **Hook:** you walked in with nothing; 60 seconds later you own proof you
  were there. Nobody can fake it — not even AI.
- **How:** map → tap venue → gold **TAKE PROOF** button → one-tap passkey →
  done. First proof at a virgin venue = you own "FIRST PROOF" permanently.
- **Share moment:** the receipt card unfurls with the venue seal on X /
  iMessage / anywhere — every share is an ad with your name on it.

### 3. Earned DMs — "you can only message people you've actually met" · DEMO CAREFULLY (needs check-in density; invisible at zero overlaps)
Crossed paths = both of you checked in at the same venue the same night
(verified, ±6h). Only then does the venue panel show them and a 👋 Wave
button. Cold DMs from randos are impossible by design.
- **Hook:** the anti-Tinder. Every conversation starts from a real shared
  night. Safety and serendipity in one feature.
- **How:** check in → open the venue panel later → **Crossed Paths** section
  → 👋 Wave → chat opens pre-filled.
- **Share moment:** the pitch line itself. Say it out loud at a bar and watch
  people install.

### 4. Proof Reels — the night, replayable · PROMOTE NOW (at venues with proofs)
Tap **▶ Reel** on any venue's Recent Proofs and watch its verified proofs
play fullscreen like a story — every frame stamped VERIFIED, credited, and
timestamped. Snapchat venue stories, except none of it can be faked.
- **Hook:** browseable content that doubles as venue reconnaissance ("what's
  this place actually like at night?").
- **How:** map → venue panel → Recent Proofs → **▶ Reel** → tap/swipe.

### 5. Streaks + the first-proof land grab · PROMOTE NOW
Consecutive nights with a verified proof = a 🔥 streak on your Passport
(verified-only — can't be botted with posts). Virgin venues show "no proof
yet": be first anywhere and the FIRST PROOF badge is yours forever.
- **Hook:** the game layer. Streaks retain, land-grabs spread (there are
  only so many venues on the island).
- **How:** proofs count automatically; streak chip appears from 2 days.

---

## Full catalog by audience

### For everyone (the crowd — tourists, locals, the 1am crew)
| Feature | Where | How |
|---|---|---|
| Living map + heat | /map | Browse free, no signup |
| Popping Now alerts | /map dock | Auto-surfaces when a venue has live/fresh activity |
| Take Proof (GPS+QR check-in) | venue panel | Gold button → Face ID |
| Venue-sealed receipts | auto on proof | Share sheet from receipt |
| Proof Reels | venue panel → ▶ Reel | Tap/swipe through verified proofs |
| Crossed Paths + Wave | venue panel | Appears after verified overlap |
| Earned 1:1 chat | /chat | Unlocked only by crossed paths |
| Venue rooms (Local Chat) | venue panel | Check in or get nearby to open |
| Who's Here | venue panel | Live presence at the venue |
| Spot Vault + field reviews | venue panel | Permanent proof trail per venue |
| The Board | /board | What's verifiably happening (flyers → receipts) |
| Free meetups (view) | /map layer filter | All · Live Dares · Free Meetups · Happening Now |
| BaseCash venue credit | /basecash/receipt/[id] | Spend-local credit at partner venues |
| How it works / FAQ | /how-it-works, /faq | The explainers |

### For creators (earners)
| Feature | Where | How |
|---|---|---|
| Claim your Baretag | /claim-tag | Google/Twitter login works — wallet optional at first |
| Creator Passport + missions | /creators/onboard | Starter missions earn Signal Points |
| Signal Points ledger | passport | Points for proofs, vault contributions, missions |
| 🔥 Verified streaks | passport card | Automatic from proof days |
| Browse + claim dares | /dares, /dare/[id] | Complete → verify → USDC payout on Base |
| Create a dare / Community Spark | /create | Paid (USDC escrow) or free community mission |
| Public creator profile | /creator/[tag] | OG card unfurls on share |
| Leaderboard | /leaderboard | Ranked by verified output |
| First Spark | /first-spark | Apply to run a venue's first activation |
| Host / Captain / Scout tracks | /hosts, /scouts | Operator paths (recruit via receipts) |

### For venues
| Feature | Where | How |
|---|---|---|
| Venue page + proof trail | /venues/[slug] | Public trust page, auto-built from proofs |
| Claim + command console | venue page → console | Metrics: visitors, scans, live funding |
| Fund a dare at your venue | /create | USDC escrow → verified completion pays out |
| Venue-sealed receipts | automatic | Every shared proof advertises the venue |
| QR check-in infrastructure | console | Tabletop QR = the onboarding funnel |
| BaseCash issuance | console/admin | Fund spend-local credit (welcome drinks etc.) |
| Recap pages | /venues/[slug]/recap | Shareable night-after summary |
| Brand campaigns | /brands/portal | Multi-venue paid activations |
| Heat visibility | /map | Verified activity literally makes you glow |

---

## Onboarding scripts (the QR-at-venue moment)

**The 60-second flow — TARGET FLOW until device-verified (iOS Safari +
Android Chrome):** scan tabletop QR → venue page → "Claim your @tag" → pick a
name → one-tap passkey → TAKE PROOF → receipt + share sheet. One thumb, one
typed word, zero crypto vocabulary. Success metric: a normal person reaches
TAKE PROOF without understanding wallets.

**Pitch lines per audience:**
- Crowd: *"Check in once and you'll never argue about who was actually there."*
- Social: *"You can only DM people you've actually met. Look — these three
  crossed your path tonight."*
- Creators: *"Do the dare, prove it happened, get paid in USDC. No manager,
  no invoice."*
- Venues: *"Every customer check-in becomes an ad with your name sealed on
  it. You only pay when verified humans show up."*

**Tagline bank:** Proof of presence > proof of stake · The map is the feed ·
Only DM people you've actually met · Snap shows where phones are; we show
where humans verifiably are · #HumanOnly.

---

## Growth loops (in priority order)
1. **Receipt shares** — every proof exports a venue-sealed card. (Referral
   param `?by=@tag` = next build; both sides earn Signal Points.)
2. **First-proof land grab** — finite venues, permanent badges. Announce
   weekly: "12 venues on Siargao still have no first proof."
3. **Crossed-paths curiosity** — "someone waved at you" is the strongest
   comeback notification we have.
4. **Streak protection** — 2+ day streaks pull people out for "one quick
   check-in."
5. **Venue tabletop QRs** — physical distribution at the exact moment of
   highest intent (already at the bar, drink in hand).

---

## Honest gaps — do NOT promote these yet
- **Passkey-first connect** — SHIPPED (smart wallet is the hero button,
  crypto wallets under "More wallet options") but NOT yet verified on real
  devices. Gate: pass the QR → connect → Take Proof run on iOS Safari and
  Android Chrome, plus desktop fallback, before promoting the 60-second flow.
- **Meetup creation** — view layer is live; composer is gated behind the
  mobile QA pass. Don't promise "start a meetup" yet.
- **Referral rewards** — receipts don't carry referral credit yet.
- **Crew presence** — designed (docs/crew-presence-design.md), not built.
- **Crossed Paths visibility** — needs real check-in density; at zero
  overlaps the section is invisible (correct, but don't demo it at a dead
  venue).
- **iOS haptics** — reel-bar ticks are Android-only (web Vibration API).
