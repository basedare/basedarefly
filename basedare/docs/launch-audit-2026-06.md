# Launch Audit → Implementation Plan (June 12 → June 22, 2026)

> Verdict: CONDITIONAL GO for a hand-held Siargao pilot. Polish the loop, not the universe.
> Hard rule: subtraction-first. No new surfaces unless they unblock the paid proof loop.
> North star: 10 creators onboarded · 1 venue pilot sold · 1 real paid proof loop completed.

## P0 — do immediately (each ships independently)

| # | Task | Owner | Files | Verify | Regression risk |
|---|---|---|---|---|---|
| P0-1 | Replace hardcoded fake celebrity dares on home with real DB dares or honest "first missions drop June 22" state. Also swap `@KaiCenat` placeholder copy in create form. | **Claude** (homepage lane) | `components/HeroEllipticalStream.tsx`, `components/PeeBearConveyor.tsx`, `app/create/page.tsx:78` | Prod home shows zero fake bounties; `rtk grep "KaiCenat\|xQc" components/` clean for display comps | Low — display data only |
| P0-2 | Run the heartbeat: fund tiny Sepolia dare → complete → proof → payout. Record screen + tx hashes. | **Human** | none | Payout tx on Sepolia basescan; `PointsEvent`/dare rows update | n/a |
| P0-3 | Mobile field run of creator flow on a real phone (claim → QR → camera upload → payout watch). Patch exactly what breaks (HEIC/camera/GPS UX are prime suspects). | **Human runs → Codex fixes** (venue/QR lane) | `app/api/upload/route.ts`, check-in flow, `app/dare/[shortId]` | The run completes outdoors on 4G | Medium — fix only what the run breaks |
| P0-4 | Safety waiver + content-policy checkbox at dare claim/proof submission. Skill-based-only language, assumption-of-risk line. | **Claude** drafts copy + **Codex** wires into claim flow | claim/proof components, `lib/dare-moderation` touchpoint | Checkbox required before claim; copy reviewed by human | Low |
| P0-5 | Merge `map-flicker-fix` after user's desktop-Chrome preview verdict. | **Human verdict → Claude merge** | `components/maps/RealWorldMap.tsx` (branch) | User says smooth; prod hard-refresh | Low (additive CSS/ref) |

## P1 — only after P0 (conversion polish)

| # | Task | Owner | Files | Verify |
|---|---|---|---|---|
| P1-1 | Home FAN-stack subtraction: promote clarity block, demote one decorative layer (orbit OR conveyor, not both) | Claude | `app/page.tsx` | 10-second test with a stranger |
| P1-2 | `/create` mobile slim pass (one column, fewer visible steps) | Codex (wired it to data) | `app/create/page.tsx` | Lighthouse mobile + field feel |
| P1-3 | Onboard wizard: auto-detect tag claim via passport `hasTag` (kill self-checkbox) | Claude | `app/creators/onboard/page.tsx` | Claim in tab A → wizard step unlocks |
| P1-4 | Honest empty states (dashboard, leaderboard) | Codex | `app/dashboard`, `app/leaderboard` | Zero-data render says "drops June 22" |
| P1-5 | Normie wallet reassurance copy at every connect prompt | Claude | connect components | Copy review |
| P1-6 | Receipt v1: hand-made share card for mission #1 from `SparkReceiptPreview` | Claude template, human posts | `components/activations/SparkReceiptPreview` | Posted with real tx + footage |

## Hide instead of fix (feature-flag/unlink, do not delete)
`/basecash` · `/handshake` · `/action-center` · `/leaderboard` (until data) · `/captains` (fold identity into founding creators). Owner: Codex (route/link level). Verify: no nav/footer/home path reaches them; direct URL can 200.

## Postpone until after the first paid loop (DO NOT BUILD)
Dare Routes / Mission Packs · vault truth-weighting · $BARE anything · second city · BaseDare Brain meta-operator · proof attestation hardening · venue SaaS billing · RTK auto-hook · radar UI re-weighting.

## 7-day order of operations
Day 1: P0-2 heartbeat (human) + P0-1 fake-dare purge (Claude). Day 2: P0-3 field run + fixes. Day 3: P0-4 waiver + P0-5 map merge. Day 4-5: P1-1/2/3 + hide list. Day 6: P1-4/5/6 + full smoke + re-field-test. Day 7: seed 10-15 real dares, DM wave, sell pilot #1.

## Launch copy vocabulary (concept diet)
Pitch in three nouns: **mission, proof, receipt.** Spark/vault/radar/passport are UI labels only.
