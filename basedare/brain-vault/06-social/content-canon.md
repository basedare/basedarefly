---
type: content_canon
system: basedare-brain
status: AUTHORITATIVE
created_at: 2026-07-11
updated_at: 2026-07-11
owner: BaseDare founder
---

# BaseDare Social Content Canon

> **This file is the single source of truth for public content.** If any other document
> disagrees with this one, this one wins. The content-operator skill reads THIS pack —
> not the whole repo — precisely so old strategy cannot resurrect itself in a caption.

## ⛔ Superseded for marketing purposes

Do **not** source claims, hooks, or positioning from these (they predate the current model):

- `docs/onboarding-hooks.md` — contains "GPS + QR, can't be faked" hooks (prohibited claim)
- `docs/marketing-brief.md` — "receipts can't be faked" (prohibited claim)
- `docs/feature-guide.md` — "unfakeable" language (prohibited claim)
- `brain-vault/04-experiments/*siargao*` and `brain-vault/05-playbooks/*siargao*`,
  `daily-operator-loop.md`, `venue-spark-audit.md` — founder-operated venue-nights model
  (superseded: events are optional, partner-delivered, never the core strategy)

Still-valid deep canon (for understanding, not for copy-paste claims):
`docs/PHILOSOPHY.md` and `brain-vault/00-control/vision.md`.

## Positioning (current, reconciled)

**Consumer front door:** BaseDare is the playable social layer on the real-world map —
open it to discover places, find something to do, join safe public activities, complete
challenges, meet people by mutual opt-in, and sometimes earn.
Promise: **explore, play, meet, earn.**

**Engine behind it:** a remote, bounty-funded local discovery network. Someone funds a
useful real-world question → a local completes it → BaseDare verifies the evidence →
they get paid in USDC → the answer becomes timestamped place memory → the receipt sells
the next mission.

**One-liner:** *Proof-backed discovery for the physical world.*

- Siargao is the launch wedge, **not** the company. Cities are deployment zones.
- Events are optional, partner-delivered products — never "BaseDare = founder-run nights."
- Verified Field Sprints / missions are the revenue wedge, not the consumer identity.

## Voice

- Gritty, futuristic, playful — never cartoonish, never corporate.
- Plain language first. A tourist with no crypto knowledge must understand every post.
- "Show the receipt" energy: lead with a real artifact, not an abstract promise.
- Confident but honest: we say what is verified and what is still being proven.
- Short sentences. Concrete nouns. No hype-thread voice, no rocket emojis.

## Vocabulary (locked — use these words, not synonyms)

| Term | Meaning | Never say instead |
|---|---|---|
| **Dare / mission** | A funded, safe real-world question with a payout | "gig", "bounty hunt", "task" |
| **Spark** | A free community challenge or verified mark at a place | — |
| **Drop** | A time-limited public social activity | — |
| **Route** | Several Sparks/Dares forming an adventure | — |
| **Pulse** | How alive/recently-verified a place feels | — |
| **BareTag** | Optional public handle carrying reputation + receipts | "username", "creator handle" |
| **Receipt** | The timestamped verified outcome of a mission | — |
| **Players join · Hosts run · Venues fund · BaseDare verifies** | The four roles | never call players "creators" in consumer copy |

## Allowed claims (each with its source of truth)

Any claim not on this list needs a source added here **before** it ships.

| Claim | Source |
|---|---|
| Missions pay real USDC on Base; funds sit in escrow until completion conditions are met | live contract + `/trust` |
| Proof is checked with layered signals — location, freshness, media, reputation; strong signals can clear automatically, uncertain ones go to human review | `/trust` (corrected 2026-07-11), proof rail code |
| Every submission writes an append-only evidence record | `DareProofAttempt` ledger (live) |
| You can explore the map without a wallet or account | `/join` (live) |
| You can claim an open paid dare with just a wallet — no BareTag needed | wallet-first claiming (live) |
| A BareTag is optional; it carries reputation and receipts; some identity-based social features may ask for one | `/join` glossary (corrected wording) |
| The map has real places with community memory, including curated secret hangout spots | live map + seeded venues |
| Receipts are serial-numbered and timestamped | receipts system (live) |
| Buyers can fund a mission and receive a verified, timestamped answer | brand portal (live) |

**Numbers rule:** any specific number (fees, counts, payouts, venue totals) must be read
from the live product **on the day of drafting** and dated in the post ("as of …").
Never reuse a number from an old post or doc.

## Prohibited claims (hard NO — these have already caused corrections)

1. **"Unfakeable" / "can't be faked" / "clears instantly."** Proof is layered *signals*,
   not a truth oracle. GPS is device-reported evidence. Some proofs go to review. (We
   scrubbed this off `/trust` on 2026-07-11 — do not reintroduce it in social copy.)
2. **Earnings promises.** No "make $X", no guaranteed income, no "get paid to travel"
   framing that implies reliable earnings. Say "some missions pay" / show a real payout.
3. **BareTag absolutes.** Neither "you need a BareTag to get paid" (false) nor "you never
   need one" (false — some social features ask for one).
4. **Guaranteed commercial outcomes for buyers.** BaseDare proofs outcomes; it does not
   promise foot traffic, incrementality, or sales lift.
5. **Founder-run events as the product.** No "join our weekly night" as BaseDare's core.
6. **Token/financial speculation.** No $BARE promises, price talk, or "early = rich."
7. **Precise user locations or identities.** Never show someone's exact live location,
   home area, or identifiable pattern without their explicit consent.
8. **"AI verifies everything automatically."** Verification is layered and includes
   human review; say so when relevant.
9. **Danger/edginess-for-views.** Never glamorize risky, humiliating, trespassing, or
   drinking-pressure content. The safe, useful version is the only version that pays.

## Content pillars (every post belongs to exactly one)

1. **Receipts** — a real completed mission: what was asked, what was proven, what was paid.
   The artifact IS the post.
2. **Secret map** — places, secret hangout spots, Pulse, "the map knows something you don't."
3. **Join in** — Sparks, Drops, meetups, social proof of real people doing real things.
4. **Buyer stories** — a business asked a question, got a verified answer + receipt.
5. **Building in public** — founder voice: what shipped, what broke, what was learned.

## Proof assets & rights

**Default rule: only post assets that BaseDare owns or has explicit consent to reuse.**

- Founder-shot media, product screenshots, map screenshots: ✅ allowed.
- Contributor proof media (their videos/photos from missions): ⛔ **not yet** — the
  sponsor/commercial-reuse consent flow (Phase 3) is not live. Until it is, contributor
  media may only be posted with a direct, recorded, per-asset "yes" from the contributor.
- Numbers/screenshots of other people's profiles or chats: only with consent.
- Every asset row in the register below carries: rights status + freshness (`as of` date).
  Local information decays — stale assets get re-verified or retired, not re-posted.

### Asset register (append rows as assets are approved)

| ID | Asset | Where | Rights | Fresh as of | Status |
|---|---|---|---|---|---|
| A-001 | (example) map screenshot — Siargao secret spots w/ legend badges | founder device | BaseDare-owned | 2026-07-11 | fresh |

## Weekly cadence (the whole machine)

`real artifact → Fable drafts (max 3 posts) → factual check against this canon →
founder approval → manual post → log in performance-ledger.md`

No autonomous posting, replies, DMs, or promises. Ever. See `approval-queue.md`.
