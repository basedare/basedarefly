# Branded motion and active mission correction — 2026-10-03

The user explicitly asked to restore desktop nodes and preserve animated mobile PeeBear. This supersedes the previous release's removal of the orb video.

## Changes

- Brave's low-memory hint now reduces desktop node density and frame rate instead of removing the network. Nearby node pairs are computed once per layout, not searched on every frame. Resize regenerates the grid; hidden tabs stop animation. Dark-mode canvas visibility is restored above the background vignette. Reduced-motion and mobile background exclusions remain.
- Original 512px/24fps liquid-orb video restored with circular clipping, a calm/burst crossfade and a small CSS float. Playback runs only while visible and calm; hidden/offscreen/burst states pause. Reduced-motion, data-saving and slow connections retain the poster. No desktop hero is mounted on mobile. Ambient lightning limits are unchanged.
- The screenshot's seed-venue1 record was read-only checked: PENDING, request dated July 21, 150 reward, no expiry, no funding transaction or escrow ID. It was incorrectly surviving as an active request. Shared creator actions and /earn now require recorded escrow funding for paid work. Claim and approval routes reject unfunded paid records; free activities remain unaffected. No production record was deleted or relabelled.

## Verification

- 31 passing funding-evidence/claim-policy tests.
- Actual shared action-center function exercised with fixtures: unfunded seed excluded; funded request → confirmed/proof → review → payout queued → paid history retain correct mission links.
- Brave desktop at 1440px: node canvas renders, including a simulated 4GB memory hint. Mobile 390px: video time advances, burst appears and pauses video; scrolling away and reduced-motion pause it. Circular crop inspected visually. Local visual preview has no production wallet/database session.
- Typechecks, focused lint, static safety checks and production build passed. Graph regenerated.

This verifies wiring and local behavior, not a real-money end-to-end transaction. Mainnet contract deployment and the real funding/payout/refund trial remain blocked as recorded in payment-mobile-release-2026-10-02.md and the human-signed mainnet cutover runbook. Recorded funding evidence is not a new chain solvency check.

## Release / rollback

No migration, new asset or dependency. Deploy via main and verify homepage, /earn and public payment-readiness. For a motion regression, revert only the visual files while retaining the funding eligibility correction. Never make an unfunded seed payable merely to keep a tray visible.
