# Clean liquid wordmark — 19 October 2026

The shared BaseDare logo now uses the approved liquid wordmark without the small X at every size. Upright letters, braces, honey gold, violet, black contours and cream edging remain intact. The cleaner silhouette comes from selecting the existing core artwork, not generating a different identity.

Navbar, Footer and legacy MobileNav all inherit the same source. Removing the desktop-only picture override lets Next Image select an appropriate resolution on larger displays too. Sizes reflect the 96px narrow-phone / 112px phone / 224px desktop header, and the footer's rendered scale. The phone home link now has a 44px-high target within the existing header row. Accessible names, keyboard focus, reduced-motion treatment and Control-mode grayscale remain.

## Verification

- Production build, including TypeScript, passes. Existing middleware-convention and viem/ox bundling warnings remain unrelated to this change.
- Targeted ESLint for the three changed components and `git diff --check` pass. Graphify rebuilt.
- Built-app browser checks at 320×740, 390×844 and 1440×1000 confirm the clean core loads, with no horizontal overflow. Header target measures 96×44px / 112×44px on phones and 224×56px on desktop.
- Phone navigation opens and closes with Escape. Homepage Control mode loads the same no-X core in grayscale in header and footer; switching back restores color.
- Source review found no new hooks, listeners, duplicate images or data/state behavior. The user journey is page render → responsive image endpoint → loaded shared logo. Local inventory/auth configuration is incomplete and is not evidence for those unrelated production journeys.

## Release and rollback

Merge after CI succeeds, then confirm the matching main deployment is ready and the live header requests the clean core. Revert this release if an image fails to load, braces/drips clip, or header controls become obscured. Original and signature assets remain available. No dependency, environment, database, identity, map, payment or contract changes are needed.

Artwork provenance and original generation prompts remain in `docs/design/basedare-wordmark-liquid-v2.md`. No image generation or asset alteration was performed for this refinement.
