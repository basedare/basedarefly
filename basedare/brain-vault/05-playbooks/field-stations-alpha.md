# BaseDare Field Stations — Alpha Operating Contract

**Status:** Alpha canon
**Purpose:** Turn permissioned physical placements into contextual entrances to the live map, then measure useful action without confusing scans with foot traffic.

## The product

A Field Station is a PeeBear poster, card, counter stand or cutout hosted by a café, hostel, coworking space, surf shop, rental desk or venue. Its immutable `/go/<slug>` QR carries the physical station, creative, requested attention mode, location and safe fallback. It opens BaseDare in the context that caused the scan; it is not a generic app-download ad.

## Hard boundaries

1. **Acquisition QR is not proof.** A Field Station scan never proves presence, authorizes a claim, redeems a perk or moves money.
2. **Secure venue handshake remains separate.** Only the rotating venue QR plus existing server checks can create a verified venue arrival.
3. **Scans are interest.** Never report a scan, map render, tap or Mission Pass as a physical visit.
4. **Ask before recommending.** `ASK` and `NEARBY` land on the next-two-hours question. Venue recommendations appear only after the player states intent.
5. **Specific promises require density.** `TONIGHT`, `MYSTERY`, `SOCIAL` and `REWARD` open directly only when the configured minimum useful inventory exists near the station.
6. **Fallbacks are honest.** If inventory is thin or unavailable, the same QR opens the neutral answer-first view and records the fallback.
7. **Free roam makes no recommendation.** It simply releases the map.

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

## Pilot decision gate

Run roughly ten permissioned stations for two weeks. Compare creative/location pairs on scan-to-answer, answer-to-target-open, Mission Pass save/open, verified arrival/completion, time-to-action, density fallbacks, complaints and broken placements. Expand only if placements consistently create useful verified action—not because QR scan counts look large.
