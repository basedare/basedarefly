---
type: experiment
status: RUNNER_HARDENED_RELEASE_BLOCKED
owner: growth_product
created_at: 2026-07-19
updated_at: 2026-07-21
---

# Field Station-backed Verified Field Sprint

## Decision this experiment must make

Can one bounded buyer question create useful verified place intelligence, attract qualified local discovery through two permissioned Field Stations, and produce an honest receipt that makes a buyer, station host, or destination ask to repeat or pay?

This is not a QR-volume test, a pub-crawl launch, a venue subscription launch, or a traffic guarantee. It is the smallest integrated test of BaseDare's commercial wedge and consumer discovery loop.

## Fixed scope

- One friendly design partner with one answerable place question.
- One compact Siargao micro-area.
- One campaign code across the entire run.
- Four independent contributor missions using the canonical Verified Field Sprint structure.
- Two permissioned Field Stations: ideally one hostel and one café, coworking space, surf shop, or activity desk.
- One station creative per location during the first week; swap the two creatives in week two to reduce location bias.
- Maximum 14 days.
- No more than 10 operator hours.
- No more than $650 direct delivery cost excluding creator pass-through.

The design partner is the business receiving the verified answer and making a repeat/pay decision. The two Field Station hosts are the physical distribution partners that place the QRs; they may be different businesses. The buyer question belongs in the funded mission brief, while one immutable campaign code joins both station links and their receipts.
- The canonical creator pool remains $500: four $125 gross rewards, with $120 net per accepted contribution after the V2 4% settlement fee.

Sprint #1 may waive the $2,000 managed-service fee only as a recorded design-partner exception. It does not change the canonical $2,500 SKU. Sprint #2 is the first paid-price test.

## Runner implementation boundary

The thin Sprint Runner is now implemented at `/admin/field-sprints`. It compiles exactly four immutable Field Truth contracts from one buyer question, requires two active Field Station links, enforces the canonical `$2,000 managed service + $500 reward pool`, and will not begin collection until four real, non-simulated `$125` escrows are attached.

The runner reads accepted evidence, payouts, settlement transactions, verification time, and review cost from the existing authoritative rails. It cannot create or fund escrow, approve evidence, bypass Sentinel, finalize payout, or infer purchases/foot traffic. Completion requires four accepted and paid outcomes from four distinct contributor wallets. Only then does it write append-only, timestamped place-memory observations with refresh dates and expose the high-entropy public receipt at `/field-sprints/<receiptCode>`.

The buyer receipt keeps Field Station acquisition signals separate from verified outcomes and uses only `YES`, `NO`, `PARTIAL`, or `INCONCLUSIVE`. Production migration and the live human setup gates below remain mandatory.

Closure hardening adds one bounded, append-only rejected/abandoned mission replacement, removes obsolete pilot-range pricing from new Sprint intake paths, exposes rights/limitations/privacy-safe evidence references, and records an explicit buyer repeat/adjust/ask/stop decision. See `verified-field-sprint-closure-pilot.md` for the final operating sequence and the legacy migration/schema drift that must be reconciled before release.

## The single compounding loop

`buyer question → four funded field answers → accepted proof + dated place memory → Field Station answer → destination/action open → Mission Pass or immediate action → secure venue arrival or accepted mission completion → buyer + station-host + destination receipts`

Every accepted field answer must leave a reusable template, verification reason, timestamped place record, contributor reputation event, and refresh expectation. Disposable content alone does not count as a successful Sprint.

## Human setup gates

The operator must review and approve all of these before launch:

- [ ] Design partner and bounded question named.
- [ ] Commercial-use/media consent reviewed if the deliverable includes sponsor-reusable contributor media. Without that consent, sell the verified answers and BaseDare receipt only.
- [ ] Four contributor rewards funded through the approved managed-campaign rail.
- [ ] Two station hosts have granted placement permission and named a keeper.
- [ ] One immutable campaign code is used on both Field Stations.
- [ ] Each active poster's exact promise passes the live admin preflight.
- [ ] Each station has at least one healthy lane with a real verified-outcome path.
- [ ] `MISSION_PASS_HMAC_SECRET` is configured. Email delivery is optional because portable share/copy continuation works without it.
- [ ] Any destination counted as a verified arrival has a live rotating venue handshake.
- [ ] One real phone scan works from printed QR → Board answer → action open → continuation.
- [ ] No test fixtures, sample liquidity, fake going counts, or demo outcomes are visible in the pilot area.

Creation, outreach, funding, production migration, venue promises, and live handshake activation are human-authorized actions. Brain and agents may prepare drafts, preflight, reports, and recommendations; they must not silently perform those actions.

## Automated decision gates

The internal Field Station admin scores each campaign conservatively:

| Gate | Initial threshold | Meaning |
| --- | ---: | --- |
| Unique station journeys | 20 | Minimum sample before conversion failures are judged |
| Healthy targeted inventory | 60% | Exact poster promise was fulfilled without fallback |
| Target-open rate | 25% | A unique station journey opened a recommended destination/action |
| Verified outcomes | 3 | Distinct journeys with a secure venue arrival or accepted mission completion |
| Median Board render | ≤1,500ms | After at least five measured station entries |

ASK-first stations do not invent a historical targeted-inventory rate. Their live lane matrix is judged by preflight, and only healthy lanes should be offered.

`PASS_CANDIDATE` is not automatic expansion. It still requires acceptable complaints and support load, a keeper who can maintain the placement, and at least one buyer, host, or destination explicitly asking to repeat or pay after seeing the conservative receipt.

## Two-week operating sequence

### Before day 1

1. Scope the buyer question into four independent, safe missions.
2. Fund the creator pool and confirm the approved proof requirements.
3. Create both station links under one campaign code in `/admin/field-stations`.
4. Refresh preflight until each printed station is `READY` or a knowingly reviewed `DEGRADED`; never print `BLOCKED`.
5. Print H-correction QRs with a four-module quiet zone and the short URL/serial outside the code.
6. Run one printed end-to-end device test and one secure arrival/completion test.
7. Confirm the pause/reactivate control works before the QR leaves the operator's hands.

### Days 1–7

- Place one creative at each permissioned host.
- Inspect physical integrity and live inventory daily during the learning run.
- Review uncertain field proof through Sentinel; do not weaken verification to improve the chart.
- Record complaints, stale answers, manual interventions, review minutes, and direct cost.

### Days 8–14

- Swap creative A/B between the same hosts.
- Keep campaign code constant; content code identifies the creative.
- Do not add a new location, promise, reward structure, or target audience mid-test.

### Closeout

1. Export campaign, station-host, creative, and destination receipts.
2. Attach the four accepted proof/place-memory receipts and their `as of` dates.
3. Calculate operator hours, direct cost, review rate, disputes, and time-to-action.
4. Ask the design partner, each host, and each verified destination one neutral question: `Would you repeat or pay for this exact result?`
5. Record the answer. Do not infer purchase intent from scans or compliments.

## Stop conditions

Pause the station or Sprint immediately when:

- the printed promise repeatedly falls below its quality-density gate;
- the link, QR, venue coordinates, or recommendation is wrong;
- a station is tampered with or the keeper withdraws permission;
- safety, harassment, privacy, licensing, or work-authorization concerns appear;
- fraud/collusion signals make the verified receipt unreliable;
- exact contributor coordinates or private contact data leak into a public surface;
- direct cost or operator time exceeds the fixed cap without a human re-scope;
- a venue asks BaseDare to report a scan, intent, or open as a physical arrival or purchase.

## Receipt language

- `Scan`, `render`, `choice`, `open`, and `Mission Pass` are digital interest/action.
- `Secure arrival` means the existing rotating venue QR plus server checks accepted the venue check-in.
- `Accepted mission completion` means the existing verification rail accepted proof; it does not automatically prove a purchase.
- Purchases, revenue, incrementality, and causal lift require separate evidence and must not be invented.

## Follow-on decision

- **Repeat:** automated gates are healthy, operations fit the cap, receipts are useful, and explicit repeat/pay pull exists.
- **Adjust:** participants receive value but one measurable lane—inventory, conversion, verification, performance, or physical maintenance—fails.
- **Stop:** no verified outcome, unsafe or misleading operations, excessive manual work, or no repeat/pay pull after the honest receipt.

Grid Passes, drink vouchers, venue subscriptions, public Ambassador tiers, and automated creator bonuses remain parked until this narrower loop proves that BaseDare can create and attribute useful physical action.
