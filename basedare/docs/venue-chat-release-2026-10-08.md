# Venue chat access and remaining launch checks — 8 October 2026

Discovery release 1c83a4e9 is on main and deployed. Read-only production checks returned 200 for About, How It Works, Now and sitemap; the earning anchor and adventure entry are present.

## Fixed

- The existing room=1 link expanded the room internally but left its enclosing disclosure closed. It now opens Venue chat & people and scrolls it into view. Chat comes before optional temporary presence.
- Venue pages link directly to that chat; confirmed check-in receipts say Open venue chat. Nearby visitors have a Check location action even before location is available. Unresolved fallback places explicitly say chat is unavailable rather than offering a non-working entry.
- FAQ, help and venue copy explain confirmed check-in access for 24 hours, nearby access, optional public presence and 24-hour message expiry. API authorization and verification rules are unchanged. Nearby coordinates are a social access signal, not verified attendance or a private-room security guarantee.
- Homepage descriptions no longer promise immediate payout on approval or claim GPS proves a real human. Map metadata describes places, adventures and meetups in plain English.

## Verification

Venue page → Venue chat reaches the correct map place with the disclosure open. At 390 × 844 the chat fits without horizontal overflow. Production room GET without location or wallet authorization is locked and returns no messages. Source tracing confirms confirmed-check-in access uses the authenticated wallet and a 24-hour scannedAt window; posting requires wallet authorization. No real check-in or chat message was submitted.

The local preview intermittently could not reach the database (P1001), so fallback and unavailable states were observed. This is not proof of a production outage. Production read-only checks remain separate from the local UI check.

Production build, TypeScript and Graphify refresh passed. Focused lint passed with zero errors and four existing image warnings. A fresh read-only Base mainnet RPC check (chain 8453) returned empty code for the known escrow address on 8 October.

No schema, contract, location permissions or payment state changed. No full authenticated multi-user chat trial was performed.

## Remaining priorities

1. Payment launch remains blocked by the known mainnet escrow address having no deployed code. Use the existing human-signed cutover runbook, then prove low-value funding → acceptance → submission → review → payout and a separate refund/recovery. Never infer payment from approval or relabel historical funding records.
2. Pilot venue staff must activate their actual rotating QR session and complete a real phone check-in. Hideaway currently reports check-in unavailable; meetup and public sharing remain usable.
3. Mission Pass email recovery is disabled; copy/share continuation links remain the supported path. Friends do not bypass direct-message eligibility. These are product limits, not promises of completed features.

This was a targeted navigation, venue-chat and public-copy review, not certification of every authenticated route or a legal/security audit.
