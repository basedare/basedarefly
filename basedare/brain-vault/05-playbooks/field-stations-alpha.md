# BaseDare Field Stations — Alpha Operating Contract

**Status:** Alpha canon
**Purpose:** Turn permissioned physical placements into contextual entrances to the live map, then measure useful action without confusing scans with foot traffic.

## The product

A Field Station is a 2cm menu sticker, PeeBear card, counter stand or occasional larger cutout hosted by a café, hostel, coworking space, surf shop, rental desk or venue. Its immutable `/go/<slug>` QR carries the physical station, creative, requested attention mode, location and safe fallback. It opens BaseDare in the context that caused the scan; it is not a generic app-download ad.

## Hard boundaries

1. **Acquisition QR is not proof.** A Field Station scan never proves presence, authorizes a claim, redeems a perk or moves money.
2. **Secure venue handshake remains separate.** Only the rotating venue QR plus existing server checks can create a verified venue arrival.
3. **Scans are interest.** Never report a scan, map render, tap or Mission Pass as a physical visit.
4. **Ask before recommending.** `ASK` and `NEARBY` land on the next-two-hours question. Venue recommendations appear only after the player states intent.
5. **Specific promises require quality density.** `TONIGHT`, `MYSTERY`, `SOCIAL` and `REWARD` open directly only when the configured minimum current, relevant and safe inventory exists near the station. Raw row count is not enough.
6. **Fallbacks are honest.** If inventory is thin or unavailable, the same QR opens the neutral answer-first view and records the fallback.
7. **Free roam makes no recommendation.** It simply releases the map.
8. **The Board answers before the map loads.** Field Station traffic first receives a server-rendered maximum of three ranked answers. MapLibre is progressive enhancement after an explicit tap.
9. **Tonight is not “any live dare.”** It uses the usual Siargao weekly nightlife rhythm plus confirmed public one-offs. The usual rhythm is always labeled as a guide and tells the visitor to confirm with the venue.

## Shared Truth Filter

The `/go/<slug>` resolver and `/board` must use the same `evaluateStationInventory()` contract. It applies an exact radius, current-time window, test-fixture exclusion, venue deduplication and quality ranking. Confirmed activity outranks a lower-confidence guide entry for the same venue. If fewer than the configured minimum qualify, the specific promise disappears rather than being padded with weak options.

The evaluator may use a five-minute warm-instance cache for speed. Correctness must never depend on that cache surviving a serverless cold start. Every result records its evaluation time, radius, qualifying count and fallback state.

## Phygital framing

Internally, Field Station OS is BaseDare's edge-node layer: permissioned physical touchpoints connect people to the live place-memory grid. **Own the Grid** is the operating idea—useful physical actions strengthen a shared map and its receipts.

User-facing expression stays light. A successful scan may say `Node active · [Station] connected` with one small cyan pulse in the established dark/gold/cyan world. The system must then answer the visitor's question immediately. Do not make people understand “phygital,” “edge nodes,” Web3 or protocol architecture before receiving value. Animation stays CSS-only, respects reduced motion and never blocks content.

Never promise `+X Signal Points` unless that exact action is connected to the idempotent points ledger. “Strengthened the Grid” is appropriate only after a real accepted contribution or verified destination action—not after a scan, page view or unverified photo.

## Attribution sequence

`station_scan → entry_rendered → attention_selected → target_opened → intent_locked → mission_pass_issued/opened → verified_arrival or verified_completion`

Every step is append-only and server-linked to the existing Journey rail. A station token never becomes a claim or payout key. Creator attribution remains distinct from station attribution.

## Two receipts, never one blended claim

### Station-host receipt

Answers: **What useful journeys did this physical placement start?** It may include scans, answer renders, choices, destination opens, Mission Passes and later verified outcomes attributable to the path. It does not say those people visited the station host.

### Destination-venue receipt

Answers: **What attributable action reached this destination?** It may include venue/action opens, locked intents, verified rotating-QR arrivals and verified mission completions. Only the last two are physical ground-truth outcomes.

## QR production rule

- Error correction: **H (30%)**.
- Quiet zone: **at least four modules** on every side.
- Black foreground on white background.
- No logo, PeeBear face or artwork may overlap the code.
- Print the Field Station serial and short URL outside the quiet zone.
- Every creative/location pair gets its own immutable short link.
- Use permissioned, weather-resistant placement; inspect weekly.

## Alpha scope

Build and operate only station/attention deep links, density fallback, station funnel reporting, localized answer-first entry, separate receipts and serialized print-safe QRs. Do not build a public station marketplace, loyalty scheme, station-host login or paid placement auction during alpha.

Do not add a generic station photo/GPS `VerifiedArrival` endpoint. The acquisition QR is not a destination proof surface. Existing destination venue check-in—rotating venue QR plus GPS and server policy—remains the verified-arrival boundary. Mission Pass state remains server-authoritative; browser storage is only a continuation convenience.

Performance target: first useful Board answer under 1.5 seconds on representative congested 3G. This is a measured real-device target, not a claim until tested. Record Board response/paint timing during the pilot and keep the heavy map off initial Field Station entry.

## Pilot decision gate

Begin with two to four permissioned stations for two weeks: ideally one hostel, one café and one surf/activity location, with a fourth only when a reliable keeper exists. Use a crossover test: rotate the same two creatives through the same stations in time blocks so location bias does not masquerade as creative performance. Compare scan-to-answer, answer-to-target-open, Mission Pass save/open, verified arrival/completion, time-to-action, inventory fallback rate, complaints and broken placements.

Expansion gate: at least 60% of targeted station entries receive a healthy recommendation set on first load; the funnel produces several attributable verified outcomes; keepers can maintain placements without founder babysitting; and at least one host or destination asks to repeat or pay after seeing its conservative receipt. Expand only because the loop creates useful verified action—not because QR scan counts look large.
