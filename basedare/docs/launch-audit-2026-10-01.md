# Launch audit and visual corrections — 1 October 2026

## Decision

Suitable for a supervised community/discovery pilot; not cleared for an unrestricted paid launch. This is a targeted implementation and runtime audit, not a penetration test or legal certification.

## Implemented

- Business/footer contrast: near-opaque dark surface, readable body/link colors and 44px main link targets in either background mode.
- Restore the existing ReactBits Lightning shader (https://reactbits.dev/backgrounds/lightning), with transparent output instead of a black rectangle. Use 2.4-second bursts, first due after 14–22 seconds, then 75–120 seconds after each actual burst. Mobile resolution is capped at 0.75 device ratio, six noise octaves and 30fps. No canvas remains mounted between bursts. Reduced motion, data saving, hidden/unfocused pages, editing, dialogs, scrolling and light background suppress the effect; payment/proof/map routes remain excluded. Remove forced context loss during effect cleanup to preserve React Strict Mode remounts.
- FAQ reflects optional adventure sharing, review, friends, private saved links, limited paid rollout, separate perks/BaseCash/Yodl, and current sign-in. Remove unsupported passkey, instant settlement and unfakeable-proof claims.
- Terms/privacy now distinguish public display consent from commercial reuse, disclose public media before moderation and clarify withdrawal limitations and separate payment rails. Human review and real operating-entity details remain required before commercial launch.
- Add the two new models to the production RLS audit inventory. Their applied migration already enabled RLS and revoked anon/authenticated access. Add a static CI coverage guard so future models cannot silently skip the inventory.

## Live evidence

Authenticated production safety report: mainnet, simulation disabled, storage and wallet/push/Telegram configuration present. Report initially had two blockers: RLS inventory omission and missing bounty bytecode. Read-only verification after correcting the inventory confirms all 77 tables have RLS enabled. No DDL or real payments were run in this pass.

Remaining blocker: configured bounty 0xF176ec205e5E5777F6B5964bfeD6DE5a57a911E3 has no code on Base mainnet. Follow docs/runbooks/mainnet-cutover.md for separately authorized, human-verified cutover. Do not merely switch environment strings or reuse the testnet address.

Further launch gates:
- VENUE_QR_SECRET missing: configure dedicated venue signing material before promising verified Venue Pass arrival; examine existing sessions before rotation.
- 33 old FUNDING records require chain reconciliation. No payout or expired refund was queued at audit time; missing funding hashes are not evidence of lost funds.
- Complete one bounded production funding → request → accept → upload → review → payout flow and rejection/refund recovery after the contract is correct.
- Confirm notification arrival and return links on physical phones. Keys configured is not delivery confirmed. Mission Pass email recovery remains disabled.
- Commercial content rights still require human legal review; operating entity details in terms/privacy remain incomplete.
- New adventure content needs human moderation and source/venue upkeep; no guaranteed event coverage.

## Telegram recommendation

Use Telegram as an operator inbox: actionable failure alerts, intake notifications, queue counts and direct links to the authenticated review pages. Existing handlers cover paid proof, place memory, BaseCash and stats. Keep the database/app as the authoritative record. Do not add arbitrary chat-command payments or silently expand group-member financial authority. A future /ops digest should link to production safety, adventure review, venue claims and buyer intakes rather than duplicate those workflows.

Live checks: webhook GET reachable; unsigned webhook POST, command POST and test GET rejected. Query POST is unavailable (405). Runtime says bot and admin chat configured, but webhook registration and inbox receipt could not be verified with the locally available bot credential. No Telegram messages were sent during this audit.

## Verification and limits

Mobile business footer visual check; actual scheduled shader burst observed in mobile browser; desktop and reduced-motion verification recorded during release. TypeScript, targeted lint and static checks run, plus production build and CI. Local pages use fallback data because no production DB is attached to preview.

The npm audit endpoint returned an error, so this pass cannot claim a fresh dependency-vulnerability scan. Existing lockfile was not changed. A clean build and protected endpoints do not establish that all business flows are launch-ready.

## Rollback

Revert the visual/copy changes if readability or GPU stability regresses. NEXT_PUBLIC_ENABLE_AMBIENT_LIGHTNING=false disables ambient lightning at build time. Preserve the RLS inventory/CI guard. No schema change needs rollback.
