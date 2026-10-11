# Refined liquid wordmark release — 12 October 2026

The user authorized implementing the previously planned original-logo refinement and pushing it to main. The new wordmark restores upright lettering and liquid gold/purple depth, with PeeBear-style black contours and cream edging. The core serves phone headers; a small black/cream X signature serves larger screens. Navbar, Footer and legacy MobileNav share the same responsive component and business-mode treatment.

The light-background business check revealed washed-out labels in the existing distorted glass navigation. Control mode now uses the already established smoked navigation surface with plain readable labels. The seam-free shared header, routes, account/menu behavior and fixed header footprints remain.

## Verification

- Optimized production build and TypeScript pass. Targeted ESLint for all four changed TSX files passes. Graphify rebuilt; git diff --check passes.
- Comparison sheet covers original/core/X, actual 96/112/224px sizes, dark/light surfaces and grayscale. X is omitted at phone sizes because it loses definition there.
- Local browser checks at 320 and 390px confirm the optimized core source, readable lettering and no horizontal overflow. At 1280px the desktop signature loads within the existing 224×56px header frame.
- Nine routes checked at 320px: Now, Map, List view, Start, Create, My activity, Community, About and FAQ. Each loaded the core image, retained zero header bottom border/shadow and stayed within viewport width.
- Business mode uses the same logo in grayscale; footer follows the shared source and treatment. No database, identity, map, financial or environment configuration changes are needed. Existing data-dependent errors in the local environment do not prevent image/header validation.

## Shipping and rollback

Push this commit to main, then verify the exact commit's production deployment, public assets, live header and CI. Revert this commit if artwork fails to load, header controls become obscured or navigation becomes unreadable. Originals remain available and no database rollback is needed. See ../design/basedare-wordmark-liquid-v2.md for exports and exact imagegen prompts.
